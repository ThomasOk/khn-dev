import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { ANNOUNCEMENT_MODULE } from "../../src/modules/announcement"
import { parisDateKey } from "./paris-time"
import { createAdminSession } from "./create-admin-session"

// Seam 1 (the only seam, per the spec): the admin write path and the store
// read path, over real HTTP against a real disposable Postgres. There is no
// pure derivation to isolate here — "does this period cover today" is a
// database filter, and the instant → Paris civil day step it relies on is
// already covered by restaurant-time.unit.spec.ts. Periods are seeded
// RELATIVE TO TODAY via parisDateKey, exactly like pickup-slots.spec.ts seeds
// its schedule relative to now: the route reads the real clock.

jest.setTimeout(60 * 1000)

const ADMIN_EMAIL = "admin@example.com"
const ADMIN_PASSWORD = "supersecret"

const DAY_MS = 24 * 60 * 60 * 1000

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string

    const announcement = () => getContainer().resolve(ANNOUNCEMENT_MODULE) as any

    // A publishable key is required on every /store route, custom ones
    // included. The SDK sends it; here it is minted and passed by hand.
    const withKey = () => ({
      headers: { "x-publishable-api-key": publishableKey },
    })

    const admin = () =>
      createAdminSession(api, getContainer(), ADMIN_EMAIL, ADMIN_PASSWORD)

    // The runner truncates the database between tests, so a fresh
    // publishable key is (re)created here rather than once in a beforeAll
    // that only the first test would see.
    beforeEach(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeyModule.createApiKeys({
        title: "test",
        type: "publishable",
        created_by: "test",
      })
      publishableKey = key.token
    })

    describe("POST /admin/announcements", () => {
      it("accepts a creation, relisted by the admin list", async () => {
        const now = new Date()
        const today = parisDateKey(now)
        const inTenDays = parisDateKey(new Date(now.getTime() + 10 * DAY_MS))
        const session = await admin()

        const { data: createData } = await api.post(
          "/admin/announcements",
          { headline: "Fermeture exceptionnelle du 1er au 20 août", start_date: today, end_date: inTenDays },
          session
        )
        expect(createData.announcement.headline).toEqual(
          "Fermeture exceptionnelle du 1er au 20 août"
        )
        expect(createData.announcement.start_date).toEqual(today)
        expect(createData.announcement.end_date).toEqual(inTenDays)

        const { data: listData } = await api.get(
          "/admin/announcements",
          session
        )
        expect(listData.announcements).toHaveLength(1)
        expect(listData.announcements[0].id).toEqual(createData.announcement.id)
      })

      it("refuses an empty headline", async () => {
        const today = parisDateKey(new Date())
        await expect(
          api.post(
            "/admin/announcements",
            { headline: "", start_date: today, end_date: today },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a headline past the 90-character cap", async () => {
        const today = parisDateKey(new Date())
        await expect(
          api.post(
            "/admin/announcements",
            { headline: "a".repeat(91), start_date: today, end_date: today },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses an end_date before start_date", async () => {
        const now = new Date()
        const today = parisDateKey(now)
        const yesterday = parisDateKey(new Date(now.getTime() - DAY_MS))
        await expect(
          api.post(
            "/admin/announcements",
            { headline: "Test", start_date: today, end_date: yesterday },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a malformed date", async () => {
        await expect(
          api.post(
            "/admin/announcements",
            { headline: "Test", start_date: "20-08-01", end_date: "2026-08-01" },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })
    })

    describe("GET /store/announcement", () => {
      it("serves the Annonce whose period covers today, with only the contract's fields", async () => {
        const now = new Date()
        const yesterday = parisDateKey(new Date(now.getTime() - DAY_MS))
        const tomorrow = parisDateKey(new Date(now.getTime() + DAY_MS))

        await announcement().createAnnouncements({
          headline: "Fermé le 15 août",
          start_date: yesterday,
          end_date: tomorrow,
        })

        const response = await api.get("/store/announcement", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.announcement).toEqual({ headline: "Fermé le 15 août" })
        expect(Object.keys(response.data.announcement)).toEqual(["headline"])
      })

      it("shows an Annonce whose start_date and end_date both equal today (inclusive bounds)", async () => {
        const today = parisDateKey(new Date())

        await announcement().createAnnouncements({
          headline: "Bornes incluses",
          start_date: today,
          end_date: today,
        })

        const response = await api.get("/store/announcement", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.announcement).toEqual({ headline: "Bornes incluses" })
      })

      it("returns null when the only period is entirely in the past", async () => {
        const now = new Date()
        const longAgo = parisDateKey(new Date(now.getTime() - 20 * DAY_MS))
        const yesterday = parisDateKey(new Date(now.getTime() - DAY_MS))

        await announcement().createAnnouncements({
          headline: "Passée",
          start_date: longAgo,
          end_date: yesterday,
        })

        const response = await api.get("/store/announcement", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.announcement).toBeNull()
      })

      it("returns null when the only period is entirely in the future", async () => {
        const now = new Date()
        const tomorrow = parisDateKey(new Date(now.getTime() + DAY_MS))
        const later = parisDateKey(new Date(now.getTime() + 20 * DAY_MS))

        await announcement().createAnnouncements({
          headline: "Future",
          start_date: tomorrow,
          end_date: later,
        })

        const response = await api.get("/store/announcement", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.announcement).toBeNull()
      })

      it("returns null on an empty database", async () => {
        const response = await api.get("/store/announcement", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.announcement).toBeNull()
      })
    })
  },
})
