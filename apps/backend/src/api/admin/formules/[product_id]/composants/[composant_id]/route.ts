import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateFormuleComposantWorkflow } from "../../../../../../workflows/formule/manage-composants"
import { UpdateComposantSchema } from "../../../middlewares"

// POST /admin/formules/:product_id/composants/:composant_id — edit a
// Composant's label or rank. `key` cannot be changed here: it is immutable
// once created (ADR 0005) — see CreateComposantSchema/UpdateComposantSchema.
export async function POST(
  req: MedusaRequest<UpdateComposantSchema>,
  res: MedusaResponse
) {
  const { composant_id } = req.params

  const { result } = await updateFormuleComposantWorkflow(req.scope).run({
    input: { id: composant_id, ...req.validatedBody },
  })

  res.json({ composant: result })
}
