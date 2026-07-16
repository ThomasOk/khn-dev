import { getFormule } from "@lib/data/formules"
import { listProducts } from "@lib/data/products"
import { HttpTypes } from "@medusajs/types"
import FormuleActions from "@modules/products/components/formule-actions"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 * A Formule Produit (ticket 01's Curation exists for it) renders the
 * Composant selector instead of the ordinary variant/option picker.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const product = await listProducts({
    queryParams: { id: [id] },
    regionId: region.id,
  }).then(({ response }) => response.products[0])

  if (!product) {
    return null
  }

  const formule = await getFormule(id, region.id)

  if (formule) {
    return <FormuleActions product={product} composants={formule.composants} />
  }

  return <ProductActions product={product} region={region} />
}
