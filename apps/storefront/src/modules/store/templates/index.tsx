import { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import CarteSection from "@modules/store/components/carte-section"
import CarteSectionNav from "@modules/store/components/carte-section-nav"
import DineInMenuBanner from "@modules/store/components/dine-in-menu-banner"

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
    </div>
  )
}

export default StoreTemplate
