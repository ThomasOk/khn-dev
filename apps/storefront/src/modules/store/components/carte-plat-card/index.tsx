import { HttpTypes } from "@medusajs/types"

import { getProductPrice } from "@lib/util/get-product-price"
import { Text } from "@modules/common/components/ui"
import ProductActions from "@modules/products/components/product-actions"
import ProductImageZoom from "./product-image-zoom"

// The ordinary-Produit half of the Carte's two card presentations
// (docs/specs/commande-depuis-la-page-carte.md, "Deux présentations de
// carte"): image and title carry the choice, exactly like ProductPreview,
// plus the shared Variante selector and add-to-cart. The image no longer
// links to the product page — clicking it opens a zoom instead
// (ProductImageZoom); the title is plain text.
export default function CartePlatCard({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({ product })

  return (
    <div
      className="flex flex-col gap-y-4 h-full bg-white"
      data-testid="carte-product-card"
    >
      <ProductImageZoom
        thumbnail={product.thumbnail}
        images={product.images}
        title={product.title}
      />
      {/* flex-1 lets this block grow with the row's tallest card, so the
          mt-auto below pins the select+button to the same bottom edge
          across every card in the row, whatever the title/description
          length. */}
      <div className="flex flex-col gap-y-3 flex-1 px-6 pb-6">
        <div className="flex items-start justify-between gap-x-4">
          <Text
            as="span"
            className="font-display font-semibold text-lg uppercase tracking-wide text-stone-900 line-clamp-2 min-h-[3.5rem]"
            data-testid="carte-product-title"
          >
            {product.title}
          </Text>
          {cheapestPrice && (
            <Text
              as="span"
              className="font-lato text-base text-stone-900 whitespace-nowrap"
              data-testid="carte-product-price"
            >
              {cheapestPrice.calculated_price}
            </Text>
          )}
        </div>
        {product.description && (
          <Text className="text-sm text-stone-600 leading-relaxed">
            {product.description}
          </Text>
        )}
        <div className="mt-auto pt-1">
          <ProductActions
            product={product}
            region={region}
            syncVariantWithUrl={false}
            showMobileActions={false}
            showPrice={false}
            buttonClassName="!rounded-base"
          />
        </div>
      </div>
    </div>
  )
}
