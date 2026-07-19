import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { TABLE_RESERVATION_MODULE } from "../../src/modules/table-reservation"
import { createAdminSession } from "./create-admin-session"

// Ticket 07 (CONTEXT.md "Feuille de service"): the dining room's production
// document, one day's `confirmed` Réservations by ascending Heure. Seam 1
// only — reservations are created straight through the module service (not
// through the public POST /store/table-reservations flow, which is already
// covered by table-reservation-reserve.spec.ts) so the sort order and the
// `cancelled` exclusion can be set up directly, without racing the real
// clock or a Service's availability window.

jest.setTimeout(60 * 1000)

const ADMIN_EMAIL = "admin@example.com"
const ADMIN_PASSWORD = "supersecret"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const tableReservation = () =>
      getContainer().resolve(TABLE_RESERVATION_MODULE) as any

    const createReservation = (overrides: Record<string, unknown> = {}) =>
      tableReservation().createTableReservations({
        date: "2026-08-12",
        time: "20:00",
        party_size: 2,
        duration_minutes: 90,
        service_window_id: "sw_test",
        status: "confirmed",
        customer_name: "Alix Dupont",
        customer_email: "alix@example.com",
        customer_phone: "0600000000",
        note: null,
        cancellation_token: `token-${Math.random()}`,
        ...overrides,
      })

    describe("GET /admin/table-reservation/reservations", () => {
      it("returns confirmed Réservations for the given day, ascending by Heure, and excludes cancelled ones", async () => {
        const admin = await createAdminSession(
          api,
          getContainer(),
          ADMIN_EMAIL,
          ADMIN_PASSWORD
        )

        // Inserted out of Heure order, on purpose.
        await createReservation({
          time: "20:00",
          customer_name: "Claire Martin",
        })
        await createReservation({
          time: "19:00",
          customer_name: "Alix Dupont",
        })
        await createReservation({
          time: "19:30",
          customer_name: "Bruno Petit",
          party_size: 4,
          note: "Anniversaire",
        })
        await createReservation({
          time: "18:00",
          customer_name: "Cancelled Client",
          status: "cancelled",
        })
        // A confirmed Réservation on a different day must not leak in.
        await createReservation({
          date: "2026-08-13",
          time: "12:00",
          customer_name: "Other Day",
        })

        const response = await api.get(
          "/admin/table-reservation/reservations?date=2026-08-12",
          admin
        )

        expect(response.status).toEqual(200)
        expect(
          response.data.reservations.map((r: any) => ({
            time: r.time,
            customer_name: r.customer_name,
          }))
        ).toEqual([
          { time: "19:00", customer_name: "Alix Dupont" },
          { time: "19:30", customer_name: "Bruno Petit" },
          { time: "20:00", customer_name: "Claire Martin" },
        ])
      })
    })

    describe("POST /admin/table-reservation/reservations/:id", () => {
      it("corrects a Réservation's fields", async () => {
        const admin = await createAdminSession(
          api,
          getContainer(),
          ADMIN_EMAIL,
          ADMIN_PASSWORD
        )

        const reservation = await createReservation({
          party_size: 2,
          customer_phone: "0600000000",
        })

        const response = await api.post(
          `/admin/table-reservation/reservations/${reservation.id}`,
          { party_size: 3, customer_phone: "0611111111" },
          admin
        )

        expect(response.status).toEqual(200)
        expect(response.data.reservation).toMatchObject({
          party_size: 3,
          customer_phone: "0611111111",
        })

        const [persisted] = await tableReservation().listTableReservations({
          id: reservation.id,
        })
        expect(persisted.party_size).toEqual(3)
        expect(persisted.customer_phone).toEqual("0611111111")
      })
    })
  },
})
