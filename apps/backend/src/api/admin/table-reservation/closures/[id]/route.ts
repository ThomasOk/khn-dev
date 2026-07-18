import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteReservationClosureWorkflow } from "../../../../../workflows/table-reservation/manage-closures"

// DELETE /admin/table-reservation/closures/:id — lift a closure, reopening
// its whole period at once. The Services apply again from the next
// storefront request onward.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await deleteReservationClosureWorkflow(req.scope).run({ input: { id } })

  res.json({ id, object: "table_reservation_closure", deleted: true })
}
