import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingProfilesWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
} from "@medusajs/medusa/core-flows"
import { FORMULE_MODULE } from "../../src/modules/formule"

// The storefront groups a Composant's curated Variantes by `product_id` and
// offers one select per Option instead of one row per Variante combination
// (see storefront lib/util/formule-variant-group.ts) — that grouping only
// works if GET /store/formules/:product_id carries each curated Variante's
// Option/value pairs, not just its flattened title. This suite proves the
// route's contract for a Produit curated with several Options (e.g. "Banh
// Sung": 2 Options, several curated combinations).

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    async function setUpFormule() {
      const container = getContainer()
      const link = container.resolve(ContainerRegistrationKeys.LINK)
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

      const shippingProfileResult = await createShippingProfilesWorkflow(
        container
      ).run({
        input: { data: [{ name: "Default", type: "default" }] },
      })
      const shippingProfile = shippingProfileResult.result[0]

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

      // "Banh Sung": 2 Options ("Viande 1", "Viande 2"), curated with 4 of
      // its 6 possible combinations — enough to prove the route doesn't just
      // echo back every possible combination, only the curated ones.
      const banhSungResult = await createProductsWorkflow(container).run({
        input: {
          products: [
            {
              title: "Banh Sung",
              status: "published" as any,
              shipping_profile_id: shippingProfile.id,
              options: [
                { title: "Viande 1", values: ["Porc", "Crevettes"] },
                {
                  title: "Viande 2",
                  values: ["Tofu", "Crevettes", "Poulet"],
                },
              ],
              variants: [
                {
                  title: "Porc / Tofu",
                  sku: "BANH-SUNG-PORC-TOFU",
                  options: { "Viande 1": "Porc", "Viande 2": "Tofu" },
                  prices: [{ amount: 12, currency_code: "eur" }],
                },
                {
                  title: "Porc / Crevettes",
                  sku: "BANH-SUNG-PORC-CREVETTES",
                  options: { "Viande 1": "Porc", "Viande 2": "Crevettes" },
                  prices: [{ amount: 13, currency_code: "eur" }],
                },
                {
                  title: "Crevettes / Tofu",
                  sku: "BANH-SUNG-CREVETTES-TOFU",
                  options: { "Viande 1": "Crevettes", "Viande 2": "Tofu" },
                  prices: [{ amount: 13, currency_code: "eur" }],
                },
                {
                  title: "Crevettes / Poulet",
                  sku: "BANH-SUNG-CREVETTES-POULET",
                  options: { "Viande 1": "Crevettes", "Viande 2": "Poulet" },
                  prices: [{ amount: 13, currency_code: "eur" }],
                },
              ],
              sales_channels: [{ id: salesChannel.id }],
            },
          ],
        },
      })
      const banhSungVariants = banhSungResult.result[0].variants

      const formule = await formuleModule.createFormules({
        product_id: formuleProductResult.result[0].id,
      })
      const [plat] = await formuleModule.createFormuleComposants([
        { formule_id: formule.id, key: "plat", label: "Plat", rank: 0 },
      ])

      await link.create(
        banhSungVariants.map((variant: { id: string }) => ({
          [FORMULE_MODULE]: { formule_composant_id: plat.id },
          [Modules.PRODUCT]: { product_variant_id: variant.id },
        }))
      )

      return {
        publishableKey,
        regionId: region.id,
        formuleProductId: formuleProductResult.result[0].id,
        banhSungVariants,
      }
    }

    describe("GET /store/formules/:product_id — Option data for grouped Variante pickers", () => {
      it("carries each curated Variante's Option/value pairs, scoped to what was actually curated", async () => {
        const formule = await setUpFormule()
        const headers = {
          headers: { "x-publishable-api-key": formule.publishableKey },
        }

        const { data } = await api.get(
          `/store/formules/${formule.formuleProductId}?region_id=${formule.regionId}`,
          headers
        )

        const plat = data.formule.composants.find(
          (c: { key: string }) => c.key === "plat"
        )

        expect(plat.variants).toHaveLength(4)

        for (const variant of plat.variants) {
          expect(variant.options).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                option_title: "Viande 1",
                value: expect.any(String),
              }),
              expect.objectContaining({
                option_title: "Viande 2",
                value: expect.any(String),
              }),
            ])
          )
          expect(variant.options).toHaveLength(2)

          // A flattened "Porc / Crevettes" only reads as two values in
          // *position* order — `title` must spell out which Option each one
          // answers, not just concatenate them (a kitchen ticket / order
          // page reader has no other way to tell them apart). Options can
          // come back in either order, so the expectation is built from the
          // response itself rather than a hardcoded Viande 1/Viande 2 order.
          const expectedTitle = `Banh Sung — ${variant.options
            .map((o: { option_title: string; value: string }) => `${o.option_title}: ${o.value}`)
            .join(", ")}`
          expect(variant.title).toBe(expectedTitle)
        }

        // The same Option ("Viande 1") must resolve to the same option_id
        // across every curated Variante — the storefront groups selects by
        // this id (deriveOptionChoices), so a mismatch would split one
        // logical Option into two selects.
        const viande1Ids = new Set(
          plat.variants.map(
            (v: { options: { option_title: string; option_id: string }[] }) =>
              v.options.find((o) => o.option_title === "Viande 1")?.option_id
          )
        )
        expect(viande1Ids.size).toBe(1)

        // Only the 4 curated combinations should be present — never the 2
        // uncurated ones ("Porc / Poulet", "Crevettes / Crevettes").
        const combos = plat.variants.map(
          (v: { options: { value: string }[] }) =>
            v.options.map((o) => o.value).join(" / ")
        )
        expect(combos).not.toContain("Porc / Poulet")
        expect(combos).not.toContain("Crevettes / Crevettes")
      })
    })
  },
})
