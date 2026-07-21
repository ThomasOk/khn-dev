import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import Thumbnail from "@modules/products/components/thumbnail"
import ProductActions from "@modules/products/components/product-actions"

// The ordinary-Produit half of the Carte's two card presentations
// (docs/specs/commande-depuis-la-page-carte.md, "Deux présentations de
// carte"): image and title carry the choice, exactly like ProductPreview,
// plus the shared Variante selector and add-to-cart. Only the image/title
// stay inside the link — the action zone never does (ticket 03).
export default function CartePlatCard({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) {
  return (
    <div className="flex flex-col gap-y-3" data-testid="carte-product-card">
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        className="group"
      >
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
        />
        <Text
          className="mt-3 font-medium text-neutral-900 text-sm leading-snug"
          data-testid="carte-product-title"
        >
          {product.title}
        </Text>
      </LocalizedClientLink>
      <ProductActions
        product={product}
        region={region}
        syncVariantWithUrl={false}
        showMobileActions={false}
      />
    </div>
  )
}
