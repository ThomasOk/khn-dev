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

      it("accepts an Annonce with neither a body nor a link — the common case", async () => {
        const today = parisDateKey(new Date())
        const { data } = await api.post(
          "/admin/announcements",
          { headline: "Sans corps ni lien", start_date: today, end_date: today },
          await admin()
        )
        expect(data.announcement.body).toBeNull()
        expect(data.announcement.link_label).toBeNull()
        expect(data.announcement.link_url).toBeNull()
      })

      it("refuses a link_url without a link_label", async () => {
        const today = parisDateKey(new Date())
        await expect(
          api.post(
            "/admin/announcements",
            {
              headline: "Test",
              start_date: today,
              end_date: today,
              link_url: "/carte",
            },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a link_label without a link_url", async () => {
        const today = parisDateKey(new Date())
        await expect(
          api.post(
            "/admin/announcements",
            {
              headline: "Test",
              start_date: today,
              end_date: today,
              link_label: "Voir la carte",
            },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a link_url that is neither a relative path nor an http(s) URL", async () => {
        const today = parisDateKey(new Date())
        await expect(
          api.post(
            "/admin/announcements",
            {
              headline: "Test",
              start_date: today,
              end_date: today,
              link_label: "Voir la carte",
              link_url: "carte",
            },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a protocol-relative link_url — it is neither an internal path nor an absolute http(s) URL", async () => {
        const today = parisDateKey(new Date())
        await expect(
          api.post(
            "/admin/announcements",
            {
              headline: "Test",
              start_date: today,
              end_date: today,
              link_label: "Voir la carte",
              link_url: "//evil.example.com",
            },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })
    })

    // Une seule Annonce à la fois: overlap is refused at write time, with a
    // 409 naming the conflicting period, so a publication that would never
    // show never gets committed in the first place.
    describe("POST /admin/announcements — overlap refusal", () => {
      const dateAt = (now: Date, days: number) =>
        parisDateKey(new Date(now.getTime() + days * DAY_MS))

      it("refuses a partial overlap", async () => {
        const now = new Date()
        const session = await admin()
        await api.post(
          "/admin/announcements",
          { headline: "Existante", start_date: dateAt(now, 0), end_date: dateAt(now, 10) },
          session
        )

        const attempt = api.post(
          "/admin/announcements",
          { headline: "Candidate", start_date: dateAt(now, 5), end_date: dateAt(now, 15) },
          session
        )
        await expect(attempt).rejects.toMatchObject({ response: { status: 409 } })

        const error = await attempt.catch((e) => e)
        expect(error.response.data.message).toContain(dateAt(now, 0))
        expect(error.response.data.message).toContain(dateAt(now, 10))
      })

      it("refuses a total inclusion of one period inside another", async () => {
        const now = new Date()
        const session = await admin()
        await api.post(
          "/admin/announcements",
          { headline: "Existante", start_date: dateAt(now, 0), end_date: dateAt(now, 20) },
          session
        )

        await expect(
          api.post(
            "/admin/announcements",
            { headline: "Incluse", start_date: dateAt(now, 5), end_date: dateAt(now, 10) },
            session
          )
        ).rejects.toMatchObject({ response: { status: 409 } })
      })

      it("refuses identical periods", async () => {
        const now = new Date()
        const session = await admin()
        await api.post(
          "/admin/announcements",
          { headline: "Existante", start_date: dateAt(now, 0), end_date: dateAt(now, 10) },
          session
        )

        await expect(
          api.post(
            "/admin/announcements",
            { headline: "Doublon", start_date: dateAt(now, 0), end_date: dateAt(now, 10) },
            session
          )
        ).rejects.toMatchObject({ response: { status: 409 } })
      })

      it("accepts adjacent periods — one ending the 10th, the next starting the 11th", async () => {
        const now = new Date()
        const session = await admin()
        await api.post(
          "/admin/announcements",
          { headline: "Première", start_date: dateAt(now, 0), end_date: dateAt(now, 10) },
          session
        )

        const { data } = await api.post(
          "/admin/announcements",
          { headline: "Suivante", start_date: dateAt(now, 11), end_date: dateAt(now, 20) },
          session
        )
        expect(data.announcement.headline).toEqual("Suivante")
      })
    })

    describe("POST /admin/announcements/:id — edit", () => {
      it("accepts editing the headline without touching its period", async () => {
        const now = new Date()
        const session = await admin()
        const { data: created } = await api.post(
          "/admin/announcements",
          { headline: "Avant", start_date: parisDateKey(now), end_date: parisDateKey(new Date(now.getTime() + 10 * DAY_MS)) },
          session
        )

        const { data } = await api.post(
          `/admin/announcements/${created.announcement.id}`,
          { headline: "Après" },
          session
        )

        expect(data.announcement.headline).toEqual("Après")
        expect(data.announcement.start_date).toEqual(created.announcement.start_date)
        expect(data.announcement.end_date).toEqual(created.announcement.end_date)
      })

      it("refuses moving an Annonce onto another's period with 409", async () => {
        const now = new Date()
        const at = (days: number) =>
          parisDateKey(new Date(now.getTime() + days * DAY_MS))
        const session = await admin()

        await api.post(
          "/admin/announcements",
          { headline: "Fixe", start_date: at(0), end_date: at(10) },
          session
        )
        const { data: moving } = await api.post(
          "/admin/announcements",
          { headline: "Mobile", start_date: at(20), end_date: at(30) },
          session
        )

        await expect(
          api.post(
            `/admin/announcements/${moving.announcement.id}`,
            { start_date: at(5), end_date: at(15) },
            session
          )
        ).rejects.toMatchObject({ response: { status: 409 } })
      })

      it("refuses a partial edit that would push start_date past the existing end_date", async () => {
        const now = new Date()
        const at = (days: number) =>
          parisDateKey(new Date(now.getTime() + days * DAY_MS))
        const session = await admin()

        const { data: created } = await api.post(
          "/admin/announcements",
          { headline: "Existante", start_date: at(0), end_date: at(10) },
          session
        )

        await expect(
          api.post(
            `/admin/announcements/${created.announcement.id}`,
            { start_date: at(15) },
            session
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a partial edit that would leave link_url without link_label", async () => {
        const today = parisDateKey(new Date())
        const session = await admin()

        const { data: created } = await api.post(
          "/admin/announcements",
          {
            headline: "Avec lien",
            start_date: today,
            end_date: today,
            link_label: "Voir la carte",
            link_url: "/carte",
          },
          session
        )

        await expect(
          api.post(
            `/admin/announcements/${created.announcement.id}`,
            { link_label: null },
            session
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("accepts editing just the link_label, keeping the existing link_url", async () => {
        const today = parisDateKey(new Date())
        const session = await admin()

        const { data: created } = await api.post(
          "/admin/announcements",
          {
            headline: "Avec lien",
            start_date: today,
            end_date: today,
            link_label: "Voir la carte",
            link_url: "/carte",
          },
          session
        )

        const { data } = await api.post(
          `/admin/announcements/${created.announcement.id}`,
          { link_label: "Découvrir la carte" },
          session
        )
        expect(data.announcement.link_label).toEqual("Découvrir la carte")
        expect(data.announcement.link_url).toEqual("/carte")
      })
    })

    describe("DELETE /admin/announcements/:id", () => {
      it("stops being served by the store route after deletion", async () => {
        const now = new Date()
        const yesterday = parisDateKey(new Date(now.getTime() - DAY_MS))
        const tomorrow = parisDateKey(new Date(now.getTime() + DAY_MS))
        const session = await admin()

        const { data: created } = await api.post(
          "/admin/announcements",
          { headline: "Éphémère", start_date: yesterday, end_date: tomorrow },
          session
        )

        const before = await api.get("/store/announcement", withKey())
        expect(before.data.announcement).toEqual({
          headline: "Éphémère",
          body: null,
          link_label: null,
          link_url: null,
        })

        await api.delete(`/admin/announcements/${created.announcement.id}`, session)

        const after = await api.get("/store/announcement", withKey())
        expect(after.data.announcement).toBeNull()
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
        expect(response.data.announcement).toEqual({
          headline: "Fermé le 15 août",
          body: null,
          link_label: null,
          link_url: null,
        })
        expect(Object.keys(response.data.announcement).sort()).toEqual(
          ["body", "headline", "link_label", "link_url"].sort()
        )
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
        expect(response.data.announcement).toEqual({
          headline: "Bornes incluses",
          body: null,
          link_label: null,
          link_url: null,
        })
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

      it("serves body, link_label and link_url when present", async () => {
        const today = parisDateKey(new Date())

        await announcement().createAnnouncements({
          headline: "Fermeture exceptionnelle",
          body: "Nous serons fermés du 1er au 20 août.\n\nÀ bientôt !",
          link_label: "Voir la carte",
          link_url: "/carte",
          start_date: today,
          end_date: today,
        })

        const response = await api.get("/store/announcement", withKey())

        expect(response.status).toEqual(200)
        expect(response.data.announcement).toEqual({
          headline: "Fermeture exceptionnelle",
          body: "Nous serons fermés du 1er au 20 août.\n\nÀ bientôt !",
          link_label: "Voir la carte",
          link_url: "/carte",
        })
      })
    })
  },
})
