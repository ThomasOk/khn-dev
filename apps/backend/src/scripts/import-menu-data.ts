import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils"
import { readFileSync } from "fs"
import { resolve } from "path"
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRatesWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"
import { FORMULE_MODULE } from "../modules/formule"
import FormuleModuleService from "../modules/formule/service"
import { INVOICE_MODULE } from "../modules/invoice"
import InvoiceModuleService from "../modules/invoice/service"
import { PICKUP_MODULE } from "../modules/pickup"
import PickupModuleService from "../modules/pickup/service"

// One-off script: replays the JSON snapshot produced by export-menu-data.ts
// against the CURRENT container's database (staging today, prod later via
// DATABASE_URL override). Idempotent: safe to re-run, skips what already
// exists. Never touches order/cart/customer/api_key/sales_channel/user data.
// Run with: DATABASE_URL="<target>" npx medusa exec ./src/scripts/import-menu-data.ts
// Expects export-menu-data.ts to have been run first (writes to the same path).
const SNAPSHOT_PATH = resolve(__dirname, "../../tmp/menu-snapshot.json")

export default async function importMenuData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

  const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8"))

  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const taxModuleService = container.resolve(Modules.TAX)
  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION)
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT)

  const [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  })
  if (!defaultSalesChannel) throw new Error("Default Sales Channel not found on target.")

  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfileResult[0]

  // --- 1. Tax: TVA 20% scoped to a new "Alcool" product type ---
  logger.info("Tax rates...")
  let [alcoolType] = await productModuleService.listProductTypes({ value: "Alcool" })
  if (!alcoolType) {
    ;[alcoolType] = await productModuleService.createProductTypes([{ value: "Alcool" }])
  }

  const [existing20] = await taxModuleService.listTaxRates({ code: "TVA_20" })
  if (!existing20) {
    const [frTaxRegion] = await taxModuleService.listTaxRegions({ country_code: "fr" })
    if (!frTaxRegion) throw new Error("No FR tax region on target — run the base seed first.")

    await createTaxRatesWorkflow(container).run({
      input: [
        {
          tax_region_id: frTaxRegion.id,
          name: "TVA 20%",
          rate: 20,
          code: "TVA_20",
          rules: [{ reference: "product_type", reference_id: alcoolType.id }],
        },
      ],
    })
    logger.info("Created TVA 20% tax rate for Alcool product type.")
  } else {
    logger.info("TVA 20% already exists, skipping.")
  }

  // --- 2. Real stock location + pickup fulfillment ---
  // Each sub-step below is checked independently: a base seed (like the one
  // already run on staging) may have created some of these globally-unique
  // entities (fulfillment set / shipping option name) against a *different*
  // stock location (the seed's demo "European Warehouse") before this script
  // ever ran. Reuse them rather than failing on a name collision.
  logger.info("Stock location...")
  let [stockLocation] = await stockLocationModuleService.listStockLocations({
    name: snapshot.stockLocation.name,
  })
  if (!stockLocation) {
    const { result } = await createStockLocationsWorkflow(container).run({
      input: { locations: [{ name: snapshot.stockLocation.name, address: snapshot.stockLocation.address }] },
    })
    stockLocation = result[0]
    logger.info("Created real stock location.")
  } else {
    logger.info("Real stock location already exists, skipping.")
  }

  const existingProviderLink = await knex("location_fulfillment_provider")
    .where({ stock_location_id: stockLocation.id, fulfillment_provider_id: "manual_manual" })
    .whereNull("deleted_at")
    .first()
  if (!existingProviderLink) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
  }

  let [pickupFulfillmentSet] = await fulfillmentModuleService.listFulfillmentSets({
    name: "Retrait au restaurant",
  })
  if (!pickupFulfillmentSet) {
    pickupFulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Retrait au restaurant",
      type: "pickup",
      service_zones: [
        { name: "France", geo_zones: [{ country_code: "fr", type: "country" }] },
      ],
    })
  }
  pickupFulfillmentSet = await fulfillmentModuleService.retrieveFulfillmentSet(
    pickupFulfillmentSet.id,
    { relations: ["service_zones"] }
  )

  const existingSetLink = await knex("location_fulfillment_set")
    .where({ fulfillment_set_id: pickupFulfillmentSet.id })
    .whereNull("deleted_at")
    .first()
  if (!existingSetLink) {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: pickupFulfillmentSet.id },
    })
  } else if (existingSetLink.stock_location_id !== stockLocation.id) {
    // A fulfillment set can only belong to one stock location. The base seed
    // linked this one to its demo "European Warehouse" location — repoint it
    // to the real restaurant instead of leaving a stray duplicate.
    await link.dismiss({
      [Modules.STOCK_LOCATION]: { stock_location_id: existingSetLink.stock_location_id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: pickupFulfillmentSet.id },
    })
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: pickupFulfillmentSet.id },
    })
    logger.info(
      `Repointed fulfillment set from ${existingSetLink.stock_location_id} to ${stockLocation.id}.`
    )
  }

  const [existingPickupOption] = await fulfillmentModuleService.listShippingOptions({
    name: "Retrait au restaurant",
  })
  if (!existingPickupOption) {
    await createShippingOptionsWorkflow(container).run({
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
  }

  const existingChannelLink = await knex("sales_channel_stock_location")
    .where({ sales_channel_id: defaultSalesChannel.id, stock_location_id: stockLocation.id })
    .whereNull("deleted_at")
    .first()
  if (!existingChannelLink) {
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: { id: stockLocation.id, add: [defaultSalesChannel.id] },
    })
  }
  logger.info("Stock location fulfillment wiring done.")

  // --- 3. Categories ---
  logger.info("Categories...")
  const categoryNames: string[] = Array.from(
    new Set(snapshot.products.flatMap((p: any) => p.categories))
  )
  const categoryIdByName = new Map<string, string>()
  for (const name of categoryNames) {
    let [existing] = await productModuleService.listProductCategories({ name })
    if (!existing) {
      const { result } = await createProductCategoriesWorkflow(container).run({
        input: { product_categories: [{ name, is_active: true }] },
      })
      existing = result[0]
    }
    categoryIdByName.set(name, existing.id)
  }

  // --- 4. Products ---
  logger.info("Products...")
  const [existingProducts] = [await productModuleService.listProducts({})]
  const existingHandles = new Set(existingProducts.map((p) => p.handle))

  const productsToCreate = snapshot.products.filter(
    (p: any) => !existingHandles.has(p.handle)
  )

  if (productsToCreate.length > 0) {
    await createProductsWorkflow(container).run({
      input: {
        products: productsToCreate.map((p: any) => ({
          title: p.title,
          description: p.description,
          handle: p.handle,
          status: p.status as ProductStatus,
          type_id: p.type ? alcoolType.id : undefined,
          category_ids: p.categories.map((c: string) => categoryIdByName.get(c)!),
          options: p.options,
          images: p.images.map((url: string) => ({ url })),
          variants: p.variants.map((v: any) => ({
            title: v.title,
            options: v.options,
            prices: v.prices,
            manage_inventory: v.manage_inventory ?? false,
          })),
          sales_channels: [{ id: defaultSalesChannel.id }],
          // Without this, createProductsWorkflow creates the product with no
          // product<->shipping_profile link at all. completeCartWorkflow's
          // validateShippingStep (Medusa core) then rejects checkout for
          // every cart containing it: it reads
          // item.variant.product.shipping_profile.id per line item and
          // rejects if that doesn't match the chosen shipping option's own
          // profile — undefined never matches. Caught only by testing a real
          // checkout, not by anything that inspects the product itself.
          shipping_profile_id: shippingProfile.id,
        })),
      },
    })
  }
  logger.info(
    `Products: ${productsToCreate.length} created, ${
      snapshot.products.length - productsToCreate.length
    } already present.`
  )

  // --- 4a. Backfill: products created by an earlier run of this script
  // before shipping_profile_id was added above never got the link either.
  // Idempotent and scoped to exactly the products this script owns (by
  // handle, from the snapshot) — never touches the base seed's demo
  // products or anything else already correctly linked.
  const { data: productsMissingProfile } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "shipping_profile.id"],
    filters: { handle: snapshot.products.map((p: any) => p.handle) },
  })
  const linksToBackfill = productsMissingProfile
    .filter((p) => !p.shipping_profile)
    .map((p) => ({
      [Modules.PRODUCT]: { product_id: p.id },
      [Modules.FULFILLMENT]: { shipping_profile_id: shippingProfile.id },
    }))
  if (linksToBackfill.length > 0) {
    await link.create(linksToBackfill)
  }
  logger.info(`Shipping profile backfilled on ${linksToBackfill.length} product(s).`)

  // --- 4b. Formule curation (ADR 0001/0005) ---
  logger.info("Formule curation...")
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: ["id", "title", "variants.id", "variants.title"],
  })
  const productIdByTitle = new Map(allProducts.map((p) => [p.title, p.id]))
  const variantIdByProductAndTitle = new Map<string, string>()
  for (const p of allProducts) {
    for (const v of p.variants ?? []) {
      variantIdByProductAndTitle.set(`${p.title}::${v.title}`, v.id)
    }
  }

  const formuleModuleService: FormuleModuleService = container.resolve(FORMULE_MODULE)

  for (const f of snapshot.formules ?? []) {
    const productId = productIdByTitle.get(f.productTitle)
    if (!productId) {
      logger.warn(`Formule product "${f.productTitle}" not found on target, skipping.`)
      continue
    }

    let [formule] = await formuleModuleService.listFormules({ product_id: productId })
    if (!formule) {
      formule = await formuleModuleService.createFormules({ product_id: productId })
    }

    for (const c of f.composants) {
      let [composant] = await formuleModuleService.listFormuleComposants({
        formule_id: formule.id,
        key: c.key,
      })
      if (!composant) {
        composant = await formuleModuleService.createFormuleComposants({
          formule_id: formule.id,
          key: c.key,
          label: c.label,
          rank: c.rank,
        })
      }

      const existingCurationLinks = await knex(
        "formule_formule_composant_product_product_variant"
      )
        .where({ formule_composant_id: composant.id })
        .whereNull("deleted_at")
      const alreadyCuratedVariantIds = new Set(
        existingCurationLinks.map((r: any) => r.product_variant_id)
      )

      const variantIdsToLink: string[] = []
      for (const cv of c.curatedVariants) {
        const variantId = variantIdByProductAndTitle.get(
          `${cv.productTitle}::${cv.variantTitle}`
        )
        if (!variantId) {
          logger.warn(
            `Curated variant "${cv.productTitle} / ${cv.variantTitle}" not found on target, skipping.`
          )
          continue
        }
        if (!alreadyCuratedVariantIds.has(variantId)) {
          variantIdsToLink.push(variantId)
        }
      }

      if (variantIdsToLink.length) {
        await link.create(
          variantIdsToLink.map((variantId) => ({
            [FORMULE_MODULE]: { formule_composant_id: composant.id },
            [Modules.PRODUCT]: { product_variant_id: variantId },
          }))
        )
      }
    }
  }
  logger.info(`Formule curation: ${(snapshot.formules ?? []).length} formule(s) processed.`)

  // --- 5. Pickup config + schedule ---
  logger.info("Pickup config...")
  const pickupModuleService: PickupModuleService = container.resolve(PICKUP_MODULE)
  const [pickupConfig] = await pickupModuleService.listPickupConfigs()
  await pickupModuleService.updatePickupConfigs({
    id: pickupConfig.id,
    ...snapshot.pickup.config,
  })

  const existingSchedules = await pickupModuleService.listPickupSchedules()
  await pickupModuleService.deletePickupSchedules(existingSchedules.map((s) => s.id))
  await pickupModuleService.createPickupSchedules(snapshot.pickup.schedules)

  // --- 6. Issuer config ---
  logger.info("Issuer config...")
  const invoiceModuleService: InvoiceModuleService = container.resolve(INVOICE_MODULE)
  const [issuerConfig] = await invoiceModuleService.listIssuerConfigs()
  await invoiceModuleService.updateIssuerConfigs({
    id: issuerConfig.id,
    ...snapshot.issuer,
  })

  logger.info("Done.")
}
