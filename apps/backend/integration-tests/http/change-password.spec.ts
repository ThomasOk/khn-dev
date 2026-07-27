import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules } from "@medusajs/framework/utils"

// Ticket 05: unlike password-reset.spec.ts (ticket 04, a jeton from an
// email), this covers the session-authenticated change from the profile.
// The native `/auth/customer/emailpass/update` route only accepts a
// reset-purpose token (see change-password.ts workflow comment) — this
// custom route and workflow are what make a silent, session-based change
// possible at all, so the old-password check they re-implement is exactly
// what this test protects.

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

    // Same three-call sequence as customer-billing-address-sync.spec.ts's
    // registerCustomer, plus the final login to get a customer-bound
    // session token — that's the token this route requires.
    async function registerAndLogin(fields: { email: string; password: string }) {
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

      const { data: loginData } = await api.post("/auth/customer/emailpass", {
        email: fields.email,
        password: fields.password,
      })

      return loginData.token as string
    }

    function changePassword(
      body: { old_password: string; new_password: string },
      token?: string
    ) {
      return api.post("/store/customers/me/password", body, {
        headers: {
          "x-publishable-api-key": publishableKey,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
    }

    describe("POST /store/customers/me/password", () => {
      it("changes the password when the old one is correct", async () => {
        const email = "alix@example.com"
        const token = await registerAndLogin({
          email,
          password: "un-mot-de-passe-solide",
        })

        const response = await changePassword(
          {
            old_password: "un-mot-de-passe-solide",
            new_password: "un-nouveau-mot-de-passe",
          },
          token
        )
        expect(response.status).toEqual(200)

        const newLogin = await api.post("/auth/customer/emailpass", {
          email,
          password: "un-nouveau-mot-de-passe",
        })
        expect(newLogin.status).toEqual(200)
        expect(newLogin.data.token).toBeTruthy()

        await expect(
          api.post("/auth/customer/emailpass", {
            email,
            password: "un-mot-de-passe-solide",
          })
        ).rejects.toMatchObject({ response: { status: 401 } })
      })

      it("rejects a wrong old password and leaves the password unchanged", async () => {
        const email = "wrong-old@example.com"
        const token = await registerAndLogin({
          email,
          password: "un-mot-de-passe-solide",
        })

        await expect(
          changePassword(
            {
              old_password: "ce-nest-pas-le-bon",
              new_password: "un-nouveau-mot-de-passe",
            },
            token
          )
        ).rejects.toMatchObject({ response: { status: 401 } })

        const stillLogsIn = await api.post("/auth/customer/emailpass", {
          email,
          password: "un-mot-de-passe-solide",
        })
        expect(stillLogsIn.status).toEqual(200)
      })

      it("rejects an unauthenticated request", async () => {
        await expect(
          changePassword({
            old_password: "peu-importe",
            new_password: "un-nouveau-mot-de-passe",
          })
        ).rejects.toMatchObject({ response: { status: 401 } })
      })

      it("sends no notification — a password change is silent, unlike a reset", async () => {
        const email = "no-email@example.com"
        const token = await registerAndLogin({
          email,
          password: "un-mot-de-passe-solide",
        })

        await changePassword(
          {
            old_password: "un-mot-de-passe-solide",
            new_password: "un-nouveau-mot-de-passe",
          },
          token
        )

        // Give a would-be notification a moment to land before asserting its
        // absence — same discipline as password-reset.spec.ts's unknown-address
        // case.
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const notificationService = getContainer().resolve(Modules.NOTIFICATION)
        const notifications = await notificationService.listNotifications({
          to: email,
        })
        expect(notifications).toHaveLength(0)
      })
    })
  },
})
