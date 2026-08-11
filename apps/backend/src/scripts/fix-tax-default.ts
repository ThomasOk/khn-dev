import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// One-off script: sets is_default: true on the FR standard-rate tax rate
// (code TVA_FR_10). Without it, the tax module never selects this rate for
// any line item (it has no rules), so every non-Alcool item gets taxed at
// 0%. Idempotent — safe to re-run.
// Run with: DATABASE_URL="<target>" npx medusa exec ./src/scripts/fix-tax-default.ts
export default async function fixTaxDefault({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const taxModuleService = container.resolve(Modules.TAX)

  const [rate] = await taxModuleService.listTaxRates({ code: "TVA_FR_10" })
  if (!rate) {
    throw new Error("No tax rate with code TVA_FR_10 found on this database.")
  }

  if (rate.is_default) {
    logger.info(`TVA_FR_10 (${rate.id}) already is_default: true, nothing to do.`)
    return
  }

  await taxModuleService.updateTaxRates(rate.id, { is_default: true })
  logger.info(`TVA_FR_10 (${rate.id}) updated: is_default false -> true.`)
}
