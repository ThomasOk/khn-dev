import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createFormuleComposantWorkflow } from "../../../../../workflows/formule/manage-composants"
import { CreateComposantSchema } from "../../middlewares"

// GET /admin/formules/:product_id/composants — list this Formule's Composants,
// ordered by rank. The widget uses the parent GET /admin/formules/:product_id
// (which embeds this same list plus curated Variantes) as its display query;
// this route exists so "list the Composants of a Formule" is its own resource.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "formule",
    fields: ["composants.id", "composants.key", "composants.label", "composants.rank"],
    filters: { product_id },
  })

  const composants = [...(data[0]?.composants ?? [])].sort(
    (a, b) => (a?.rank ?? 0) - (b?.rank ?? 0)
  )

  res.json({ composants })
}

// POST /admin/formules/:product_id/composants — add a slot ("Entrée", "Plat")
// to this Formule. Resolving product_id -> Formule and validating it exists
// happens inside the workflow step, not here (AGENTS.md: business logic goes
// in a Workflow, not ad-hoc service calls in a route).
export async function POST(
  req: MedusaRequest<CreateComposantSchema>,
  res: MedusaResponse
) {
  const { product_id } = req.params

  const { result } = await createFormuleComposantWorkflow(req.scope).run({
    input: { product_id, ...req.validatedBody },
  })

  res.status(201).json({ composant: result })
}
