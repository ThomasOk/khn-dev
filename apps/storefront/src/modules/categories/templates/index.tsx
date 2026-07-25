import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import PaginatedProducts from "@modules/store/templates/paginated-products"
import DineInMenuBanner from "@modules/store/components/dine-in-menu-banner"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

export default function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  allCategories,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  allCategories?: HttpTypes.StoreProductCategory[]
}) {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  if (!category || !countryCode) notFound()

  const parents = [] as HttpTypes.StoreProductCategory[]
  const getParents = (cat: HttpTypes.StoreProductCategory) => {
    if (cat.parent_category) {
      parents.push(cat.parent_category)
      getParents(cat.parent_category)
    }
  }
  getParents(category)

  const rootCategories = allCategories?.filter((c) => !c.parent_category) ?? []

  return (
    <div
      className="flex flex-col py-6 mt-16 content-container"
      data-testid="category-container"
    >
      <h1
        className="text-2xl font-normal mb-5 text-neutral-900"
        data-testid="category-page-title"
      >
        {category.name}
      </h1>

      {category.description && (
        <p className="mb-5 text-neutral-600 text-sm">{category.description}</p>
      )}

      <DineInMenuBanner />

      {rootCategories.length > 0 && (
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          <LocalizedClientLink
            href="/store"
            className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium border border-neutral-200 text-neutral-700 transition-colors duration-150 [@media(hover:hover)]:hover:border-khn-gold [@media(hover:hover)]:hover:text-khn-gold"
          >
            Tous
          </LocalizedClientLink>
          {rootCategories.map((cat) => {
            const isActive =
              cat.handle === category.handle ||
              parents.some((p) => p.handle === cat.handle)
            return (
              <LocalizedClientLink
                key={cat.id}
                href={`/categories/${cat.handle}`}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? "bg-khn-gold text-stone-900 pointer-events-none"
                    : "border border-neutral-200 text-neutral-700 [@media(hover:hover)]:hover:border-khn-gold [@media(hover:hover)]:hover:text-khn-gold"
                }`}
              >
                {cat.name}
              </LocalizedClientLink>
            )
          })}
        </div>
      )}

      {category.category_children && category.category_children.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {category.category_children.map((c) => (
            <LocalizedClientLink
              key={c.id}
              href={`/categories/${c.handle}`}
              className="text-sm text-neutral-500 transition-colors duration-150 [@media(hover:hover)]:hover:text-khn-gold"
            >
              {c.name}
            </LocalizedClientLink>
          ))}
        </div>
      )}

      <Suspense
        fallback={
          <SkeletonProductGrid
            numberOfProducts={category.products?.length ?? 8}
          />
        }
      >
        <PaginatedProducts
          sortBy={sort}
          page={pageNumber}
          categoryId={category.id}
          countryCode={countryCode}
        />
      </Suspense>
    </div>
  )
}
