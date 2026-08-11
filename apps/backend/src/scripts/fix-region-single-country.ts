import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { updateRegionsWorkflow } from "@medusajs/medusa/core-flows"

// One-off script: narrows the "Europe" region (7 countries, unmodified
// from the starter) down to just France, and renames it to match — same
// state local already had (fixed by hand through the admin at some point,
// never reported back into seed.ts). This isn't cosmetic: createCartWorkflow
// only attaches a default shipping_address at cart creation when the
// region has exactly one country, which is what makes tax compute on the
// very first item added rather than only after the checkout address form.
// Idempotent — safe to re-run.
// Run with: DATABASE_URL="<target>" npx medusa exec ./src/scripts/fix-region-single-country.ts
export default async function fixRegionSingleCountry({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const regionModuleService = container.resolve(Modules.REGION)

  const [region] = await regionModuleService.listRegions(
    {},
    { relations: ["countries"] }
  )
  if (!region) {
    throw new Error("No region found on this database.")
  }

  const currentCountries = (region.countries ?? []).map((c: any) => c.iso_2)
  if (currentCountries.length === 1 && currentCountries[0] === "fr" && region.name === "France") {
    logger.info(`Region ${region.id} already single-country "France", nothing to do.`)
    return
  }

  await updateRegionsWorkflow(container).run({
    input: {
      selector: { id: region.id },
      update: {
        name: "France",
        countries: ["fr"],
      },
    },
  })

  logger.info(
    `Region ${region.id} updated: "${region.name}" [${currentCountries.join(", ")}] -> "France" [fr]`
  )
}
