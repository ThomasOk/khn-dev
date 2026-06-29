import { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  categories,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  categories?: HttpTypes.StoreProductCategory[]
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"
  const rootCategories = categories?.filter((c) => !c.parent_category) ?? []

  return (
    <div
      className="flex flex-col py-6 mt-16 content-container"
      data-testid="category-container"
    >
      <h1 className="text-2xl font-normal mb-5 text-neutral-900" data-testid="store-page-title">
        La carte
      </h1>
      {rootCategories.length > 0 && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          <LocalizedClientLink
            href="/store"
            className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium bg-orange-600 text-white pointer-events-none"
          >
            Tous
          </LocalizedClientLink>
          {rootCategories.map((cat) => (
            <LocalizedClientLink
              key={cat.id}
              href={`/categories/${cat.handle}`}
              className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border border-neutral-200 text-neutral-700 transition-colors duration-150 [@media(hover:hover)]:hover:border-orange-300 [@media(hover:hover)]:hover:text-orange-600"
            >
              {cat.name}
            </LocalizedClientLink>
          ))}
        </div>
      )}
      <Suspense fallback={<SkeletonProductGrid />}>
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          countryCode={countryCode}
        />
      </Suspense>
    </div>
  )
}

export default StoreTemplate
