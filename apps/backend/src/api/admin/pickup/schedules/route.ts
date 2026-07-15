import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../../modules/pickup"
import PickupModuleService from "../../../../modules/pickup/service"
import { createPickupScheduleWorkflow } from "../../../../workflows/pickup/manage-schedules"
import { CreateScheduleSchema } from "../middlewares"

// GET /admin/pickup/schedules — the Horaires de retrait the admin settings page
// renders. Sorted by weekday then start time so several ranges on the same day
// (lunch, dinner) read in order.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: PickupModuleService = req.scope.resolve(PICKUP_MODULE)

  const schedules = await service.listPickupSchedules(
    {},
    { order: { day_of_week: "ASC", start_time: "ASC" } }
  )

  res.json({ schedules })
}

// POST /admin/pickup/schedules — add a pickup window. Several may target the same
// weekday, which is what separates a lunch service from a dinner service.
export async function POST(
  req: MedusaRequest<CreateScheduleSchema>,
  res: MedusaResponse
) {
  const { result } = await createPickupScheduleWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ schedule: result })
}
