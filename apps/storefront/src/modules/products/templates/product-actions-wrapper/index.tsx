import { getFormule } from "@lib/data/formules"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import FormuleActions from "@modules/products/components/formule-actions"
import ProductActions from "@modules/products/components/product-actions"

// Only the dedicated product page uses this wrapper: it has an id and must
// load the Produit for its own account. A Carte card already has the Produit
// the page loaded for it (docs/specs/commande-depuis-la-page-carte.md, "Les
// cartes consomment le Produit déjà chargé") and resolves its own Curation
// directly (CarteProductCard), so it renders FormuleActions/ProductActions
// without going through this wrapper at all.
type ProductActionsWrapperProps = {
  id: string
  region: HttpTypes.StoreRegion
}

/**
 * Fetches real time pricing for a product and renders the product actions component.
 * A Formule Produit (ticket 01's Curation exists for it) renders the
 * Composant selector instead of the ordinary variant/option picker.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: ProductActionsWrapperProps) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const formule = await getFormule(product.id, region.id)

  if (formule) {
    return <FormuleActions product={product} composants={formule.composants} />
  }

  return <ProductActions product={product} region={region} />
}
