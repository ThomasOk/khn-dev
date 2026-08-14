import { ExecArgs } from "@medusajs/framework/types"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

// One-off script: switches the FR region's payment provider from the
// manual/system default to Stripe. seed.ts only ever wires
// payment_providers: ["pp_system_default"] — on staging this was patched
// by hand in the admin (06/08) but never ported back to seed.ts, so every
// freshly seeded environment (prod included) reproduces the same gap: the
// storefront checkout shows "Paiement manuel" instead of the Stripe card
// element. Idempotent — safe to re-run.
// Run with: DATABASE_URL="<target>" npx medusa exec ./src/scripts/fix-region-payment-provider.ts
export default async function fixRegionPaymentProvider({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const regionModuleService = container.resolve("region")

  const [frRegion] = await regionModuleService.listRegions({ name: "France" })
  if (!frRegion) {
    throw new Error("No 'France' region found on this database.")
  }

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: frRegion.id },
      update: { payment_providers: ["pp_stripe_stripe"] },
    },
  })
  logger.info(
    `Region "${frRegion.name}" (${frRegion.id}) payment providers set to ["pp_stripe_stripe"].`
  )
}
