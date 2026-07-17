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

// Seam 3 of the spec: order.placed, triggered by a real POST
// /store/carts/:id/complete against a real disposable Postgres, must reach
// TWO independent subscribers — order-confirmation and this ticket's
// kitchen-ticket-notification — never one instead of the other. Nothing
// awaits a subscriber the way utils.waitWorkflowExecutions() awaits a
// workflow, so this suite polls for both subscribers' persisted side
// effects instead (see wait-for-order-placed.ts for what that measured and
// why).

jest.setTimeout(60 * 1000)

const CLIENT_EMAIL = "client@example.com"
const RESTAURANT_EMAIL = "cuisine@example.com"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer, utils }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any

    // Same minimal click & collect commerce fixture as complete-cart.spec.ts
    // (ticket 07: "en réutilisant la fixture de commerce de
    // complete-cart.spec.ts") — one region, one pickup-type fulfillment set
    // geo-scoped to fr, one zero-priced pickup shipping option, one priced +
    // stocked variant.
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
          email: CLIENT_EMAIL,
          items: [{ variant_id: commerce.variantId, quantity: 1 }],
          shipping_address: {
            country_code: "fr",
            first_name: "Marie",
            last_name: "Curie",
            phone: "0102030405",
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

    // A currently-offerable slot, and the restaurant's notification address
    // configured (ticket 03) — the one prerequisite this suite adds on top
    // of complete-cart.spec.ts's own setup.
    async function setUpPickupConfigAndSlot() {
      const now = new Date()
      await pickup().createPickupConfigs({
        prep_delay_minutes: 0,
        slot_duration_minutes: 1,
        restaurant_notification_email: RESTAURANT_EMAIL,
      })
      await pickup().createPickupSchedules({
        day_of_week: parisDayOfWeek(now),
        start_time: "00:00",
        end_time: "23:59",
        active: true,
      })
    }

    async function completeCartWithSlot(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>
    ) {
      const { data: slotsResponse } = await api.get("/store/pickup-slots", {
        headers: { "x-publishable-api-key": commerce.publishableKey },
      })
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

      const { data: completeData } = await api.post(
        `/store/carts/${cartId}/complete`,
        {},
        headers
      )
      return completeData.order
    }

    describe("order.placed triggers the kitchen-ticket-notification subscriber", () => {
      it("sends exactly two notifications: the client confirmation and the restaurant kitchen ticket", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupConfigAndSlot()

        const order = await completeCartWithSlot(commerce)

        // Reads persisted notification rows, never their `status` (spec
        // §"Seam 3": a PDF or provider failure still inserts-then-updates
        // the row) — waitForOrderPlacedToSettle only uses `status` to know
        // when polling can stop, not in what this test asserts.
        const { notifications } = await waitForOrderPlacedToSettle(
          getContainer(),
          order.id,
          { minNotifications: 2 }
        )

        expect(notifications).toHaveLength(2)

        const confirmation = notifications.find(
          (n: any) => n.template === "order-confirmation"
        )
        const kitchenTicket = notifications.find(
          (n: any) => n.template === "kitchen-ticket-notification"
        )

        expect(confirmation).toBeDefined()
        expect(confirmation.channel).toEqual("email")
        expect(confirmation.to).toEqual(CLIENT_EMAIL)
        expect(confirmation.idempotency_key).toEqual(
          `order-confirmation:${order.id}`
        )

        expect(kitchenTicket).toBeDefined()
        expect(kitchenTicket.channel).toEqual("email")
        expect(kitchenTicket.to).toEqual(RESTAURANT_EMAIL)
        expect(kitchenTicket.idempotency_key).toEqual(
          `kitchen-ticket:${order.id}`
        )
      })

      it("does not duplicate either notification when order.placed is replayed", async () => {
        const commerce = await setUpCommerce()
        await setUpPickupConfigAndSlot()

        const order = await completeCartWithSlot(commerce)

        await waitForOrderPlacedToSettle(getContainer(), order.id, {
          minNotifications: 2,
        })

        const eventBus = getContainer().resolve(Modules.EVENT_BUS)
        await eventBus.emit({ name: "order.placed", data: { id: order.id } })

        // The replay is itself async; give both subscribers a moment to run
        // (and, if the idempotency key failed to dedupe, to insert a third
        // or fourth row) before asserting the count held.
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await utils.waitWorkflowExecutions()

        const notificationService = getContainer().resolve(Modules.NOTIFICATION)
        const notifications = await notificationService.listNotifications({})

        expect(notifications).toHaveLength(2)
      })
    })
  },
})
