import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../src/modules/table-reservation"
import { IP_RATE_LIMIT } from "../../src/workflows/table-reservation/reserve-table"
import { parisMinutesOfDay, parisDayOfWeek, parisDateKey, hhmm } from "./paris-time"

// Ticket 08's "limite de fréquence par email et par IP". The sliding-window
// arithmetic itself is proven without a database in
// src/lib/reservation/__tests__/rate-limiter.unit.spec.ts; this file proves
// the one thing that unit test can't — that the real POST route actually
// wires `req.ip` into the limiter (not just `req.email`, or nothing).
//
// Kept in its OWN file, not alongside the other guard-rails HTTP tests: the
// limiter's state is per-process (rate-limiter.ts), so it is shared across
// every `it` in whichever file imports the workflow — Jest gives each test
// FILE a fresh module registry, but not each `it`. A file with only one
// rate-limit-exhausting test never has to reason about what earlier tests
// already spent from the same budget.
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

    beforeEach(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeyModule.createApiKeys({
        title: "test",
        type: "publishable",
        created_by: "test",
      })
      publishableKey = key.token
    })

    it("refuses reservation attempts from the same IP once its frequency limit is reached", async () => {
      const now = new Date()
      const base = parisMinutesOfDay(now)
      const start = Math.min(1200, base + 90)

      await tableReservation().createTableReservationConfigs({
        min_lead_minutes: 0,
        horizon_days: 30,
        slot_step_minutes: 30,
        max_party_size: MAX_PARTY_SIZE,
        last_seating_margin_minutes: 0,
        large_party_phone: LARGE_PARTY_PHONE,
      })
      // Ample capacity and one shared Service: a distinct email per attempt
      // keeps every attempt clear of the "one Réservation per email and per
      // Service" rule (ticket 08's OTHER guard rail), so only the IP
      // dimension is ever the reason an attempt is refused.
      await tableReservation().createServiceWindows({
        name: "Test service",
        day_of_week: parisDayOfWeek(now),
        start_time: hhmm(start),
        end_time: hhmm(start + 120),
        capacity: IP_RATE_LIMIT.max + 5,
        duration_minutes: 90,
        active: true,
      })

      const date = parisDateKey(now)
      const time = hhmm(start)

      const attempt = (i: number) =>
        api
          .post(
            "/store/table-reservations",
            {
              date,
              time,
              party_size: 1,
              name: "Racer",
              email: `racer-${i}@example.com`,
              phone: "0600000000",
            },
            withKey()
          )
          .catch((e) => e.response)

      // Sequential on purpose: the limiter's window is 10 minutes, so
      // requests spread out over the run of this test still all land
      // inside it — nothing here depends on them being simultaneous, unlike
      // the duplicate-check and daily-cap concurrency tests.
      const responses: Awaited<ReturnType<typeof attempt>>[] = []
      for (let i = 0; i < IP_RATE_LIMIT.max + 1; i++) {
        responses.push(await attempt(i))
      }

      const accepted = responses.filter((r) => r.status === 201)
      const refused = responses.filter((r) => r.status === 409)

      expect(accepted).toHaveLength(IP_RATE_LIMIT.max)
      expect(refused).toHaveLength(1)
      expect(responses[responses.length - 1].status).toEqual(409)
    })
  },
})
