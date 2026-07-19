import { randomUUID } from "node:crypto"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../src/modules/table-reservation"
import { DAILY_RESERVATION_CAP } from "../../src/workflows/table-reservation/reserve-table"
import { parisMinutesOfDay, parisDayOfWeek, parisDateKey, hhmm } from "./paris-time"

// Ticket 08's three garde-fous, exercised through the same public route as
// every other table-reservation HTTP test. The frequency limiter's own
// sliding-window arithmetic is proven in
// src/lib/reservation/__tests__/rate-limiter.unit.spec.ts; what belongs here
// is what a unit test cannot show — that a REAL double-click against a REAL
// Postgres only ever leaves one confirmed Réservation behind, sequentially
// and under a race, and that the daily plafond is actually read from the
// rows already persisted rather than some parallel counter.

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
    // needs is (re)created here rather than once in a beforeAll.
    beforeEach(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeyModule.createApiKeys({
        title: "test",
        type: "publishable",
        created_by: "test",
      })
      publishableKey = key.token
    })

    describe("one confirmed Réservation per email and per Service", () => {
      it("refuses a second identical creation with 409; cancelling the first lets a new one through", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const start = Math.min(1200, base + 90)

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(start),
          end_time: hhmm(start + 120),
          capacity: 20,
          duration_minutes: 90,
          active: true,
        })

        const date = parisDateKey(now)
        const time = hhmm(start)
        // Its own email, distinct from every other test in this file: the
        // frequency limiter (ticket 08's OTHER garde-fou) is per-process and
        // shared across every `it` below, so tests that don't mean to
        // exercise it must not share an identity with one that does.
        const email = "double-click@example.com"

        const first = await reserve({ date, time, email })
        expect(first.status).toEqual(201)

        // Same email, same Service, a different Heure inside it — the rule
        // is per Service, not per exact time.
        await expect(
          reserve({ date, time: hhmm(start + 30), email })
        ).rejects.toMatchObject({ response: { status: 409 } })

        const confirmed = await tableReservation().listTableReservations({
          date,
          status: "confirmed",
        })
        expect(confirmed).toHaveLength(1)

        await cancel(first.data.id, first.data.cancellation_token)

        // The cancelled Réservation no longer blocks: the same email can
        // book the same Service again.
        const rebooked = await reserve({ date, time, email })
        expect(rebooked.status).toEqual(201)
      })

      // Case-insensitive on purpose: "Alix@Example.com" is the same customer
      // as "alix@example.com" for the purpose of this guard.
      it("treats the email as case-insensitive", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const start = Math.min(1200, base + 90)

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(start),
          end_time: hhmm(start + 120),
          capacity: 20,
          duration_minutes: 90,
          active: true,
        })

        const date = parisDateKey(now)
        const time = hhmm(start)

        const first = await reserve({
          date,
          time,
          email: "Case-Sensitive@Example.com",
        })
        expect(first.status).toEqual(201)

        await expect(
          reserve({
            date,
            time: hhmm(start + 30),
            email: "case-sensitive@example.com",
          })
        ).rejects.toMatchObject({ response: { status: 409 } })
      })

      // The precaution the ticket calls out explicitly: the check runs
      // INSIDE the date's locked job, so N simultaneous identical requests
      // — the actual double-click, not the sequential approximation above —
      // still leave exactly one confirmed Réservation behind.
      it("accepts only one Réservation when identical requests race in parallel", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const start = Math.min(1200, base + 90)
        const N = 5

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(start),
          end_time: hhmm(start + 120),
          capacity: 50, // capacity is not the constraint under test here
          duration_minutes: 90,
          active: true,
        })

        const date = parisDateKey(now)
        const time = hhmm(start)
        const email = "parallel-racer@example.com"

        const responses = await Promise.all(
          Array.from({ length: N }, () =>
            reserve({ date, time, party_size: 1, email }).catch(
              (e) => e.response
            )
          )
        )

        const accepted = responses.filter((r) => r.status === 201)
        const refused = responses.filter((r) => r.status === 409)

        expect(accepted).toHaveLength(1)
        expect(refused).toHaveLength(N - 1)

        const confirmed = await tableReservation().listTableReservations({
          date,
          status: "confirmed",
        })
        expect(confirmed).toHaveLength(1)
      })
    })

    describe("plafond global de Réservations créées par jour", () => {
      it("refuses a new Réservation once the day's creation cap is reached", async () => {
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

        // Fill the cap to one below its ceiling with rows created directly
        // through the module — their `created_at` is "now" regardless of
        // the arbitrary `date`/`time` they target, which is exactly what the
        // plafond reads: it counts by creation day, not by booking day.
        for (let i = 0; i < DAILY_RESERVATION_CAP - 1; i++) {
          await tableReservation().createTableReservations({
            date: "2099-01-01",
            time: "12:00",
            party_size: 1,
            duration_minutes: 60,
            service_window_id: "seed_service_window",
            status: "confirmed",
            customer_name: "Seed",
            customer_email: `seed-${i}@example.com`,
            customer_phone: "0600000000",
            note: null,
            cancellation_token: randomUUID(),
          })
        }

        // The row that brings the day's count exactly to the cap: still
        // accepted.
        const atCap = await reserve({
          date,
          time,
          email: "last-under-cap@example.com",
        })
        expect(atCap.status).toEqual(201)

        // One more, and the plafond refuses it outright — it never reaches
        // the per-date lock or the capacity search.
        await expect(
          reserve({
            date,
            time: hhmm(start + 30),
            email: "over-cap@example.com",
          })
        ).rejects.toMatchObject({ response: { status: 409 } })
      })

      // The precaution this guard needs but the ticket doesn't spell out
      // explicitly: the count-then-insert must be atomic, or a BURST right
      // at the boundary — exactly what the plafond exists to survive —
      // overshoots it by the size of the burst. Proven the same way ADR
      // 0006's own capacity race is: N requests in parallel, never more than
      // the remaining headroom accepted.
      it("never accepts more than the remaining headroom when requests race at the boundary", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const start = Math.min(1200, base + 90)
        const HEADROOM = 3
        const N = 6

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(start),
          end_time: hhmm(start),
          capacity: N, // capacity is not the constraint under test here
          duration_minutes: 60,
          active: true,
        })

        const date = parisDateKey(now)
        const time = hhmm(start)

        for (let i = 0; i < DAILY_RESERVATION_CAP - HEADROOM; i++) {
          await tableReservation().createTableReservations({
            date: "2099-01-01",
            time: "12:00",
            party_size: 1,
            duration_minutes: 60,
            service_window_id: "seed_service_window",
            status: "confirmed",
            customer_name: "Seed",
            customer_email: `seed-${i}@example.com`,
            customer_phone: "0600000000",
            note: null,
            cancellation_token: randomUUID(),
          })
        }

        const responses = await Promise.all(
          Array.from({ length: N }, (_, i) =>
            reserve({
              date,
              time,
              party_size: 1,
              email: `racer-${i}@example.com`,
            }).catch((e) => e.response)
          )
        )

        const accepted = responses.filter((r) => r.status === 201)
        const refused = responses.filter((r) => r.status === 409)

        expect(accepted).toHaveLength(HEADROOM)
        expect(refused).toHaveLength(N - HEADROOM)
      })
    })
  },
})
