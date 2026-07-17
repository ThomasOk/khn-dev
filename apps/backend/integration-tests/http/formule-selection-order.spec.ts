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
import { FORMULE_MODULE } from "../../src/modules/formule"
import { parisDayOfWeek } from "./paris-time"
import { waitForOrderPlacedToSettle } from "./wait-for-order-placed"

// Ticket 03's seam: everything ticket 02 proved on the cart alone now has to
// survive POST /store/carts/:id/complete against a real disposable Postgres.
// completeCartWorkflow.hooks.validate (src/workflows/hooks/complete-cart.ts)
// already gates on a créneau regardless of Formule, so this fixture carries a
// real offerable pickup slot too — otherwise every cart here would be
// rejected on a concern this suite isn't testing.

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer, utils }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any

    // Commerce + pickup fixture, as in complete-cart.spec.ts, plus a Formule
    // Produit with two Composants curated via the formule-composant-variant
    // link, as in formule-add-to-cart.spec.ts — merged because this is the
    // first suite that needs both a completable cart and a Formule.
    async function setUpCommerce() {
      const container = getContainer()
      const link = container.resolve(ContainerRegistrationKeys.LINK)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
      const fulfillmentModule = container.resolve(Modules.FULFILLMENT)
      const formuleModule = container.resolve(FORMULE_MODULE) as any

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

      // The Formule itself: a Produit à Variante unique au prix fixe (ADR
      // 0001) — the line item added to the cart.
      const formuleProductResult = await createProductsWorkflow(
        container
      ).run({
        input: {
          products: [
            {
              title: "Menu Midi",
              status: "published" as any,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Taille", values: ["Unique"] }],
              variants: [
                {
                  title: "Unique",
                  sku: "MENU-MIDI",
                  options: { Taille: "Unique" },
                  prices: [{ amount: 13.9, currency_code: "eur" }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
          ],
        },
      })
      const formuleVariant = formuleProductResult.result[0].variants[0]

      const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
        filters: { sku: "MENU-MIDI" },
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

      // The Carte's dishes curated as choices for each Composant. Never
      // added to a cart directly — only referenced by id in the Sélection.
      const dishesResult = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Samoussas Bœuf",
              status: "published" as any,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Taille", values: ["Unique"] }],
              variants: [
                {
                  title: "Unique",
                  sku: "SAMOUSSAS-BOEUF",
                  options: { Taille: "Unique" },
                  prices: [{ amount: 6, currency_code: "eur" }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
            {
              title: "Samoussas Légumes",
              status: "published" as any,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Taille", values: ["Unique"] }],
              variants: [
                {
                  title: "Unique",
                  sku: "SAMOUSSAS-LEGUMES",
                  options: { Taille: "Unique" },
                  prices: [{ amount: 5, currency_code: "eur" }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
            {
              title: "Riz Cantonais",
              status: "published" as any,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Taille", values: ["Unique"] }],
              variants: [
                {
                  title: "Unique",
                  sku: "RIZ-CANTONAIS",
                  options: { Taille: "Unique" },
                  prices: [{ amount: 9, currency_code: "eur" }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
          ],
        },
      })
      const [samoussasBoeuf, samoussasLegumes, rizCantonais] =
        dishesResult.result.map((p) => p.variants[0])

      const formule = await formuleModule.createFormules({
        product_id: formuleProductResult.result[0].id,
      })
      const [entree, plat] = await formuleModule.createFormuleComposants([
        { formule_id: formule.id, key: "entree", label: "Entrée", rank: 0 },
        { formule_id: formule.id, key: "plat", label: "Plat", rank: 1 },
      ])

      await link.create([
        {
          [FORMULE_MODULE]: { formule_composant_id: entree.id },
          [Modules.PRODUCT]: { product_variant_id: samoussasBoeuf.id },
        },
        {
          [FORMULE_MODULE]: { formule_composant_id: entree.id },
          [Modules.PRODUCT]: { product_variant_id: samoussasLegumes.id },
        },
        {
          [FORMULE_MODULE]: { formule_composant_id: plat.id },
          [Modules.PRODUCT]: { product_variant_id: rizCantonais.id },
        },
      ])

      return {
        publishableKey,
        regionId: region.id,
        salesChannelId: salesChannel.id,
        pickupShippingOptionId: pickupShippingOption.id,
        formuleVariantId: formuleVariant.id,
        entreeKey: entree.key as string,
        platKey: plat.key as string,
        samoussasBoeufVariantId: samoussasBoeuf.id,
        samoussasLegumesVariantId: samoussasLegumes.id,
        rizCantonaisVariantId: rizCantonais.id,
      }
    }

    // Builds a cart carrying one Formule line item per given Sélection, a
    // real offerable pickup slot, a pickup shipping method, a French address
    // and an initialized payment session — ready to complete.
    async function createReadyCart(
      commerce: Awaited<ReturnType<typeof setUpCommerce>>,
      selections: Record<string, string>[]
    ) {
      const headers = {
        headers: { "x-publishable-api-key": commerce.publishableKey },
      }

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
      const chosenSlot = slotsResponse.slots[0]

      const { data: createData } = await api.post(
        "/store/carts",
        {
          region_id: commerce.regionId,
          sales_channel_id: commerce.salesChannelId,
          currency_code: "eur",
          email: "client@example.com",
          shipping_address: {
            country_code: "fr",
            address_1: "1 rue de la Paix",
            city: "Paris",
            postal_code: "75001",
          },
          metadata: {
            creneau_debut: chosenSlot.start,
            creneau_fin: chosenSlot.end,
          },
        },
        headers
      )
      const cartId = createData.cart.id

      for (const selection of selections) {
        await api.post(
          `/store/carts/${cartId}/line-items`,
          {
            variant_id: commerce.formuleVariantId,
            quantity: 1,
            metadata: selection,
          },
          headers
        )
      }

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

    // This suite's Configuration du retrait carries no
    // restaurant_notification_email, so kitchen-ticket-notification only
    // performs reads before returning early — no write, no deadlock risk
    // from it here. order-confirmation still writes a notification row, and
    // auto-capture-payment still writes the payment capture;
    // waitForOrderPlacedToSettle waits on both (see its own comment for why
    // a plain waitWorkflowExecutions() isn't enough).
    async function waitForOrderPlacedSubscribersToSettle(orderId: string) {
      const { capturedAt, notifications } = await waitForOrderPlacedToSettle(
        getContainer(),
        orderId,
        { minNotifications: 1 }
      )
      expect(capturedAt).not.toBeNull()
      expect(notifications.length).toBeGreaterThanOrEqual(1)
      expect(notifications.every((n: any) => n.status !== "pending")).toBe(true)
    }

    describe("POST /store/carts/:id/complete — Formule Sélection", () => {
      it("the most precious test: a valid Sélection survives verbatim onto order.items[].metadata", async () => {
        const commerce = await setUpCommerce()

        const selection = {
          [`formule_${commerce.entreeKey}_variant_id`]:
            commerce.samoussasBoeufVariantId,
          [`formule_${commerce.platKey}_variant_id`]:
            commerce.rizCantonaisVariantId,
        }

        const { cartId, headers } = await createReadyCart(commerce, [
          selection,
        ])

        const { data: completeData } = await api.post(
          `/store/carts/${cartId}/complete?fields=+items.metadata`,
          {},
          headers
        )

        expect(completeData.type).toEqual("order")
        expect(completeData.order.items).toHaveLength(1)
        expect(completeData.order.items[0].metadata).toEqual(selection)

        await waitForOrderPlacedSubscribersToSettle(completeData.order.id)
      })

      it("two identical Formules with different Sélections remain two distinct lines, never merged", async () => {
        const commerce = await setUpCommerce()

        const selectionA = {
          [`formule_${commerce.entreeKey}_variant_id`]:
            commerce.samoussasBoeufVariantId,
          [`formule_${commerce.platKey}_variant_id`]:
            commerce.rizCantonaisVariantId,
        }
        const selectionB = {
          [`formule_${commerce.entreeKey}_variant_id`]:
            commerce.samoussasLegumesVariantId,
          [`formule_${commerce.platKey}_variant_id`]:
            commerce.rizCantonaisVariantId,
        }

        const { cartId, headers } = await createReadyCart(commerce, [
          selectionA,
          selectionB,
        ])

        const { data: cartData } = await api.get(
          `/store/carts/${cartId}?fields=+items.metadata`,
          headers
        )
        expect(cartData.cart.items).toHaveLength(2)

        const { data: completeData } = await api.post(
          `/store/carts/${cartId}/complete?fields=+items.metadata`,
          {},
          headers
        )

        expect(completeData.type).toEqual("order")
        expect(completeData.order.items).toHaveLength(2)
        const orderSelections = completeData.order.items.map(
          (item: any) => item.metadata
        )
        expect(orderSelections).toEqual(
          expect.arrayContaining([selectionA, selectionB])
        )

        await waitForOrderPlacedSubscribersToSettle(completeData.order.id)
      })
    })
  },
})
