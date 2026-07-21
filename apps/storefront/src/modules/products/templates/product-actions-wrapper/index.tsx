import { getFormule } from "@lib/data/formules"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import FormuleActions from "@modules/products/components/formule-actions"
import ProductActions from "@modules/products/components/product-actions"

// The dedicated product page only has an id and must load the Produit for
// its own account. A Carte card already has the Produit the page loaded for
// it — with the calculated prices and stock quantities the selector needs —
// and passes it directly to skip that second round trip (docs/specs/
// commande-depuis-la-page-carte.md, "Les cartes consomment le Produit déjà
// chargé"). Either way, the Curation lookup below still runs per Produit.
type ProductActionsWrapperProps = {
  region: HttpTypes.StoreRegion
  syncVariantWithUrl?: boolean
  showMobileActions?: boolean
} & (
  | { id: string; product?: never }
  | { id?: never; product: HttpTypes.StoreProduct }
)

/**
 * Fetches real time pricing for a product and renders the product actions component.
 * A Formule Produit (ticket 01's Curation exists for it) renders the
 * Composant selector instead of the ordinary variant/option picker.
 */
export default async function ProductActionsWrapper({
  id,
  product: preloadedProduct,
  region,
  syncVariantWithUrl,
  showMobileActions,
}: ProductActionsWrapperProps) {
  const product =
    preloadedProduct ??
    (await listProducts({
      queryParams: { id: [id!] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]))

  if (!product) {
    return null
  }

  const formule = await getFormule(product.id, region.id)

  if (formule) {
    return <FormuleActions product={product} composants={formule.composants} />
  }

  return (
    <ProductActions
      product={product}
      region={region}
      syncVariantWithUrl={syncVariantWithUrl}
      showMobileActions={showMobileActions}
    />
  )
}
