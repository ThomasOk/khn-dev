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

// Ticket 04's seam 2: the server-side control (src/lib/formule/
// validate-selection.ts) revalidated against a real Curation, hit through
// the two hooks that matter — addToCartWorkflow.hooks.validate (immediate
// rejection, src/workflows/hooks/cart-line-items.ts) and
// completeCartWorkflow.hooks.validate (the check that counts, extended in
// src/workflows/hooks/complete-cart.ts). Fixture is the same shape as
// formule-selection-order.spec.ts, merged with the pickup-slot fixture from
// complete-cart.spec.ts because the completion tests need both.

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer, utils }) => {
    const pickup = () => getContainer().resolve(PICKUP_MODULE) as any

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

      const { data: formuleInventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
        filters: { sku: "MENU-MIDI" },
      })
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: formuleInventoryItems.map((item) => ({
            location_id: stockLocation.id,
            stocked_quantity: 1000,
            inventory_item_id: item.id,
          })),
        },
      })

      // An ordinary, non-Formule dish on the Carte — used to prove a
      // Sélection is rejected on a line that isn't a Formule at all.
      const platDuJourResult = await createProductsWorkflow(container).run({
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
      const platDuJourVariant = platDuJourResult.result[0].variants[0]

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
      const [samoussasBoeuf, rizCantonais] = dishesResult.result.map(
        (p) => p.variants[0]
      )

      const formule = await formuleModule.createFormules({
        product_id: formuleProductResult.result[0].id,
      })
      const [entree, plat] = await formuleModule.createFormuleComposants([
        { formule_id: formule.id, key: "entree", label: "Entrée", rank: 0 },
        { formule_id: formule.id, key: "plat", label: "Plat", rank: 1 },
      ])

      const entreeSamoussasLink = {
        [FORMULE_MODULE]: { formule_composant_id: entree.id },
        [Modules.PRODUCT]: { product_variant_id: samoussasBoeuf.id },
      }
      const platRizLink = {
        [FORMULE_MODULE]: { formule_composant_id: plat.id },
        [Modules.PRODUCT]: { product_variant_id: rizCantonais.id },
      }

      await link.create([entreeSamoussasLink, platRizLink])

      return {
        publishableKey,
        regionId: region.id,
        salesChannelId: salesChannel.id,
        pickupShippingOptionId: pickupShippingOption.id,
        formuleVariantId: formuleVariant.id,
        platDuJourVariantId: platDuJourVariant.id,
        entreeKey: entree.key as string,
        platKey: plat.key as string,
        samoussasBoeufVariantId: samoussasBoeuf.id,
        rizCantonaisVariantId: rizCantonais.id,
        entreeSamoussasLink,
      }
    }

    type Commerce = Awaited<ReturnType<typeof setUpCommerce>>

    function headersFor(commerce: Commerce) {
      return { headers: { "x-publishable-api-key": commerce.publishableKey } }
    }

    async function createCart(commerce: Commerce) {
      const { data } = await api.post(
        "/store/carts",
        {
          region_id: commerce.regionId,
          sales_channel_id: commerce.salesChannelId,
          currency_code: "eur",
          email: "client@example.com",
        },
        headersFor(commerce)
      )
      return data.cart.id as string
    }

    // Builds a cart with a valid Formule line, a real offerable pickup slot,
    // a pickup shipping method, a French address and an initialized payment
    // session — ready to complete.
    async function createReadyCartWithValidSelection(commerce: Commerce) {
      const headers = headersFor(commerce)

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
        headers
      )
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

      const { data: lineItemData } = await api.post(
        `/store/carts/${cartId}/line-items`,
        {
          variant_id: commerce.formuleVariantId,
          quantity: 1,
          metadata: {
            [`formule_${commerce.entreeKey}_variant_id`]:
              commerce.samoussasBoeufVariantId,
            [`formule_${commerce.platKey}_variant_id`]:
              commerce.rizCantonaisVariantId,
          },
        },
        headers
      )
      const lineItemId = lineItemData.cart.items[0].id

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

      return { cartId, lineItemId, headers }
    }

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

    describe("POST /store/carts/:id/line-items — Sélection rejected at add-to-cart", () => {
      it("rejects a Variante curated for a DIFFERENT Composant of the same Formule (the margin case)", async () => {
        const commerce = await setUpCommerce()
        const cartId = await createCart(commerce)

        await expect(
          api.post(
            `/store/carts/${cartId}/line-items`,
            {
              variant_id: commerce.formuleVariantId,
              quantity: 1,
              metadata: {
                // samoussasBoeuf is curated for "entree", not "plat" — a
                // Variante valid elsewhere in the same Formule, not here.
                [`formule_${commerce.entreeKey}_variant_id`]:
                  commerce.samoussasBoeufVariantId,
                [`formule_${commerce.platKey}_variant_id`]:
                  commerce.samoussasBoeufVariantId,
              },
            },
            headersFor(commerce)
          )
        ).rejects.toMatchObject({
          response: {
            status: 400,
            data: { message: expect.stringContaining("Sélection") },
          },
        })
      })

      it("rejects a Sélection missing a Composant", async () => {
        const commerce = await setUpCommerce()
        const cartId = await createCart(commerce)

        await expect(
          api.post(
            `/store/carts/${cartId}/line-items`,
            {
              variant_id: commerce.formuleVariantId,
              quantity: 1,
              metadata: {
                [`formule_${commerce.entreeKey}_variant_id`]:
                  commerce.samoussasBoeufVariantId,
                // "plat" is missing entirely.
              },
            },
            headersFor(commerce)
          )
        ).rejects.toMatchObject({
          response: {
            status: 400,
            data: { message: expect.stringContaining("Sélection") },
          },
        })
      })

      it("rejects a Sélection posed on a line whose Variante is not a Formule", async () => {
        const commerce = await setUpCommerce()
        const cartId = await createCart(commerce)

        await expect(
          api.post(
            `/store/carts/${cartId}/line-items`,
            {
              variant_id: commerce.platDuJourVariantId,
              quantity: 1,
              metadata: {
                [`formule_${commerce.entreeKey}_variant_id`]:
                  commerce.samoussasBoeufVariantId,
              },
            },
            headersFor(commerce)
          )
        ).rejects.toMatchObject({
          response: { status: 400 },
        })
      })
    })

    describe("PUT-equivalent /store/carts/:id/line-items/:line_id — Sélection rejected on update", () => {
      it("rejects a metadata update that breaks a previously valid Sélection", async () => {
        const commerce = await setUpCommerce()
        const cartId = await createCart(commerce)

        const { data: addData } = await api.post(
          `/store/carts/${cartId}/line-items`,
          {
            variant_id: commerce.formuleVariantId,
            quantity: 1,
            metadata: {
              [`formule_${commerce.entreeKey}_variant_id`]:
                commerce.samoussasBoeufVariantId,
              [`formule_${commerce.platKey}_variant_id`]:
                commerce.rizCantonaisVariantId,
            },
          },
          headersFor(commerce)
        )
        const lineItemId = addData.cart.items[0].id

        await expect(
          api.post(
            `/store/carts/${cartId}/line-items/${lineItemId}`,
            {
              quantity: 1,
              metadata: {
                [`formule_${commerce.platKey}_variant_id`]:
                  commerce.samoussasBoeufVariantId,
              },
            },
            headersFor(commerce)
          )
        ).rejects.toMatchObject({
          response: {
            status: 400,
            data: { message: expect.stringContaining("Sélection") },
          },
        })
      })
    })

    describe("POST /store/carts/:id/complete — Sélection revalidated at completion", () => {
      it("rejects a Sélection whose Curation changed after add-to-cart, before payment capture", async () => {
        const commerce = await setUpCommerce()
        const { cartId, headers } = await createReadyCartWithValidSelection(
          commerce
        )

        // The Curation the customer relied on at add-time is gone: the
        // restaurateur withdrew samoussasBoeuf from "entree" while the
        // customer sat on the payment page — exactly the race the spec
        // names (§"La validation serveur").
        const container = getContainer()
        const link = container.resolve(ContainerRegistrationKeys.LINK)
        await link.dismiss([commerce.entreeSamoussasLink])

        await expect(
          api.post(`/store/carts/${cartId}/complete`, {}, headers)
        ).rejects.toMatchObject({
          response: {
            status: 400,
            data: { message: expect.stringContaining("Sélection") },
          },
        })

        expect(await paymentSessionStatus(cartId, headers)).toEqual("pending")
      })
    })
  },
})
