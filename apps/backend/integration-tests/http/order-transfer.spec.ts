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
import { PICKUP_MODULE } from "../../src/modules/pickup"
import { parisDayOfWeek } from "./paris-time"
import { waitForOrderPlacedToSettle } from "./wait-for-order-placed"
import { waitForOrderTransferNotifications } from "./wait-for-order-transfer-notification"

// Ticket 06: order.transfer_requested (native, requestOrderTransferWorkflow)
// carries no token on the event itself — the subscriber has to read it back
// out of the pending OrderChange. What this test protects is exactly the
// spec's own framing (§"Testing Decisions"): not that a notification fires,
// but that the token it carries actually resolves the transfer end-to-end.
// Prior art: complete-cart.spec.ts / customer-billing-address-sync.spec.ts
// (commerce fixture, guest vs. registered checkout) and password-reset.spec.ts
// (same "token that travels in an email must actually work" shape).

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any

    // Same minimal click & collect commerce fixture as complete-cart.spec.ts.
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

    async function setUpPickupSlot() {
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
    }

    // Places a guest Commande (no Authorization header) — the address a
    // later transfer must never notify.
    async function completeGuestCart(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>,
      email: string
    ) {
      const headers = {
        headers: { "x-publishable-api-key": commerce.publishableKey },
      }

      const { data: slotsResponse } = await api.get("/store/pickup-slots", headers)
      const chosenSlot = slotsResponse.slots[0]

      const { data: createData } = await api.post(
        "/store/carts",
        {
          region_id: commerce.regionId,
          sales_channel_id: commerce.salesChannelId,
          currency_code: "eur",
          email,
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

      const { data: completeData } = await api.post(
        `/store/carts/${cartId}/complete`,
        {},
        headers
      )
      const order = completeData.order

      // Only order-confirmation fires here (no restaurant_notification_email
      // configured, so kitchen-ticket-notification returns early without
      // writing a row) — same discipline as complete-cart.spec.ts's "most
      // precious test". Settling before moving on avoids racing the
      // between-test TRUNCATE into a deadlock.
      await waitForOrderPlacedToSettle(getContainer(), order.id, {
        minNotifications: 1,
      })

      return order
    }

    // Register → create the Client record → log back in for an actor-bound
    // token — same three-call sequence as customer-billing-address-sync.spec.ts.
    async function registerCustomer(
      publishableKey: string,
      fields: { email: string; password: string }
    ) {
      const storeHeaders = { headers: { "x-publishable-api-key": publishableKey } }

      const { data: registerData } = await api.post(
        "/auth/customer/emailpass/register",
        { email: fields.email, password: fields.password }
      )

      await api.post(
        "/store/customers",
        { email: fields.email },
        {
          headers: {
            ...storeHeaders.headers,
            Authorization: `Bearer ${registerData.token}`,
          },
        }
      )

      const { data: loginData } = await api.post("/auth/customer/emailpass", {
        email: fields.email,
        password: fields.password,
      })

      const { data: customerData } = await api.get("/store/customers/me", {
        headers: {
          ...storeHeaders.headers,
          Authorization: `Bearer ${loginData.token}`,
        },
      })

      return {
        token: loginData.token as string,
        customerId: customerData.customer.id as string,
      }
    }

    function extractToken(transferUrl: string): string {
      const segments = new URL(transferUrl).pathname.split("/")
      // /order/:id/transfer/:token
      return segments[segments.length - 1]
    }

    describe("order.transfer_requested triggers the order-transfer-notification subscriber", () => {
      it("requesting a transfer sends a notification to the order's own email, whose token actually attaches the order", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()

        const order = await completeGuestCart(commerce, "invite@example.com")

        const { token: requesterToken, customerId } = await registerCustomer(
          commerce.publishableKey,
          { email: "beatrice@example.com", password: "un-mot-de-passe-solide" }
        )

        const requestResponse = await api.post(
          `/store/orders/${order.id}/transfer/request`,
          {},
          {
            headers: {
              "x-publishable-api-key": commerce.publishableKey,
              Authorization: `Bearer ${requesterToken}`,
            },
          }
        )
        expect(requestResponse.status).toEqual(200)

        const notifications = await waitForOrderTransferNotifications(getContainer())
        expect(notifications).toHaveLength(1)

        const notification = notifications[0]
        // Addressed to the Commande's own email — never to the requester's,
        // even though here they happen to differ (spec §"Destinataires").
        expect(notification.to).toEqual("invite@example.com")
        expect(notification.to).not.toEqual("beatrice@example.com")
        expect(notification.channel).toEqual("email")

        const data = notification.data as any
        expect(data.order_id).toEqual(order.display_id)
        const transferUrl = data.transfer_url as string
        expect(transferUrl).toContain(`/order/${order.id}/transfer/`)
        const token = extractToken(transferUrl)
        expect(token).toBeTruthy()

        // The token transported by the email actually attaches the order —
        // this is what proves the email isn't decorative. No Authorization
        // header on purpose: the accept route's own native middlewares
        // require no customer auth, only the publishable key every store
        // route needs — the token alone is what identifies the request
        // (spec §"Le jeton est la seule chose qui identifie la demande").
        const acceptResponse = await api.post(
          `/store/orders/${order.id}/transfer/accept?fields=+customer_id`,
          { token },
          { headers: { "x-publishable-api-key": commerce.publishableKey } }
        )
        expect(acceptResponse.status).toEqual(200)
        expect(acceptResponse.data.order.customer_id).toEqual(customerId)
      })

      it("rejects a false token", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()

        const order = await completeGuestCart(commerce, "invite2@example.com")

        const { token: requesterToken } = await registerCustomer(
          commerce.publishableKey,
          { email: "camille@example.com", password: "un-mot-de-passe-solide" }
        )

        await api.post(
          `/store/orders/${order.id}/transfer/request`,
          {},
          {
            headers: {
              "x-publishable-api-key": commerce.publishableKey,
              Authorization: `Bearer ${requesterToken}`,
            },
          }
        )
        await waitForOrderTransferNotifications(getContainer())

        await expect(
          api.post(
            `/store/orders/${order.id}/transfer/accept`,
            { token: "not-a-real-token" },
            { headers: { "x-publishable-api-key": commerce.publishableKey } }
          )
        ).rejects.toMatchObject({
          // MedusaError.Types.NOT_ALLOWED maps to HTTP 400, not 401 — this
          // is a rejected token, not a missing/invalid auth credential.
          response: { status: 400, data: { message: expect.any(String) } },
        })
      })

      it("the restaurant receives no notification for a transfer", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupSlot()

        const order = await completeGuestCart(commerce, "invite3@example.com")

        const { token: requesterToken } = await registerCustomer(
          commerce.publishableKey,
          { email: "daniel@example.com", password: "un-mot-de-passe-solide" }
        )

        await api.post(
          `/store/orders/${order.id}/transfer/request`,
          {},
          {
            headers: {
              "x-publishable-api-key": commerce.publishableKey,
              Authorization: `Bearer ${requesterToken}`,
            },
          }
        )
        const notifications = await waitForOrderTransferNotifications(getContainer())

        expect(notifications.every((n: any) => n.to !== "cuisine@example.com")).toBe(
          true
        )
        expect(notifications.every((n: any) => n.to === "invite3@example.com")).toBe(
          true
        )
      })
    })
  },
})
