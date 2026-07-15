import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import { upsertPickupConfigWorkflow } from "../../../../workflows/pickup/upsert-config"
import { UpsertConfigSchema } from "../middlewares"

// GET /admin/pickup/config — the single Configuration row (Délai de préparation and
// slot duration), or null before it has ever been set.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)

  const [config] = await service.listPickupConfigs()

  res.json({ config: config ?? null })
}

// POST /admin/pickup/config — set the Délai de préparation and slot duration. The
// first value installed by the seed will be wrong; this is what lets the restaurant
// fix it without a deploy. It is an upsert: there is only ever one row.
export async function POST(
  req: MedusaRequest<UpsertConfigSchema>,
  res: MedusaResponse
) {
  const { result } = await upsertPickupConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ config: result })
}
