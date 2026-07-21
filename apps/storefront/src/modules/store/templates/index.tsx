import { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"

import { Heading } from "@modules/common/components/ui"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import CarteCartColumn from "@modules/store/components/carte-cart-column"
import CarteSection from "@modules/store/components/carte-section"
import CarteSectionNav from "@modules/store/components/carte-section-nav"
import DineInMenuBanner from "@modules/store/components/dine-in-menu-banner"

const CarteCartColumnFallback = () => (
  <div className="flex flex-col gap-y-6 bg-white">
    <Heading level="h2" className="text-2xl font-normal text-neutral-900">
      Votre panier
    </Heading>
  </div>
)

const StoreTemplate = ({
  countryCode,
  categories,
}: {
  countryCode: string
  categories?: HttpTypes.StoreProductCategory[]
}) => {
  const rootCategories = (categories ?? [])
    .filter((c) => !c.parent_category_id)
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))

  return (
    <div
      className="flex flex-col py-6 mt-16 content-container"
      data-testid="category-container"
    >
      <h1 className="text-2xl font-normal mb-5 text-neutral-900" data-testid="store-page-title">
        La carte
      </h1>
      <DineInMenuBanner />
      <CarteSectionNav categories={rootCategories} />
      <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-10">
        <div className="flex flex-col gap-16 mt-8">
          {rootCategories.map((category) => (
            <Suspense key={category.id} fallback={<SkeletonProductGrid />}>
              <CarteSection
                category={category}
                categories={categories ?? []}
                countryCode={countryCode}
              />
            </Suspense>
          ))}
        </div>
        <div className="hidden small:block">
          <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto mt-8 py-6 px-6 border border-neutral-200 rounded-md">
            <Suspense fallback={<CarteCartColumnFallback />}>
              <CarteCartColumn />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StoreTemplate
