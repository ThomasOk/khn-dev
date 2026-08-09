import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { mkdirSync, writeFileSync } from "fs"
import { dirname, resolve } from "path"
import { INVOICE_MODULE } from "../modules/invoice"
import InvoiceModuleService from "../modules/invoice/service"
import { PICKUP_MODULE } from "../modules/pickup"
import PickupModuleService from "../modules/pickup/service"

// One-off script: dumps the real menu catalog + store config (tax, stock
// location, pickup, invoice issuer) from the LOCAL database to a JSON
// snapshot, for import-menu-data.ts to replay against staging/prod.
// Run with: npx medusa exec ./src/scripts/export-menu-data.ts
const SNAPSHOT_PATH = resolve(__dirname, "../../tmp/menu-snapshot.json")

const DEMO_PRODUCT_TITLES = [
  "Medusa T-Shirt",
  "Medusa Sweatshirt",
  "Medusa Sweatpants",
  "Medusa Shorts",
]

export default async function exportMenuData({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "title",
      "description",
      "handle",
      "status",
      "type.value",
      "categories.name",
      "options.title",
      "options.values.value",
      "images.url",
      "images.rank",
      "variants.title",
      "variants.manage_inventory",
      "variants.options.value",
      "variants.options.option.title",
      "variants.prices.currency_code",
      "variants.prices.amount",
      "variants.prices.rules_count",
    ],
  })

  const realProducts = products
    .filter((p) => !DEMO_PRODUCT_TITLES.includes(p.title))
    .map((p) => ({
      title: p.title,
      description: p.description,
      handle: p.handle,
      status: p.status,
      type: p.type?.value ?? null,
      categories: p.categories?.map((c) => c!.name) ?? [],
      options: p.options?.map((o) => ({
        title: o.title,
        values: o.values?.map((v) => v.value) ?? [],
      })),
      images: [...(p.images ?? [])]
        .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
        .map((i) => i.url),
      // `variants.prices` is a pricing-module field that query.graph's
      // ProductVariant type doesn't declare, though the field is present at
      // runtime (requested explicitly above).
      variants: p.variants?.map((v: any) => {
        // Dedupe prices: the local DB accumulated region-scoped price
        // overrides identical in amount to the plain currency price
        // (rules_count === 0). Only the rule-less row is needed on a fresh
        // environment.
        const seen = new Set<string>()
        const prices = (v.prices ?? [])
          .filter((pr) => (pr.rules_count ?? 0) === 0)
          .filter((pr) => {
            const key = `${pr.currency_code}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          .map((pr) => ({ currency_code: pr.currency_code, amount: pr.amount }))

        return {
          title: v.title,
          manage_inventory: v.manage_inventory,
          options: Object.fromEntries(
            (v.options ?? []).map((o) => [o.option.title, o.value])
          ),
          prices,
        }
      }),
    }))

  // Formule Curation (ADR 0001/0005): each real Formule's Composants, and
  // the Variantes explicitly curated into each — matched on the target by
  // (product title, variant title) rather than ID, since IDs never survive
  // a cross-environment move. `formule.product_id` is a plain column, not a
  // Module Link (see src/modules/formule/models/formule.ts), so query.graph
  // can't traverse it — read via raw SQL instead, same shape already
  // validated by hand against this DB.
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const curationRows: {
    formule_product_title: string
    key: string
    label: string
    rank: number
    curated_product_title: string
    curated_variant_title: string
  }[] = await knex("formule as f")
    .join("product as fp", function () {
      this.on("fp.id", "=", "f.product_id").andOnNull("fp.deleted_at")
    })
    .join("formule_composant as fc", "fc.formule_id", "f.id")
    .join(
      "formule_formule_composant_product_product_variant as link",
      function () {
        this.on("link.formule_composant_id", "=", "fc.id").andOnNull(
          "link.deleted_at"
        )
      }
    )
    .join("product_variant as cv", "cv.id", "link.product_variant_id")
    .join("product as cp", "cp.id", "cv.product_id")
    .whereNull("f.deleted_at")
    .select(
      "fp.title as formule_product_title",
      "fc.key",
      "fc.label",
      "fc.rank",
      "cp.title as curated_product_title",
      "cv.title as curated_variant_title"
    )

  const formuleByProduct = new Map<string, Map<string, any>>()
  for (const row of curationRows) {
    if (DEMO_PRODUCT_TITLES.includes(row.formule_product_title)) continue
    if (!formuleByProduct.has(row.formule_product_title)) {
      formuleByProduct.set(row.formule_product_title, new Map())
    }
    const composants = formuleByProduct.get(row.formule_product_title)!
    if (!composants.has(row.key)) {
      composants.set(row.key, {
        key: row.key,
        label: row.label,
        rank: row.rank,
        curatedVariants: [] as { productTitle: string; variantTitle: string }[],
      })
    }
    composants.get(row.key).curatedVariants.push({
      productTitle: row.curated_product_title,
      variantTitle: row.curated_variant_title,
    })
  }

  const formules = [...formuleByProduct.entries()].map(([productTitle, composants]) => ({
    productTitle,
    composants: [...composants.values()],
  }))

  const pickupModuleService: PickupModuleService = container.resolve(PICKUP_MODULE)
  const schedules = await pickupModuleService.listPickupSchedules()
  const [pickupConfig] = await pickupModuleService.listPickupConfigs()

  const invoiceModuleService: InvoiceModuleService = container.resolve(INVOICE_MODULE)
  const [issuerConfig] = await invoiceModuleService.listIssuerConfigs()

  const stockLocationModuleService = container.resolve(Modules.STOCK_LOCATION)
  const [realStockLocation] = await stockLocationModuleService.listStockLocations(
    { name: "Restaurant Kim-Hi Noodle" },
    { relations: ["address"] }
  )

  const snapshot = {
    products: realProducts,
    formules,
    taxRates: {
      fr: [
        { name: "TVA 20%", rate: 20, code: "TVA_20", productType: "Alcool" },
      ],
    },
    stockLocation: {
      name: realStockLocation.name,
      address: {
        address_1: realStockLocation.address!.address_1,
        city: realStockLocation.address!.city,
        postal_code: realStockLocation.address!.postal_code,
        country_code: realStockLocation.address!.country_code,
        phone: realStockLocation.address!.phone,
      },
    },
    pickup: {
      config: {
        prep_delay_minutes: pickupConfig.prep_delay_minutes,
        slot_duration_minutes: pickupConfig.slot_duration_minutes,
        restaurant_notification_email: pickupConfig.restaurant_notification_email,
      },
      schedules: schedules.map((s) => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        active: s.active,
      })),
    },
    issuer: {
      legal_name: issuerConfig.legal_name,
      address: issuerConfig.address,
      siren: issuerConfig.siren,
      siret: issuerConfig.siret,
      vat_number: issuerConfig.vat_number,
      legal_form: issuerConfig.legal_form,
      share_capital: issuerConfig.share_capital,
      rcs_city: issuerConfig.rcs_city,
    },
  }

  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true })
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2))
  console.log(
    `Wrote ${realProducts.length} products and ${formules.length} formule(s) to ${SNAPSHOT_PATH}`
  )
}
