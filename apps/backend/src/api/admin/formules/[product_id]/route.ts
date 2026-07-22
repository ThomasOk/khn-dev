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
      "composants.product_variants.options.option_id",
      "composants.product_variants.options.value",
      "composants.product_variants.options.option.title",
    ],
    filters: { product_id },
  })

  const formule = data[0]
  if (!formule) {
    return res.json({ formule: null })
  }

  // `options` is flattened here (option_id/option_title/value), not the
  // query-graph's nested `option: { title }` shape, the same wire contract
  // as the store route (src/api/store/formules/[product_id]/route.ts) —
  // variantDisplayName (admin/lib/formule.ts) reads it to spell out each
  // Option instead of trusting a Variante's flattened title's word order.
  const composants = [...formule.composants]
    .sort((a, b) => (a?.rank ?? 0) - (b?.rank ?? 0))
    .map((composant) => ({
      id: composant!.id,
      key: composant!.key,
      label: composant!.label,
      rank: composant!.rank,
      product_variants: (composant!.product_variants ?? []).map((variant) => ({
        id: variant!.id,
        title: variant!.title,
        product: variant!.product ? { title: variant!.product.title } : null,
        options: (variant!.options ?? []).map((option) => ({
          option_id: option!.option_id as string,
          option_title: option!.option?.title ?? "",
          value: option!.value,
        })),
      })),
    }))

  res.json({
    formule: {
      id: formule.id,
      product_id: formule.product_id,
      composants,
    },
  })
}
