import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { FormuleCuration } from "./validate-selection"

export type ResolvedFormuleCuration = FormuleCuration & {
  productId: string
  productTitle: string
}

// Resolves the same projection as GET /store/formules/:product_id
// (src/api/store/formules/[product_id]/route.ts), but keyed off a
// variant_id — all a cart line item ever carries — because that's what both
// hook call sites (add-to-cart / update-line-item, complete-cart) have on
// hand. Returns null when the Variante's Produit isn't a Formule: the
// ordinary case for most line items, not an error.
export async function getFormuleCurationForVariant(
  container: MedusaContainer,
  variantId: string
): Promise<ResolvedFormuleCuration | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: variants } = await query.graph({
    entity: "variant",
    fields: ["id", "product_id"],
    filters: { id: variantId },
  })
  const productId = variants[0]?.product_id
  if (!productId) {
    return null
  }

  const { data: formules } = await query.graph({
    entity: "formule",
    fields: [
      "id",
      "product_id",
      "composants.key",
      "composants.label",
      "composants.product_variants.id",
    ],
    filters: { product_id: productId },
  })
  const formule = formules[0]
  if (!formule) {
    return null
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title"],
    filters: { id: productId },
  })

  return {
    productId,
    productTitle: products[0]?.title ?? productId,
    composants: formule.composants.map((composant) => ({
      key: composant!.key,
      label: composant!.label,
      curatedVariantIds: (composant!.product_variants ?? []).map(
        (variant) => variant!.id
      ),
    })),
  }
}
