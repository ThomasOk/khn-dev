import { ExecArgs } from "@medusajs/framework/types"
import { deleteProductsWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

// One-off script: removes the Medusa starter's demo products (created by
// seed.ts, needed there only to exercise the seed's own demo category/region
// wiring) from a real environment. Safe to re-run — skips whatever is
// already gone. Never touches the real menu catalog (import-menu-data.ts)
// or the demo "European Warehouse" stock location itself (harmless once
// import-menu-data.ts has repointed the pickup fulfillment set away from
// it — left in place rather than risking a delete workflow that doesn't
// exist for stock locations in this Medusa version).
// Run with: DATABASE_URL="<target>" npx medusa exec ./src/scripts/cleanup-demo-data.ts
const DEMO_PRODUCT_TITLES = [
  "Medusa T-Shirt",
  "Medusa Sweatshirt",
  "Medusa Sweatpants",
  "Medusa Shorts",
]

export default async function cleanupDemoData({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  const demoProducts = await productModuleService.listProducts({
    title: DEMO_PRODUCT_TITLES,
  })

  if (demoProducts.length === 0) {
    logger.info("No demo products found, nothing to do.")
    return
  }

  await deleteProductsWorkflow(container).run({
    input: { ids: demoProducts.map((p) => p.id) },
  })
  logger.info(
    `Deleted ${demoProducts.length} demo product(s): ${demoProducts
      .map((p) => p.title)
      .join(", ")}`
  )
}
