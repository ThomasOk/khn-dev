import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { FormuleComposantCuration } from "./validate-selection"

// A curated Variante's readable name, for the Ticket cuisine: a cuisinier
// doesn't prepare a `variant_01H…`. Server-side pendant of admin/lib/
// formule.ts's variantDisplayName — not an import, per the admin/lib
// convention of not reaching outside src/admin (admin/lib/pickup.ts mirrors
// the storefront's key format the same way rather than importing it).
export type CuratedVariantName = {
  id: string
  name: string
}

// Adds the Composant's rank and each curated Variante's readable name on top
// of the membership-only shape validateFormuleSelection needs (Seam 1) — the
// Ticket cuisine (ticket 05) must display the Sélection in rank order with
// readable names, not just judge it.
export type ResolvedFormuleComposantCuration = FormuleComposantCuration & {
  rank: number
  curatedVariants: CuratedVariantName[]
}

export type ResolvedFormuleCuration = {
  productId: string
  productTitle: string
  composants: ResolvedFormuleComposantCuration[]
}

// Medusa auto-names the sole Variante of a Produit with no real Options
// "Default variant" (every Formule, and every single-Variante dish, hits
// this) — a label with no meaning to the kitchen, so it's suppressed rather
// than printed as if it distinguished anything. Same constant as the
// storefront's own line-item-options component and admin/lib/formule.ts.
const DEFAULT_VARIANT_TITLE = "Default variant"

// A flattened `title` ("Porc / Crevettes") only reads as two Option values in
// *position* order — nothing on a Ticket cuisine says which slash-separated
// word answers "Choix Nems" versus "Choix Banh Sung". Once a Variante has
// more than one Option, spell out `option_title: value` pairs instead of
// trusting the cuisinier to know the Produit's Option order by heart. Same
// layering as admin/lib/formule.ts's variantDisplayName and
// src/api/store/formules/[product_id]/route.ts's curatedVariantTitle.
function curatedVariantName(variant: {
  title: string
  product?: { title: string } | null
  options?: { value: string; option?: { title: string } | null }[]
}): string {
  const detail =
    variant.options && variant.options.length > 1
      ? variant.options
          .map((o) => `${o.option?.title ?? ""}: ${o.value}`)
          .join(", ")
      : variant.title

  const hasMeaningfulDetail = detail !== DEFAULT_VARIANT_TITLE

  if (hasMeaningfulDetail && variant.product?.title) {
    return `${variant.product.title} — ${detail}`
  }
  return variant.product?.title ?? detail
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
      "composants.rank",
      "composants.product_variants.id",
      "composants.product_variants.title",
      "composants.product_variants.product.title",
      "composants.product_variants.options.value",
      "composants.product_variants.options.option.title",
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
      rank: composant!.rank,
      curatedVariantIds: (composant!.product_variants ?? []).map(
        (variant) => variant!.id
      ),
      curatedVariants: (composant!.product_variants ?? []).map((variant) => ({
        id: variant!.id,
        name: curatedVariantName(variant!),
      })),
    })),
  }
}
