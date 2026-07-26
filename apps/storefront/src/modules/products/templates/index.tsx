import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import RelatedProducts from "@modules/products/components/related-products"
import ProductInfo from "@modules/products/templates/product-info"
import ShowcaseNotice from "@modules/showcase/components/showcase-notice"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import ProductActionsWrapper from "./product-actions-wrapper"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
  orderPossible: boolean
  showcaseNote: string | null
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
  orderPossible,
  showcaseNote,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  return (
    <div className="bg-[#F7F3F0]">
      <div
        className="content-container flex flex-col small:flex-row small:justify-center gap-x-10 gap-y-6 pt-24 pb-10"
        data-testid="product-container"
      >
        <div className="w-full small:w-[320px] shrink-0">
          <ImageGallery images={images} />
        </div>
        <div className="flex flex-col gap-y-6 w-full small:max-w-[420px]">
          <ProductInfo product={product} />
          <ProductOnboardingCta />
          {showcaseNote && <ShowcaseNotice note={showcaseNote} />}
          {orderPossible && (
            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                  showPrice={false}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
          )}
        </div>
      </div>
      <div
        className="content-container my-16 small:my-32"
        data-testid="related-products-container"
      >
        <Suspense fallback={<SkeletonRelatedProducts />}>
          <RelatedProducts product={product} countryCode={countryCode} />
        </Suspense>
      </div>
    </div>
  )
}

export default ProductTemplate
