import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../src/modules/table-reservation"
import { parisMinutesOfDay, parisDayOfWeek, parisDateKey, hhmm } from "./paris-time"
import { waitForReservationNotifications } from "./wait-for-reservation-notifications"

// Ticket 06: creating a Réservation must reach TWO independent subscribers
// (client confirmation, restaurant notification) and cancelling it must
// reach exactly ONE (restaurant only) — never the reverse, and a repeated
// cancel must never pile up a second restaurant alert. Same testing
// discipline as kitchen-ticket-notification.spec.ts: poll persisted
// notification rows past "pending" rather than trust
// utils.waitWorkflowExecutions(), which doesn't await subscribers.

jest.setTimeout(60 * 1000)

const MAX_PARTY_SIZE = 8
const LARGE_PARTY_PHONE = "01 23 45 67 89"
const RESTAURANT_EMAIL = "reservations@example.com"
const CUSTOMER_EMAIL = "alix@example.com"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string

    const tableReservation = () =>
      getContainer().resolve(TABLE_RESERVATION_MODULE) as any

    const withKey = () => ({
      headers: { "x-publishable-api-key": publishableKey },
    })

    const createConfig = (overrides: Record<string, unknown> = {}) =>
      tableReservation().createTableReservationConfigs({
        min_lead_minutes: 0,
        horizon_days: 30,
        slot_step_minutes: 30,
        max_party_size: MAX_PARTY_SIZE,
        last_seating_margin_minutes: 0,
        large_party_phone: LARGE_PARTY_PHONE,
        restaurant_notification_email: RESTAURANT_EMAIL,
        ...overrides,
      })

    const reserve = (overrides: Record<string, unknown> = {}) =>
      api.post(
        "/store/table-reservations",
        {
          date: parisDateKey(new Date()),
          time: "20:00",
          party_size: 4,
          name: "Alix Dupont",
          email: CUSTOMER_EMAIL,
          phone: "0600000000",
          ...overrides,
        },
        withKey()
      )

    const cancel = (id: string, token: string) =>
      api.post(`/store/table-reservations/${id}/cancel`, { token }, withKey())

    beforeEach(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeyModule.createApiKeys({
        title: "test",
        type: "publishable",
        created_by: "test",
      })
      publishableKey = key.token
    })

    async function reserveAtAvailableSlot() {
      const now = new Date()
      const base = parisMinutesOfDay(now)
      const start = Math.min(1200, base + 90)

      await createConfig()
      await tableReservation().createServiceWindows({
        name: "Test service",
        day_of_week: parisDayOfWeek(now),
        start_time: hhmm(start),
        end_time: hhmm(start + 120),
        capacity: 10,
        duration_minutes: 90,
        active: true,
      })

      const date = parisDateKey(now)
      const time = hhmm(start)

      const response = await reserve({ date, time, party_size: 4 })
      expect(response.status).toEqual(201)
      return response.data
    }

    describe("table_reservation.reserved / .cancelled trigger the notification subscribers", () => {
      it("sends exactly two notifications on creation: the client confirmation and the restaurant notification", async () => {
        const created = await reserveAtAvailableSlot()

        const notifications = await waitForReservationNotifications(getContainer(), {
          minNotifications: 2,
        })

        expect(notifications).toHaveLength(2)

        const confirmation = notifications.find(
          (n: any) => n.template === "table-reservation-confirmation"
        )
        const restaurantNotification = notifications.find(
          (n: any) => n.template === "table-reservation-notification"
        )

        expect(confirmation).toBeDefined()
        expect(confirmation.channel).toEqual("email")
        expect(confirmation.to).toEqual(CUSTOMER_EMAIL)
        expect(confirmation.idempotency_key).toEqual(
          `table-reservation-confirmation:${created.id}`
        )

        expect(restaurantNotification).toBeDefined()
        expect(restaurantNotification.channel).toEqual("email")
        expect(restaurantNotification.to).toEqual(RESTAURANT_EMAIL)
        expect(restaurantNotification.idempotency_key).toEqual(
          `table-reservation-notification:${created.id}`
        )
      })

      it("sends exactly one notification on cancellation: the restaurant only", async () => {
        const created = await reserveAtAvailableSlot()
        await waitForReservationNotifications(getContainer(), { minNotifications: 2 })

        const cancelResponse = await cancel(created.id, created.cancellation_token)
        expect(cancelResponse.status).toEqual(200)

        const notifications = await waitForReservationNotifications(getContainer(), {
          minNotifications: 3,
        })

        expect(notifications).toHaveLength(3)

        const cancellationNotification = notifications.find(
          (n: any) => n.template === "table-reservation-cancellation-notification"
        )

        expect(cancellationNotification).toBeDefined()
        expect(cancellationNotification.channel).toEqual("email")
        expect(cancellationNotification.to).toEqual(RESTAURANT_EMAIL)
        expect(cancellationNotification.idempotency_key).toEqual(
          `table-reservation-cancellation:${created.id}`
        )

        // No client-facing cancellation email exists (ticket 06 asks for a
        // restaurant notification only) — confirm the confirmation
        // subscriber didn't fire a second time either.
        const confirmations = notifications.filter(
          (n: any) => n.template === "table-reservation-confirmation"
        )
        expect(confirmations).toHaveLength(1)
      })

      it("does not send a second cancellation notification when the same Réservation is cancelled twice", async () => {
        const created = await reserveAtAvailableSlot()
        await waitForReservationNotifications(getContainer(), { minNotifications: 2 })

        const first = await cancel(created.id, created.cancellation_token)
        expect(first.status).toEqual(200)
        await waitForReservationNotifications(getContainer(), { minNotifications: 3 })

        const second = await cancel(created.id, created.cancellation_token)
        expect(second.status).toEqual(200)

        // The click is idempotent at the HTTP layer already (ticket 05); give
        // a would-be second event a moment to land before asserting it didn't.
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const notificationService = getContainer().resolve(Modules.NOTIFICATION)
        const notifications = await notificationService.listNotifications({})

        expect(notifications).toHaveLength(3)
      })
    })
  },
})
