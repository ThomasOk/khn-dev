import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deletePickupClosureWorkflow } from "../../../../../workflows/pickup/manage-closures"

// DELETE /admin/pickup/closures/:id — lift a closure. The day's schedule applies
// again from the next storefront request onward.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await deletePickupClosureWorkflow(req.scope).run({ input: { id } })

  res.json({ id, object: "pickup_closure", deleted: true })
}
