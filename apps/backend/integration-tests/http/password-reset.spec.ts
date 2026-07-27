import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"
import { waitForPasswordResetNotifications } from "./wait-for-password-reset-notification"

// Ticket 04: the reset-password mechanism itself is entirely native (route,
// token table) — what this test protects is the two things Medusa doesn't
// provide out of the box: the email (subscriber + template, wired through
// resend-notification) and that the token it carries actually resolves,
// end-to-end, not just that a notification row exists (spec §"Testing
// Decisions": "le jeton transporté permet effectivement d'aboutir").

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    let publishableKey: string

    beforeEach(async () => {
      const apiKeyModule = getContainer().resolve(Modules.API_KEY)
      const key = await apiKeyModule.createApiKeys({
        title: "test",
        type: "publishable",
        created_by: "test",
      })
      publishableKey = key.token
    })

    // Same three-call registration sequence as
    // customer-billing-address-sync.spec.ts's registerCustomer — only the
    // has_account:true Client this subscriber must find matters here, so the
    // final login-back-in step is skipped.
    async function registerCustomer(fields: { email: string; password: string }) {
      const { data: registerData } = await api.post(
        "/auth/customer/emailpass/register",
        { email: fields.email, password: fields.password }
      )

      await api.post(
        "/store/customers",
        { email: fields.email },
        {
          headers: {
            "x-publishable-api-key": publishableKey,
            Authorization: `Bearer ${registerData.token}`,
          },
        }
      )
    }

    function requestReset(email: string) {
      return api.post("/auth/customer/emailpass/reset-password", {
        identifier: email,
      })
    }

    function extractToken(resetUrl: string): string {
      return new URL(resetUrl).searchParams.get("token")!
    }

    describe("auth.password_reset triggers the password-reset-notification subscriber", () => {
      it("requesting a reset sends a notification whose token actually resets the password", async () => {
        const email = "alix@example.com"
        await registerCustomer({ email, password: "un-mot-de-passe-solide" })

        const response = await requestReset(email)
        expect(response.status).toEqual(201)

        const notifications = await waitForPasswordResetNotifications(getContainer())
        expect(notifications).toHaveLength(1)

        const notification = notifications[0]
        expect(notification.to).toEqual(email)
        expect(notification.channel).toEqual("email")

        const resetUrl = (notification.data as any).reset_url as string
        expect(resetUrl).toContain("/reset-password?token=")
        const token = extractToken(resetUrl)
        expect(token).toBeTruthy()

        // The token transported by the email actually resets the password —
        // this is what proves the email isn't decorative.
        const updateResponse = await api.post(
          "/auth/customer/emailpass/update",
          { password: "un-nouveau-mot-de-passe" },
          { headers: { Authorization: `Bearer ${token}` } }
        )
        expect(updateResponse.status).toEqual(200)

        // The new password logs in...
        const newLogin = await api.post("/auth/customer/emailpass", {
          email,
          password: "un-nouveau-mot-de-passe",
        })
        expect(newLogin.status).toEqual(200)
        expect(newLogin.data.token).toBeTruthy()

        // ...and the old one no longer does.
        await expect(
          api.post("/auth/customer/emailpass", {
            email,
            password: "un-mot-de-passe-solide",
          })
        ).rejects.toMatchObject({ response: { status: 401 } })
      })

      it("rejects a false token with a structured error, not a raw crash", async () => {
        await expect(
          api.post(
            "/auth/customer/emailpass/update",
            { password: "peu-importe" },
            { headers: { Authorization: "Bearer not-a-real-token" } }
          )
        ).rejects.toMatchObject({
          response: { status: 401, data: { message: expect.any(String) } },
        })
      })

      it("rejects a token already consumed by a previous reset", async () => {
        const email = "consumed@example.com"
        await registerCustomer({ email, password: "un-mot-de-passe-solide" })

        await requestReset(email)
        const notifications = await waitForPasswordResetNotifications(getContainer())
        const token = extractToken((notifications[0].data as any).reset_url)

        await api.post(
          "/auth/customer/emailpass/update",
          { password: "premier-changement" },
          { headers: { Authorization: `Bearer ${token}` } }
        )

        // Single-use (native auth module): consumed once, a second attempt
        // with the same token must fail rather than silently succeed.
        await expect(
          api.post(
            "/auth/customer/emailpass/update",
            { password: "second-changement" },
            { headers: { Authorization: `Bearer ${token}` } }
          )
        ).rejects.toMatchObject({ response: { status: 401 } })
      })

      it("requesting a reset for an unknown address creates no notification, and the response is unchanged", async () => {
        const response = await requestReset("inconnu@example.com")
        expect(response.status).toEqual(201)

        // Give a would-be notification a moment to land before asserting its
        // absence — same discipline as the "second cancel doesn't duplicate"
        // test in table-reservation-notifications.spec.ts.
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const notificationService = getContainer().resolve(Modules.NOTIFICATION)
        const notifications = await notificationService.listNotifications({
          template: "password-reset-notification",
        })
        expect(notifications).toHaveLength(0)
      })
    })
  },
})
