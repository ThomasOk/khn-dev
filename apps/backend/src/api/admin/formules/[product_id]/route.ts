import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/formules/:product_id — the Curation screen's single display
// query: the Formule (if this Produit is one), its Composants ordered by
// rank, and — per Composant — the Variantes curated into it, by name. `null`
// when the Produit isn't a Formule: this is a normal state for the widget,
// not an error, so it's a 200 rather than a 404.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data } = await query.graph({
    entity: "formule",
    fields: [
      "id",
      "product_id",
      "composants.id",
      "composants.key",
      "composants.label",
      "composants.rank",
      "composants.product_variants.id",
      "composants.product_variants.title",
      "composants.product_variants.product.title",
    ],
    filters: { product_id },
  })

  const formule = data[0]
  if (!formule) {
    return res.json({ formule: null })
  }

  const composants = [...formule.composants].sort(
    (a, b) => (a?.rank ?? 0) - (b?.rank ?? 0)
  )

  res.json({
    formule: {
      id: formule.id,
      product_id: formule.product_id,
      composants,
    },
  })
}
