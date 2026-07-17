import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { FORMULE_MODULE } from "../../src/modules/formule"

// Ticket 02's "happy path" seam: POST /store/carts/:id/line-items with a
// correctly composed Formule writes the Sélection as flat metadata keys, and
// the line item carries it verbatim on read-back. Server-side rejection of an
// incoherent Sélection is ticket 04 — this suite only proves the path that
// works.

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    // Minimal commerce fixture (region, sales channel, publishable key, a
    // stocked/priced Formule variant) plus a Formule with two Composants,
    // each curated with two dish Variantes via the formule-composant-variant
    // link — the same link `setComposantVariantsWorkflow` writes to in
    // production, built directly here since only the read side is exercised.
    async function setUpFormule() {
      const container = getContainer()
      const link = container.resolve(ContainerRegistrationKeys.LINK)
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
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
      // added to a cart directly — only referenced by id in the Sélection —
      // so they need no price or inventory.
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
        // Curated for "plat" too, not just "entree" — ticket 04's server
        // validation checks a Variante against the Curation of the
        // Composant it was submitted for, so the "same Variante in two
        // Composants" test below needs it genuinely curated in both.
        {
          [FORMULE_MODULE]: { formule_composant_id: plat.id },
          [Modules.PRODUCT]: { product_variant_id: samoussasBoeuf.id },
        },
      ])

      return {
        publishableKey,
        regionId: region.id,
        salesChannelId: salesChannel.id,
        formuleVariantId: formuleVariant.id,
        entreeKey: entree.key,
        platKey: plat.key,
        samoussasBoeufVariantId: samoussasBoeuf.id,
        rizCantonaisVariantId: rizCantonais.id,
      }
    }

    async function createEmptyCart(
      formule: Awaited<ReturnType<typeof setUpFormule>>
    ) {
      const headers = {
        headers: { "x-publishable-api-key": formule.publishableKey },
      }

      const { data } = await api.post(
        "/store/carts",
        {
          region_id: formule.regionId,
          sales_channel_id: formule.salesChannelId,
          currency_code: "eur",
          email: "client@example.com",
        },
        headers
      )

      return { cartId: data.cart.id, headers }
    }

    describe("POST /store/carts/:id/line-items — Formule composition", () => {
      it("writes the Sélection as flat metadata keys, and the line item carries it verbatim on read-back", async () => {
        const formule = await setUpFormule()
        const { cartId, headers } = await createEmptyCart(formule)

        const selection = {
          [`formule_${formule.entreeKey}_variant_id`]:
            formule.samoussasBoeufVariantId,
          [`formule_${formule.platKey}_variant_id`]:
            formule.rizCantonaisVariantId,
        }

        await api.post(
          `/store/carts/${cartId}/line-items`,
          {
            variant_id: formule.formuleVariantId,
            quantity: 1,
            metadata: selection,
          },
          headers
        )

        const { data } = await api.get(
          `/store/carts/${cartId}?fields=+items.metadata`,
          headers
        )

        expect(data.cart.items).toHaveLength(1)
        const item = data.cart.items[0]
        expect(item.variant_id).toEqual(formule.formuleVariantId)
        expect(item.metadata).toEqual(selection)
      })

      it("allows choosing the same Variante in two different Composants of the same Formule", async () => {
        const formule = await setUpFormule()
        const { cartId, headers } = await createEmptyCart(formule)

        const selection = {
          [`formule_${formule.entreeKey}_variant_id`]:
            formule.samoussasBoeufVariantId,
          [`formule_${formule.platKey}_variant_id`]:
            formule.samoussasBoeufVariantId,
        }

        await api.post(
          `/store/carts/${cartId}/line-items`,
          {
            variant_id: formule.formuleVariantId,
            quantity: 1,
            metadata: selection,
          },
          headers
        )

        const { data } = await api.get(
          `/store/carts/${cartId}?fields=+items.metadata`,
          headers
        )

        expect(data.cart.items).toHaveLength(1)
        expect(data.cart.items[0].metadata).toEqual(selection)
      })
    })
  },
})
