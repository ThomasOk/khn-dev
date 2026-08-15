import { ExecArgs } from "@medusajs/framework/types"
import { deleteProductCategoriesWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"

// One-off script: removes the Medusa starter's demo categories (created by
// seed.ts to hold its own demo products). cleanup-demo-data.ts deletes the 4
// demo products themselves but never touched the categories they belonged
// to, so the categories survive empty and still show up in the storefront's
// nav (listCategories() has no "has products" filter — see
// docs/handoffs/2026-08-15-prod-environment-setup-to-vercel-branch-deploy-bug.md).
// Safe to re-run — skips whatever is already gone. Never touches the real
// menu categories (import-menu-data.ts).
// Run with: DATABASE_URL="<target>" npx medusa exec ./src/scripts/cleanup-demo-categories.ts
const DEMO_CATEGORY_NAMES = ["Shirts", "Sweatshirts", "Pants", "Merch"]

export default async function cleanupDemoCategories({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const productModuleService = container.resolve(Modules.PRODUCT)

  // listProductCategories doesn't select `name` by default (only id and a
  // few base fields) — request it explicitly, both for the filter itself
  // and for the log message below.
  const demoCategories = await productModuleService.listProductCategories(
    { name: DEMO_CATEGORY_NAMES },
    { select: ["id", "name"] }
  )

  if (demoCategories.length === 0) {
    logger.info("No demo categories found, nothing to do.")
    return
  }

  // Unlike deleteProductsWorkflow, this workflow's input is the array of
  // ids directly, not wrapped in an { ids } object.
  await deleteProductCategoriesWorkflow(container).run({
    input: demoCategories.map((c) => c.id),
  })
  logger.info(
    `Deleted ${demoCategories.length} demo categor${
      demoCategories.length === 1 ? "y" : "ies"
    }: ${demoCategories.map((c) => c.name).join(", ")}`
  )
}
