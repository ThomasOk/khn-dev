import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createFormuleWorkflow } from "../../../workflows/formule/manage-formule"
import { CreateFormuleSchema } from "./middlewares"

// POST /admin/formules — mark a Produit as a Formule. This is the row whose
// existence the widget on the product page checks for (spec §"Un modèle
// Formule explicite"): being a Formule is decided explicitly here, never
// derived from a Produit having Composants.
export async function POST(
  req: MedusaRequest<CreateFormuleSchema>,
  res: MedusaResponse
) {
  const { result } = await createFormuleWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ formule: result })
}
