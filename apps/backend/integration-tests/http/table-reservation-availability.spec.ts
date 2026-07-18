import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../src/modules/table-reservation"
import { parisMinutesOfDay, parisDayOfWeek, parisDateKey, hhmm } from "./paris-time"

// Seam 1 of the table-reservation spec: the highest seam, exercised over real
// HTTP against a real disposable Postgres. It proves the wiring — Services and
// Configuration in the DB flow through GET .../availability and come out
// filtered and shaped per the contract. The exhaustive derivation cases (DST,
// capacity, the semi-open bound) live in the pure unit seam
// (src/lib/reservation/__tests__/derive-availability.unit.spec.ts), where
// `now` can be injected; here the route reads the real clock, so Services are
// seeded RELATIVE to the current Paris time and the assertions only check
// properties that hold at any instant.

jest.setTimeout(60 * 1000)

const MIN_LEAD = 30
const STEP = 15
const MAX_PARTY_SIZE = 8
const LARGE_PARTY_PHONE = "01 23 45 67 89"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string

    const tableReservation = () => getContainer().resolve(TABLE_RESERVATION_MODULE) as any

    const withKey = () => ({
      headers: { "x-publishable-api-key": publishableKey },
    })

    const createConfig = (overrides: Record<string, unknown> = {}) =>
      tableReservation().createTableReservationConfigs({
        min_lead_minutes: MIN_LEAD,
        horizon_days: 30,
        slot_step_minutes: STEP,
        max_party_size: MAX_PARTY_SIZE,
        last_seating_margin_minutes: 0,
        large_party_phone: LARGE_PARTY_PHONE,
        ...overrides,
      })

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

    describe("GET /store/table-reservations/availability", () => {
      it("renders times inside the Service, chronological, and drops those under the délai minimum", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        // A window that straddles now, mirroring pickup-slots.spec.ts.
        const windowStart = Math.max(0, base - 120)
        const windowEnd = Math.min(1425, base + 180)

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(windowStart),
          end_time: hhmm(windowEnd),
          capacity: 20,
          duration_minutes: 90,
          active: true,
        })

        const date = parisDateKey(now)
        const response = await api.get(
          `/store/table-reservations/availability?date=${date}&party_size=2`,
          withKey()
        )

        expect(response.status).toEqual(200)
        expect(response.data.date).toEqual(date)
        expect(response.data.party_size).toEqual(2)
        expect(response.data.open).toBe(true)
        expect(response.data.max_party_size).toEqual(MAX_PARTY_SIZE)
        expect(response.data.times.length).toBeGreaterThan(0)

        const earliestAllowed = base + MIN_LEAD
        const times: string[] = response.data.times

        for (const time of times) {
          expect(time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
          const [h, m] = time.split(":").map(Number)
          const minutes = h * 60 + m

          // Falls inside the seeded Service window.
          expect(minutes).toBeGreaterThanOrEqual(windowStart)
          expect(minutes).toBeLessThanOrEqual(windowEnd)

          // Under the délai minimum ⇒ absent (a minute of skew tolerated
          // against the route's own clock, as in pickup-slots.spec.ts).
          expect(minutes).toBeGreaterThan(earliestAllowed - 1)
        }

        // The window opened before now, so earlier-today times existed and
        // were dropped: the délai minimum filter really ran.
        expect(windowStart).toBeLessThan(base)

        // Chronological order.
        expect([...times]).toEqual([...times].sort())
      })

      it("returns open: false with no times on a day with no Service", async () => {
        const now = new Date()
        await createConfig()
        // No Service created at all.

        const response = await api.get(
          `/store/table-reservations/availability?date=${parisDateKey(now)}&party_size=2`,
          withKey()
        )

        expect(response.status).toEqual(200)
        expect(response.data.open).toBe(false)
        expect(response.data.times).toEqual([])
      })

      it("returns open: false once the requested date falls past the horizon", async () => {
        const now = new Date()
        const future = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)

        await createConfig({ horizon_days: 5 })
        // A Service IS declared for that weekday, to prove the horizon — not
        // a missing Service — is what closes the day.
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(future),
          start_time: "12:00",
          end_time: "14:00",
          capacity: 20,
          duration_minutes: 90,
          active: true,
        })

        const response = await api.get(
          `/store/table-reservations/availability?date=${parisDateKey(future)}&party_size=2`,
          withKey()
        )

        expect(response.status).toEqual(200)
        expect(response.data.open).toBe(false)
        expect(response.data.times).toEqual([])
      })

      it("never errors above the plafond: 200 with times: [] and the large-party phone", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(Math.max(0, base - 60)),
          end_time: hhmm(Math.min(1425, base + 180)),
          capacity: 20,
          duration_minutes: 90,
          active: true,
        })

        const response = await api.get(
          `/store/table-reservations/availability?date=${parisDateKey(now)}&party_size=${MAX_PARTY_SIZE + 1}`,
          withKey()
        )

        expect(response.status).toEqual(200)
        expect(response.data.open).toBe(true)
        expect(response.data.times).toEqual([])
        expect(response.data.large_party_phone).toEqual(LARGE_PARTY_PHONE)
      })

      it("rejects a malformed date with 400", async () => {
        await createConfig()

        await expect(
          api.get(
            "/store/table-reservations/availability?date=not-a-date&party_size=2",
            withKey()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("rejects a non-positive party_size with 400", async () => {
        const now = new Date()
        await createConfig()

        await expect(
          api.get(
            `/store/table-reservations/availability?date=${parisDateKey(now)}&party_size=0`,
            withKey()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })
    })
  },
})
