import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../src/modules/table-reservation"
import { parisMinutesOfDay, parisDayOfWeek, parisDateKey, hhmm } from "./paris-time"

// Seam 1 of ticket 04: real HTTP against a real disposable Postgres, with the
// locking module registered exactly as production runs it (medusa-config.ts).
// The exhaustive acceptance-decision cases (closed, party_size_too_large,
// which Service wins) live in the pure unit seam
// (src/lib/reservation/__tests__/derive-availability.unit.spec.ts); here the
// route reads the real clock, so Services are seeded RELATIVE to the current
// Paris time, same convention as table-reservation-availability.spec.ts.

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

    describe("POST /store/table-reservations", () => {
      it("creates a confirmed Réservation and returns 201 with the contracted shape", async () => {
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

        const response = await reserve({ date, time, party_size: 3 })

        expect(response.status).toEqual(201)
        expect(response.data).toMatchObject({ date, time, party_size: 3 })
        expect(typeof response.data.id).toEqual("string")
        expect(typeof response.data.cancellation_token).toEqual("string")
        expect(response.data.cancellation_token.length).toBeGreaterThan(0)

        const [persisted] = await tableReservation().listTableReservations({
          id: response.data.id,
        })
        expect(persisted.status).toEqual("confirmed")
        expect(persisted.customer_name).toEqual("Alix Dupont")
        expect(persisted.customer_email).toEqual("alix@example.com")
        expect(persisted.customer_phone).toEqual("0600000000")
      })

      // The test that carries ADR 0006: capacity is consumed over the whole
      // occupancy INTERVAL, never at a single booking instant. Filling the
      // capacity at the first Heure must refuse the SECOND Heure even though
      // nobody ever reserved at that second Heure directly — its refusal
      // comes entirely from the first booking's interval still overlapping it.
      it("refuses a later Heure whose capacity was consumed by an earlier, overlapping Réservation", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const STEP = 30
        const CAPACITY = 4
        // 90-minute occupancy so the first booking's interval overlaps the
        // next candidate Heure one step later.
        const DURATION = 90

        const firstStart = Math.min(1200, base + 90)
        const secondStart = firstStart + STEP

        await createConfig({ slot_step_minutes: STEP })
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(firstStart),
          end_time: hhmm(secondStart + 60),
          capacity: CAPACITY,
          duration_minutes: DURATION,
          active: true,
        })

        const date = parisDateKey(now)

        // Fill the capacity entirely at the first Heure ("19h30").
        const fillResponse = await reserve({
          date,
          time: hhmm(firstStart),
          party_size: CAPACITY,
        })
        expect(fillResponse.status).toEqual(201)

        // Nobody has reserved at the second Heure ("20h00") — yet its
        // interval still overlaps the first booking's occupancy, so it must
        // be refused.
        await expect(
          reserve({ date, time: hhmm(secondStart), party_size: 1 })
        ).rejects.toMatchObject({ response: { status: 409 } })
      })

      it("snapshots the Durée d'occupation onto the Réservation; a later Service change never rewrites it", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const start = Math.min(1200, base + 90)

        await createConfig()
        const serviceWindow = await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(start),
          end_time: hhmm(start + 120),
          capacity: 10,
          duration_minutes: 60,
          active: true,
        })

        const date = parisDateKey(now)
        const time = hhmm(start)

        const response = await reserve({ date, time, party_size: 2 })
        expect(response.status).toEqual(201)

        const [beforeChange] = await tableReservation().listTableReservations({
          id: response.data.id,
        })
        expect(beforeChange.duration_minutes).toEqual(60)

        // Re-tune the Service's Durée d'occupation well after the Réservation
        // was taken.
        await tableReservation().updateServiceWindows({
          id: serviceWindow.id,
          duration_minutes: 150,
        })

        const [afterChange] = await tableReservation().listTableReservations({
          id: response.data.id,
        })
        expect(afterChange.duration_minutes).toEqual(60)
      })

      it("refuses above the taille de groupe maximale, with the téléphone in the response", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const start = Math.min(1200, base + 90)

        await createConfig({ max_party_size: MAX_PARTY_SIZE })
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

        const response = await api
          .post(
            "/store/table-reservations",
            {
              date,
              time,
              party_size: MAX_PARTY_SIZE + 1,
              name: "Grand Groupe",
              email: "grand@example.com",
              phone: "0600000001",
            },
            withKey()
          )
          .catch((e) => e.response)

        expect(response.status).toEqual(400)
        expect(response.data.large_party_phone).toEqual(LARGE_PARTY_PHONE)
      })

      it("rejects malformed input with 400", async () => {
        await createConfig()

        await expect(
          reserve({ date: "not-a-date" })
        ).rejects.toMatchObject({ response: { status: 400 } })

        await expect(
          reserve({ party_size: 0 })
        ).rejects.toMatchObject({ response: { status: 400 } })

        await expect(
          reserve({ email: "not-an-email" })
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a stale Heure with 409, never a 500 (server revalidates every value)", async () => {
        const now = new Date()
        await createConfig()
        // No Service declared at all for today — any Heure is stale.

        await expect(
          reserve({ date: parisDateKey(now), time: "20:00" })
        ).rejects.toMatchObject({ response: { status: 409 } })
      })

      // The concurrency test: N parallel requests race for the last
      // Couverts. The accepted total must never exceed capacity, and the
      // losers must get 409 — never a 500, never an overbooking. This
      // exercises the SAME exclusion logic an in-memory locking provider
      // would also enforce inside a single process; what only the real
      // Postgres provider (registered in medusa-config.ts) additionally
      // guarantees is that the exclusion holds ACROSS separate instances,
      // which a single-process Jest run cannot itself demonstrate.
      it("never accepts more than capacity when N requests race for the last Couverts", async () => {
        const now = new Date()
        const base = parisMinutesOfDay(now)
        const CAPACITY = 3
        const N = 6
        // Window collapsed to a single instant, exactly one offerable Heure.
        const start = Math.min(1200, base + 90)

        await createConfig()
        await tableReservation().createServiceWindows({
          name: "Test service",
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(start),
          end_time: hhmm(start),
          capacity: CAPACITY,
          duration_minutes: 60,
          active: true,
        })

        const date = parisDateKey(now)
        const time = hhmm(start)

        const attempts = Array.from({ length: N }, (_, i) =>
          reserve({
            date,
            time,
            party_size: 1,
            email: `racer-${i}@example.com`,
          }).catch((e) => e.response)
        )

        const responses = await Promise.all(attempts)

        const accepted = responses.filter((r) => r.status === 201)
        const refused = responses.filter((r) => r.status === 409)

        expect(accepted.length).toEqual(CAPACITY)
        expect(refused.length).toEqual(N - CAPACITY)
        expect(responses.every((r) => r.status === 201 || r.status === 409)).toBe(
          true
        )

        const persisted = await tableReservation().listTableReservations({
          date,
          status: "confirmed",
        })
        const totalCouverts = persisted.reduce(
          (sum: number, r: any) => sum + r.party_size,
          0
        )
        expect(totalCouverts).toEqual(CAPACITY)
      })
    })
  },
})
