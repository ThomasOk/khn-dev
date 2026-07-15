import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import { createPickupClosureWorkflow } from "../../../../workflows/pickup/manage-closures"
import { CreateClosureSchema } from "../middlewares"

// GET /admin/pickup/closures — the Fermetures exceptionnelles, soonest first.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)

  const closures = await service.listClosures(
    {},
    { order: { date: "ASC" } }
  )

  res.json({ closures })
}

// POST /admin/pickup/closures — declare a closure on a civil day, with an optional
// reason (a bank holiday, the August break). It wipes that day's schedule entirely.
export async function POST(
  req: MedusaRequest<CreateClosureSchema>,
  res: MedusaResponse
) {
  const { result } = await createPickupClosureWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ closure: result })
}
