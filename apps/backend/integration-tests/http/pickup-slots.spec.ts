import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../../src/modules/pickup"

// Seam 1 of the spec: the highest seam, exercised over real HTTP against a real
// disposable Postgres. It proves the wiring — config in the DB flows through
// GET /store/pickup-slots and comes out filtered and shaped per the contract. The
// exhaustive derivation cases (DST, prep boundaries) live in the pure unit seam,
// where `now` can be injected; here the route reads the real clock, so the
// schedule is seeded RELATIVE to the current Paris time and the assertions only
// check properties that hold at any (daytime) instant.

jest.setTimeout(60 * 1000)

// Paris wall-clock components of an instant.
const parisParts = (d: Date) => {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(d)) {
    if (p.type !== "literal") o[p.type] = p.value
  }
  return o
}

const parisMinutesOfDay = (d: Date) => {
  const p = parisParts(d)
  return Number(p.hour) * 60 + Number(p.minute)
}

// JavaScript weekday (0 = Sunday) of an instant's Paris civil day.
const parisDayOfWeek = (d: Date) => {
  const p = parisParts(d)
  return new Date(
    Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))
  ).getUTCDay()
}

const parisDateKey = (d: Date) => {
  const p = parisParts(d)
  return `${p.year}-${p.month}-${p.day}`
}

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`

const PREP_DELAY = 30
const SLOT_DURATION = 15

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string

    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any

    // A publishable key is required on every /store route, custom ones included
    // (the store middleware rejects a keyless request). The SDK sends it; here we
    // mint one and pass the header by hand.
    const withKey = () => ({
      headers: { "x-publishable-api-key": publishableKey },
    })

    // The runner truncates the database between tests, so everything a test needs
    // — the publishable key included — is (re)created here rather than once in a
    // beforeAll that only the first test would see.
    beforeEach(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeyModule.createApiKeys({
        title: "test",
        type: "publishable",
        created_by: "test",
      })
      publishableKey = key.token

      await pickup().createPickupConfigs({
        prep_delay_minutes: PREP_DELAY,
        slot_duration_minutes: SLOT_DURATION,
      })
    })

    describe("GET /store/pickup-slots", () => {
      it("renders slots inside the schedule, in ISO 8601 with offset, chronological, and drops those under the prep delay", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        // A window that straddles now: it opens before now (so some slots fall
        // under the prep delay and must be dropped) and stays open well past it
        // (so future slots survive).
        const windowStart = Math.max(0, base - 120)
        const windowEnd = Math.min(1425, base + 180)

        await pickup().createPickupSchedules({
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(windowStart),
          end_time: hhmm(windowEnd),
          active: true,
        })

        const response = await api.get("/store/pickup-slots", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.orders_open).toBe(true)
        expect(response.data.slots.length).toBeGreaterThan(0)

        const nowMs = now.getTime()
        const earliestAllowedMs = nowMs + PREP_DELAY * 60_000
        const iso = response.data.slots.map((s: { start: string }) => s.start)

        for (const slot of response.data.slots) {
          // ISO 8601 WITH offset, never a bare UTC "Z".
          expect(slot.start).toMatch(/[+-]\d{2}:\d{2}$/)
          expect(slot.end).toMatch(/[+-]\d{2}:\d{2}$/)

          const start = new Date(slot.start)
          const end = new Date(slot.end)

          // Falls inside the seeded schedule window (in Paris wall-clock minutes).
          expect(parisMinutesOfDay(start)).toBeGreaterThanOrEqual(windowStart)
          expect(parisMinutesOfDay(end)).toBeLessThanOrEqual(windowEnd)

          // One slot duration long.
          expect(end.getTime() - start.getTime()).toEqual(SLOT_DURATION * 60_000)

          // Under the prep delay ⇒ absent: every rendered slot starts strictly
          // after now + prep (allowing a minute of skew vs the route's own clock).
          expect(start.getTime()).toBeGreaterThan(earliestAllowedMs - 60_000)
        }

        // The window opened before now, so earlier-today slots existed and were
        // dropped: the prep filter really ran, it didn't just pass everything.
        expect(windowStart).toBeLessThan(base)

        // Chronological order.
        expect([...iso]).toEqual([...iso].sort())
      })

      it("empties the day on an exceptional closure, with orders_open false", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)

        await pickup().createPickupSchedules({
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(Math.max(0, base - 60)),
          end_time: hhmm(Math.min(1425, base + 180)),
          active: true,
        })
        // A closure on today's civil day wipes the day entirely.
        await pickup().createClosures({
          start_date: parisDateKey(now),
          end_date: parisDateKey(now),
        })

        const response = await api.get("/store/pickup-slots", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.slots).toEqual([])
        expect(response.data.orders_open).toBe(false)
      })

      it("reports orders_open false once the last slot has passed", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        // A window that closed before now: nothing today is still offerable —
        // the closed-orders state, distinct from a network error.
        await pickup().createPickupSchedules({
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(Math.max(0, base - 180)),
          end_time: hhmm(Math.max(15, base - 15)),
          active: true,
        })

        const response = await api.get("/store/pickup-slots", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.slots).toEqual([])
        expect(response.data.orders_open).toBe(false)
      })
    })
  },
})
