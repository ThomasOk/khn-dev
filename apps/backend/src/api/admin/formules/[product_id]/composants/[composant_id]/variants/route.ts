import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { setComposantVariantsWorkflow } from "../../../../../../../workflows/formule/set-composant-variants"
import { SetComposantVariantsSchema } from "../../../../middlewares"

// POST /admin/formules/:product_id/composants/:composant_id/variants — set
// the Curation of this Composant to exactly this list of Variantes (the admin
// sends the full desired set from a checkbox selection; associating and
// dissociating are the same operation, a diff against what's currently linked).
export async function POST(
  req: MedusaRequest<SetComposantVariantsSchema>,
  res: MedusaResponse
) {
  const { composant_id } = req.params

  const { result } = await setComposantVariantsWorkflow(req.scope).run({
    input: { composant_id, variant_ids: req.validatedBody.variant_ids },
  })

  res.json({ diff: result })
}
