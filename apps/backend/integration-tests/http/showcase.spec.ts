import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { SHOWCASE_MODULE } from "../../src/modules/showcase"
import { PICKUP_MODULE } from "../../src/modules/pickup"
import { createAdminSession } from "./create-admin-session"
import { parisDayOfWeek } from "./paris-time"

// Seam — HTTP integration, the only one this feature needs (spec §"Testing
// Decisions"): a boolean and a string, read and served, with no pure
// derivation to isolate. Direct prior art: announcements.spec.ts (recent
// configuration module, admin + store routes, restricted public contract),
// complete-cart.spec.ts (a cart's full path to an order) and
// table-reservation-guard-rails.spec.ts (expected refusals on admin routes).

jest.setTimeout(60 * 1000)

const ADMIN_EMAIL = "admin@example.com"
const ADMIN_PASSWORD = "supersecret"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const showcase = () => getContainer().resolve(SHOWCASE_MODULE) as any
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any

    const admin = () =>
      createAdminSession(api, getContainer(), ADMIN_EMAIL, ADMIN_PASSWORD)

    // A publishable key is required on every /store route, custom ones
    // included — same setup as announcements.spec.ts. The runner truncates
    // the database between tests, so a fresh key is (re)created here rather
    // than once in a beforeAll that only the first test would see.
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
    const withKey = () => ({
      headers: { "x-publishable-api-key": publishableKey },
    })

    // Minimal click & collect commerce fixture, trimmed to what a cart needs
    // to reach POST /store/carts/:id/complete: one region, one pickup-type
    // fulfillment set, one zero-priced pickup shipping option, one priced +
    // stocked variant. Same shape as complete-cart.spec.ts's setUpCommerce.
    async function setUpCommerce() {
      const container = getContainer()
      const link = container.resolve(ContainerRegistrationKeys.LINK)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

      const [salesChannel] = await salesChannelModule.listSalesChannels({})

      const apiKeyResult = await createApiKeysWorkflow(container).run({
        input: {
          api_keys: [
            { title: "test", type: "publishable", created_by: "test" },
          ],
        },
      })
      const publishableKey = apiKeyResult.result[0].token

      await linkSalesChannelsToApiKeyWorkflow(container).run({
        input: { id: apiKeyResult.result[0].id, add: [salesChannel.id] },
      })

      const regionResult = await createRegionsWorkflow(container).run({
        input: {
          regions: [
            {
              name: "France",
              currency_code: "eur",
              countries: ["fr"],
              payment_providers: ["pp_system_default"],
            },
          ],
        },
      })
      const region = regionResult.result[0]

      const stockLocationResult = await createStockLocationsWorkflow(
        container
      ).run({
        input: {
          locations: [
            {
              name: "Restaurant",
              address: { country_code: "FR", city: "Paris", address_1: "" },
            },
          ],
        },
      })
      const stockLocation = stockLocationResult.result[0]

      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
      })

      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: stockLocation.id, add: [salesChannel.id] },
      })

      const shippingProfileResult = await createShippingProfilesWorkflow(
        container
      ).run({
        input: { data: [{ name: "Default", type: "default" }] },
      })
      const shippingProfile = shippingProfileResult.result[0]

      const pickupFulfillmentSet =
        await fulfillmentModule.createFulfillmentSets({
          name: "Retrait au restaurant",
          type: "pickup",
          service_zones: [
            {
              name: "France",
              geo_zones: [{ country_code: "fr", type: "country" }],
            },
          ],
        })

      await link.create({
        [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        [Modules.FULFILLMENT]: { fulfillment_set_id: pickupFulfillmentSet.id },
      })

      const shippingOptionResult = await createShippingOptionsWorkflow(
        container
      ).run({
        input: [
          {
            name: "Retrait au restaurant",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: pickupFulfillmentSet.service_zones[0].id,
            shipping_profile_id: shippingProfile.id,
            type: {
              label: "Retrait",
              description: "Retrait au restaurant.",
              code: "pickup",
            },
            prices: [{ currency_code: "eur", amount: 0 }],
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      })
      const pickupShippingOption = shippingOptionResult.result[0]

      const productResult = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Plat du jour",
              status: "published" as any,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Taille", values: ["Unique"] }],
              variants: [
                {
                  title: "Unique",
                  sku: "PLAT-DU-JOUR",
                  options: { Taille: "Unique" },
                  prices: [{ amount: 12, currency_code: "eur" }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
          ],
        },
      })
      const variant = productResult.result[0].variants[0]

      const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
        filters: { sku: "PLAT-DU-JOUR" },
      })

      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: inventoryItems.map((item) => ({
            location_id: stockLocation.id,
            stocked_quantity: 1000,
            inventory_item_id: item.id,
          })),
        },
      })

      return {
        publishableKey,
        regionId: region.id,
        salesChannelId: salesChannel.id,
        variantId: variant.id,
        pickupShippingOptionId: pickupShippingOption.id,
      }
    }

    // Builds a cart with an item, a pickup shipping method and an
    // initialized payment session — ready to complete. Deliberately left
    // without a créneau in cart.metadata: the "no pickup slot" refusal
    // (INVALID_DATA, 400) is exactly the message the précédence test needs
    // Mode vitrine's own refusal to outrank.
    async function createReadyCart(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>
    ) {
      const headers = {
        headers: { "x-publishable-api-key": commerce.publishableKey },
      }

      const { data: createData } = await api.post(
        "/store/carts",
        {
          region_id: commerce.regionId,
          sales_channel_id: commerce.salesChannelId,
          currency_code: "eur",
          email: "client@example.com",
          items: [{ variant_id: commerce.variantId, quantity: 1 }],
          shipping_address: {
            country_code: "fr",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
        },
        headers
      )
      const cartId = createData.cart.id

      await api.post(
        `/store/carts/${cartId}/shipping-methods`,
        { option_id: commerce.pickupShippingOptionId },
        headers
      )

      const { data: paymentCollectionData } = await api.post(
        "/store/payment-collections",
        { cart_id: cartId },
        headers
      )
      await api.post(
        `/store/payment-collections/${paymentCollectionData.payment_collection.id}/payment-sessions`,
        { provider_id: "pp_system_default" },
        headers
      )

      return { cartId, headers }
    }

    describe("GET /admin/showcase", () => {
      it("says off, no note on an empty database, without creating a row", async () => {
        const { data } = await api.get("/admin/showcase", await admin())

        expect(data).toEqual({ enabled: false, note: null })
        expect(await showcase().listShowcaseConfigs()).toHaveLength(0)
      })

      it("refuses without an admin session", async () => {
        await expect(api.get("/admin/showcase")).rejects.toMatchObject({
          response: { status: 401 },
        })
      })
    })

    describe("GET /store/showcase", () => {
      it("says off, no note on an empty database, without creating a row", async () => {
        const { data } = await api.get("/store/showcase", withKey())

        expect(data).toEqual({ showcase_mode: false, note: null })
        expect(await showcase().listShowcaseConfigs()).toHaveLength(0)
      })
    })

    describe("POST /admin/showcase", () => {
      it("refuses without an admin session", async () => {
        await expect(
          api.post("/admin/showcase", { enabled: true, note: null })
        ).rejects.toMatchObject({ response: { status: 401 } })
      })

      it("refuses a missing enabled field", async () => {
        await expect(
          api.post("/admin/showcase", { note: "Une note" }, await admin())
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("refuses a note beyond 280 characters", async () => {
        await expect(
          api.post(
            "/admin/showcase",
            { enabled: false, note: "a".repeat(281) },
            await admin()
          )
        ).rejects.toMatchObject({ response: { status: 400 } })
      })

      it("normalizes an empty string, after trim, to null", async () => {
        const { data } = await api.post(
          "/admin/showcase",
          { enabled: false, note: "   " },
          await admin()
        )
        expect(data.note).toBeNull()
      })

      it("trims leading and trailing whitespace from a note", async () => {
        const { data } = await api.post(
          "/admin/showcase",
          { enabled: false, note: "  Commandes suspendues  " },
          await admin()
        )
        expect(data.note).toEqual("Commandes suspendues")
      })

      it("accepts activation without a note", async () => {
        const { data } = await api.post(
          "/admin/showcase",
          { enabled: true, note: null },
          await admin()
        )
        expect(data).toEqual({ enabled: true, note: null })
      })

      it("accepts writing a note without activating", async () => {
        const { data } = await api.post(
          "/admin/showcase",
          { enabled: false, note: "Préparée à l'avance" },
          await admin()
        )
        expect(data).toEqual({ enabled: false, note: "Préparée à l'avance" })
      })

      it("activation is relisted by the admin route, then by the store route", async () => {
        const session = await admin()
        await api.post(
          "/admin/showcase",
          { enabled: true, note: "Une friteuse a lâché." },
          session
        )

        const { data: adminData } = await api.get("/admin/showcase", session)
        expect(adminData).toEqual({
          enabled: true,
          note: "Une friteuse a lâché.",
        })

        const { data: storeData } = await api.get("/store/showcase", withKey())
        expect(storeData).toEqual({
          showcase_mode: true,
          note: "Une friteuse a lâché.",
        })
      })

      it("does not serve the note on the store route while the mode is off, even though it is stored", async () => {
        const session = await admin()
        await api.post(
          "/admin/showcase",
          { enabled: false, note: "Prête pour la prochaine panne." },
          session
        )

        const { data: adminData } = await api.get("/admin/showcase", session)
        expect(adminData.note).toEqual("Prête pour la prochaine panne.")

        const { data: storeData } = await api.get("/store/showcase", withKey())
        expect(storeData).toEqual({ showcase_mode: false, note: null })
      })

      it("turning the mode back off makes the store route stop serving the note", async () => {
        const session = await admin()
        await api.post(
          "/admin/showcase",
          { enabled: true, note: "Service suspendu." },
          session
        )
        expect((await api.get("/store/showcase", withKey())).data).toEqual({
          showcase_mode: true,
          note: "Service suspendu.",
        })

        await api.post(
          "/admin/showcase",
          { enabled: false, note: "Service suspendu." },
          session
        )

        const { data } = await api.get("/store/showcase", withKey())
        expect(data).toEqual({ showcase_mode: false, note: null })
      })
    })

    describe("POST /store/carts/:id/complete — Mode vitrine refusal", () => {
      // The framework's shared error handler hardcodes the response body of
      // EVERY MedusaError.Types.CONFLICT to a generic idempotency-key
      // message, unconditionally (see error-handler.js — the same behavior
      // manage-announcements.ts documents and works around for the admin
      // routes it controls). This native completeCartWorkflow route is not
      // ours to wrap, so the 409 status itself — never produced by the
      // créneau checks below, which are all INVALID_DATA (400) — is the
      // observable proof the Mode vitrine branch fired first.
      it("refuses completion when the mode is active, with a 409 rather than the créneau's 400", async () => {
        const commerce = await setUpCommerce()
        const { cartId, headers } = await createReadyCart(commerce)
        await api.post(
          "/admin/showcase",
          { enabled: true, note: null },
          await admin()
        )

        await expect(
          api.post(`/store/carts/${cartId}/complete`, {}, headers)
        ).rejects.toMatchObject({
          response: { status: 409 },
        })
      })

      it("accepts completion when the mode is off — the vanne must not leak the other way", async () => {
        const commerce = await setUpCommerce()

        // A zero prep delay and a schedule spanning the whole day guarantee
        // an offerable slot right after "now" — same setup as
        // complete-cart.spec.ts's "survives verbatim onto order.metadata"
        // test, so this test exercises the Mode vitrine check in isolation,
        // not the créneau derivation.
        const now = new Date()
        await pickup().createPickupConfigs({
          prep_delay_minutes: 0,
          slot_duration_minutes: 1,
        })
        await pickup().createPickupSchedules({
          day_of_week: parisDayOfWeek(now),
          start_time: "00:00",
          end_time: "23:59",
          active: true,
        })

        const { data: slotsResponse } = await api.get(
          "/store/pickup-slots",
          { headers: { "x-publishable-api-key": commerce.publishableKey } }
        )
        expect(slotsResponse.slots.length).toBeGreaterThan(0)
        const chosenSlot = slotsResponse.slots[0]

        const { cartId, headers } = await createReadyCart(commerce)
        await api.post(
          `/store/carts/${cartId}`,
          {
            metadata: {
              creneau_debut: chosenSlot.start,
              creneau_fin: chosenSlot.end,
            },
          },
          headers
        )

        const { data } = await api.post(
          `/store/carts/${cartId}/complete`,
          {},
          headers
        )
        expect(data.type).toEqual("order")
      })

      it("precedence: mode active and an invalid créneau both fail — the 409 (suspension) wins over the 400 (no pickup slot)", async () => {
        const commerce = await setUpCommerce()
        // No créneau written onto cart.metadata: on its own, this cart
        // would be refused with the "no pickup slot" 400 (see
        // complete-cart.spec.ts). With Mode vitrine also active, the 409
        // must be what comes back, proving the showcase check runs first.
        const { cartId, headers } = await createReadyCart(commerce)
        await api.post(
          "/admin/showcase",
          { enabled: true, note: null },
          await admin()
        )

        await expect(
          api.post(`/store/carts/${cartId}/complete`, {}, headers)
        ).rejects.toMatchObject({
          response: { status: 409 },
        })
      })

      it("does not refuse adding to the cart while the mode is active — deliberate, not a bug", async () => {
        const commerce = await setUpCommerce()
        await api.post(
          "/admin/showcase",
          { enabled: true, note: null },
          await admin()
        )

        const { data } = await api.post(
          "/store/carts",
          {
            region_id: commerce.regionId,
            sales_channel_id: commerce.salesChannelId,
            currency_code: "eur",
            items: [{ variant_id: commerce.variantId, quantity: 1 }],
          },
          { headers: { "x-publishable-api-key": commerce.publishableKey } }
        )

        expect(data.cart.items).toHaveLength(1)
      })
    })
  },
})
