import { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import Thumbnail from "@modules/products/components/thumbnail"
import ProductActionsWrapper from "@modules/products/templates/product-actions-wrapper"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"

// The Carte's card, distinct from ProductPreview: that one wraps its whole
// content in a link to the product page, which breaks the moment a card
// also carries a Variante selector and an add-to-cart button — opening a
// dropdown would also navigate (docs/specs/commande-depuis-la-page-carte.md,
// "La carte n'est plus un lien qui enveloppe tout son contenu"). Here only
// the image and title are inside the link; the action zone never is.
export default function CarteProductCard({
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
      <Suspense fallback={<SkeletonCardDetails />}>
        <ProductActionsWrapper
          product={product}
          region={region}
          syncVariantWithUrl={false}
          showMobileActions={false}
        />
      </Suspense>
    </div>
  )
}
