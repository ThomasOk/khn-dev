import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteServiceWindowWorkflow,
  updateServiceWindowWorkflow,
} from "../../../../../workflows/table-reservation/manage-service-windows"
import { UpdateServiceWindowSchema } from "../../middlewares"

// POST /admin/table-reservation/service-windows/:id — edit a Service (change
// its hours, capacity, duration, weekday, or toggle it active without
// deleting it).
export async function POST(
  req: MedusaRequest<UpdateServiceWindowSchema>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await updateServiceWindowWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  })

  res.json({ service_window: result })
}

// DELETE /admin/table-reservation/service-windows/:id — remove a Service. It
// stops being offered on the storefront immediately: availability is
// re-derived on every request, with no cache in between.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await deleteServiceWindowWorkflow(req.scope).run({ input: { id } })

  res.json({ id, object: "table_reservation_service_window", deleted: true })
}
