import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deletePickupScheduleWorkflow,
  updatePickupScheduleWorkflow,
} from "../../../../../workflows/pickup/manage-schedules"
import { UpdateScheduleSchema } from "../../middlewares"

// POST /admin/pickup/schedules/:id — edit a pickup window (change its hours,
// weekday, or toggle it active without deleting it).
export async function POST(
  req: MedusaRequest<UpdateScheduleSchema>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await updatePickupScheduleWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  })

  res.json({ schedule: result })
}

// DELETE /admin/pickup/schedules/:id — remove a pickup window. It stops being
// offered on the storefront immediately: the slots are re-derived on every
// request, with no cache in between.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await deletePickupScheduleWorkflow(req.scope).run({ input: { id } })

  res.json({ id, object: "pickup_schedule", deleted: true })
}
