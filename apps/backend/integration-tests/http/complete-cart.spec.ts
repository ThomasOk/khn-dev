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
import {
  parisMinutesOfDay,
  parisDayOfWeek,
  hhmm,
  toParisIso,
} from "./paris-time"
import { waitForOrderPlacedToSettle } from "./wait-for-order-placed"

// Seam 1 of the spec, on the single point that matters most: POST
// /store/carts/:id/complete. `cart.metadata` is written by the client through a
// public route, so the `validate` hook on completeCartWorkflow (src/workflows/
// hooks/complete-cart.ts) is what stands between a customer-controlled field and
// the kitchen. These tests hit that route over real HTTP against a real
// disposable Postgres — they never assert on the hook's internals.

jest.setTimeout(60 * 1000)

const PREP_DELAY = 30
const SLOT_DURATION = 15

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer, utils }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any

    // Minimal click & collect commerce fixture: one region (FR/EUR, system
    // payment provider), one pickup-type fulfillment set geo-scoped to fr (the
    // service zone filter the spec calls out), one zero-priced pickup shipping
    // option, one priced + stocked variant. Everything a cart needs to reach
    // POST /store/carts/:id/complete.
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

      // type MUST be exactly "pickup" (see seed.ts) and the geo zone MUST be
      // "fr" — the service zone filters on the cart's shipping_address.
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

    // Builds a cart with an item, a pickup shipping method, a French address
    // (required for the pickup service zone to match) and an initialized
    // payment session — ready to complete except for whatever metadata the
    // caller writes onto it afterwards.
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

    // The persisted proof that rejection happened before payment authorization:
    // the payment session created in createReadyCart is still "pending", never
    // "authorized" — no payment was captured for the rejected cart.
    async function paymentSessionStatus(
      cartId: string,
      headers: { headers: Record<string, string> }
    ) {
      const { data } = await api.get(
        `/store/carts/${cartId}?fields=+payment_collection.payment_sessions.status`,
        headers
      )
      return data.cart.payment_collection.payment_sessions[0].status
    }

    describe("POST /store/carts/:id/complete", () => {
      it("rejects a cart with no pickup slot, with its own message", async () => {
        const commerce = await setUpCommerce()
        const { cartId, headers } = await createReadyCart(commerce)

        await expect(
          api.post(`/store/carts/${cartId}/complete`, {}, headers)
        ).rejects.toMatchObject({
          response: {
            status: 400,
            data: {
              message: expect.stringContaining("no pickup slot"),
            },
          },
        })

        expect(await paymentSessionStatus(cartId, headers)).toEqual("pending")
      })

      it("rejects a pickup slot that is no longer offerable, with a message distinct from the no-slot case", async () => {
        const commerce = await setUpCommerce()
        const { cartId, headers } = await createReadyCart(commerce)

        // A schedule that nominally covers the créneau's time of day (so this
        // exercises the "passé" branch of the offerable check, not merely a
        // missing configuration), but the chosen instant itself is an hour in
        // the past — strictly before now, so deriveSlots drops it regardless.
        const now = new Date()
        const base = parisMinutesOfDay(now)
        await pickup().createPickupConfigs({
          prep_delay_minutes: PREP_DELAY,
          slot_duration_minutes: SLOT_DURATION,
        })
        await pickup().createPickupSchedules({
          day_of_week: parisDayOfWeek(now),
          start_time: hhmm(Math.max(0, base - 180)),
          end_time: hhmm(Math.min(1425, base + 180)),
          active: true,
        })

        const past = new Date(now.getTime() - 60 * 60 * 1000)
        const pastEnd = new Date(past.getTime() + SLOT_DURATION * 60_000)

        await api.post(
          `/store/carts/${cartId}`,
          {
            metadata: {
              creneau_debut: toParisIso(past),
              creneau_fin: toParisIso(pastEnd),
            },
          },
          headers
        )

        await expect(
          api.post(`/store/carts/${cartId}/complete`, {}, headers)
        ).rejects.toMatchObject({
          response: {
            status: 400,
            data: {
              message: expect.stringContaining("no longer available"),
            },
          },
        })

        expect(await paymentSessionStatus(cartId, headers)).toEqual("pending")
      })

      it("the most precious test: a valid pickup slot survives verbatim onto order.metadata", async () => {
        const commerce = await setUpCommerce()

        // A zero prep delay and a schedule spanning the whole day guarantee an
        // offerable slot right after "now", whatever the wall-clock hour is when
        // this suite runs — including the last minutes before midnight, where a
        // wider window (as in pickup-slots.spec) would legitimately find nothing
        // (same-day only, no rollover to tomorrow). This test only needs ONE
        // currently-offerable slot to exist; it is not exercising the derivation
        // itself (that is Seam 2, with an injected clock).
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

        const { data: slotsResponse } = await api.get("/store/pickup-slots", {
          headers: { "x-publishable-api-key": commerce.publishableKey },
        })
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

        // The route's default retrieve fields omit metadata (unlike its LIST
        // fields) — ask for it explicitly, exactly as the storefront's order
        // confirmation page must.
        const { data: completeData } = await api.post(
          `/store/carts/${cartId}/complete?fields=+metadata`,
          {},
          headers
        )

        expect(completeData.type).toEqual("order")
        expect(completeData.order.metadata.creneau_debut).toEqual(
          chosenSlot.start
        )
        expect(completeData.order.metadata.creneau_fin).toEqual(
          chosenSlot.end
        )

        // This test's Configuration du retrait carries no
        // restaurant_notification_email, so kitchen-ticket-notification only
        // performs reads before returning early — no write, no deadlock
        // risk from it here. order-confirmation still writes a notification
        // row, and auto-capture-payment still writes the payment capture;
        // waitForOrderPlacedToSettle waits on both (see its own comment for
        // why a plain waitWorkflowExecutions() isn't enough).
        const { capturedAt, notifications } = await waitForOrderPlacedToSettle(
          getContainer(),
          completeData.order.id,
          { minNotifications: 1 }
        )
        expect(capturedAt).not.toBeNull()
        expect(notifications.length).toBeGreaterThanOrEqual(1)
        expect(notifications.every((n: any) => n.status !== "pending")).toBe(true)
      })
    })
  },
})
