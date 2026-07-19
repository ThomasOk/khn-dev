import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../src/modules/table-reservation"
import { parisMinutesOfDay, parisDayOfWeek, parisDateKey, hhmm } from "./paris-time"

// Seam 1 of ticket 05 (ADR 0008): the only state change a Réservation ever
// has. No deadline check exists to test — the spec deliberately drops one —
// so this file proves the three things that DO gate the outcome: the token
// must match the id (identical 404 either way), a second cancel is a no-op
// success, and the Couverts it frees are immediately visible again through
// GET .../availability (which is what the reserve workflow's own locked job
// already reads to compute acceptance).

jest.setTimeout(60 * 1000)

const MAX_PARTY_SIZE = 8
const LARGE_PARTY_PHONE = "01 23 45 67 89"

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
        ...overrides,
      })

    const reserve = (overrides: Record<string, unknown> = {}) =>
      api.post(
        "/store/table-reservations",
        {
          date: parisDateKey(new Date()),
          time: "20:00",
          party_size: 2,
          name: "Alix Dupont",
          email: "alix@example.com",
          phone: "0600000000",
          ...overrides,
        },
        withKey()
      )

    const cancel = (id: string, token: string) =>
      api.post(`/store/table-reservations/${id}/cancel`, { token }, withKey())

    // The runner truncates the database between tests, so everything a test
    // needs — the publishable key included — is (re)created here rather than
    // once in a beforeAll that only the first test would see.
    beforeEach(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeyModule.createApiKeys({
        title: "test",
        type: "publishable",
        created_by: "test",
      })
      publishableKey = key.token
    })

    describe("POST /store/table-reservations/:id/cancel", () => {
      it("cancels a confirmed Réservation with a valid token, returning 200", async () => {
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

        const created = await reserve({ date, time })
        const { id, cancellation_token } = created.data

        const response = await cancel(id, cancellation_token)

        expect(response.status).toEqual(200)
        expect(response.data).toMatchObject({ id, status: "cancelled" })

        const [persisted] = await tableReservation().listTableReservations({ id })
        expect(persisted.status).toEqual("cancelled")
        expect(persisted.cancelled_at).not.toBeNull()
      })

      it("is idempotent: cancelling an already-cancelled Réservation still returns 200", async () => {
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

        const created = await reserve({ date, time })
        const { id, cancellation_token } = created.data

        const first = await cancel(id, cancellation_token)
        expect(first.status).toEqual(200)

        const [afterFirst] = await tableReservation().listTableReservations({ id })
        const cancelledAt = afterFirst.cancelled_at

        const second = await cancel(id, cancellation_token)
        expect(second.status).toEqual(200)
        expect(second.data).toMatchObject({ id, status: "cancelled" })

        // The second click must not overwrite the first cancellation's
        // cancelled_at.
        const [afterSecond] = await tableReservation().listTableReservations({ id })
        expect(afterSecond.cancelled_at).toEqual(cancelledAt)
      })

      it("returns 404 for a wrong token, identical to an unknown id", async () => {
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

        const created = await reserve({ date, time })
        const { id } = created.data

        const wrongTokenResponse = await cancel(id, "not-the-real-token").catch(
          (e) => e.response
        )
        const unknownIdResponse = await cancel(
          "unknown_id_123",
          "not-the-real-token"
        ).catch((e) => e.response)

        expect(wrongTokenResponse.status).toEqual(404)
        expect(unknownIdResponse.status).toEqual(404)
        expect(wrongTokenResponse.data.type).toEqual(unknownIdResponse.data.type)

        const [persisted] = await tableReservation().listTableReservations({ id })
        expect(persisted.status).toEqual("confirmed")
      })

      // The test that carries the ticket's core promise: capacity a
      // Réservation consumed is genuinely returned, observable through the
      // SAME public endpoint the storefront calls before booking again — not
      // just a status flip nobody can see.
      it("releases capacity: the freed Heure is offered again by a follow-up availability call, and the cancelled Réservation no longer counts toward occupancy", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const CAPACITY = 2
        const start = Math.min(1200, base + 90)

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(start),
          end_time: hhmm(start + 120),
          capacity: CAPACITY,
          duration_minutes: 90,
          active: true,
        })

        const date = parisDateKey(now)
        const time = hhmm(start)

        // Fill the Service's whole capacity with one Réservation.
        const created = await reserve({ date, time, party_size: CAPACITY })
        const { id, cancellation_token } = created.data

        const beforeCancel = await api.get(
          `/store/table-reservations/availability?date=${date}&party_size=1`,
          withKey()
        )
        expect(beforeCancel.data.times).not.toContain(time)

        const cancelResponse = await cancel(id, cancellation_token)
        expect(cancelResponse.status).toEqual(200)

        const afterCancel = await api.get(
          `/store/table-reservations/availability?date=${date}&party_size=1`,
          withKey()
        )
        expect(afterCancel.data.times).toContain(time)

        // A second party can now take the Heure the cancellation freed.
        const rebooked = await reserve({ date, time, party_size: CAPACITY })
        expect(rebooked.status).toEqual(201)
      })
    })
  },
})
