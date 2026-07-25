import { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"

import { Heading } from "@modules/common/components/ui"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import CarteCartBar from "@modules/store/components/carte-cart-bar"
import CarteCartColumn from "@modules/store/components/carte-cart-column"
import CarteHero from "@modules/store/components/carte-hero"
import CarteSection from "@modules/store/components/carte-section"
import CarteSectionNav from "@modules/store/components/carte-section-nav"
import { CARTE_NAV_OFFSET } from "@modules/store/components/carte-section-nav/constants"
import DineInMenuBanner from "@modules/store/components/dine-in-menu-banner"

const CarteCartColumnFallback = () => (
  <div className="flex flex-col gap-y-6 bg-white">
    <Heading
      level="h2"
      className="font-display text-2xl uppercase tracking-[0.06em] text-neutral-900"
    >
      Votre panier
    </Heading>
  </div>
)

// Keeps the bar's fixed footprint present from first paint, so it doesn't pop
// in only once the cart fetch resolves (User Story 26: "toujours visible").
const CarteCartBarFallback = () => (
  <div className="small:hidden fixed inset-x-0 bottom-0 z-40 h-14 bg-neutral-900" />
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
    <div className="bg-[#F7F3F0]">
      <CarteHero />
      <div
        className="flex flex-col py-6 content-container"
        data-testid="category-container"
      >
        <DineInMenuBanner />
        <CarteSectionNav categories={rootCategories} />
        <div className="grid grid-cols-1 small:grid-cols-[1fr_360px] gap-x-10">
          <div className="flex flex-col gap-16 mt-8 pb-20 small:pb-0">
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
            {/* Stacked under the fixed main nav, CarteSectionNav's own
                sticky bar, and the announcement/cart-mismatch banner when
                present (all already pinned by the time this scrolls into
                view) — top and max-h share CARTE_NAV_OFFSET with that bar's
                scrollMarginTop so the cart starts right below it instead of
                sliding underneath. */}
            <div
              className="sticky overflow-y-auto mt-8 py-6 px-6 bg-white border border-neutral-200 shadow-sm"
              style={{
                top: CARTE_NAV_OFFSET,
                maxHeight: `calc(100vh - ${CARTE_NAV_OFFSET})`,
              }}
            >
              <Suspense fallback={<CarteCartColumnFallback />}>
                <CarteCartColumn />
              </Suspense>
            </div>
          </div>
        </div>
        <Suspense fallback={<CarteCartBarFallback />}>
          <CarteCartBar countryCode={countryCode} />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
