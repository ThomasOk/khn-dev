import { HttpTypes } from "@medusajs/types"

import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { sortByCarteRank } from "@lib/util/carte-rank"
import { collectCategoryIdsWithDescendants } from "@lib/util/category-tree"
import { Heading } from "@modules/common/components/ui"
import CarteProductCard from "@modules/store/components/carte-product-card"
import { CARTE_NAV_OFFSET } from "@modules/store/components/carte-section-nav/constants"

// One section of the Carte per root category (docs/specs/commande-depuis-
// la-page-carte.md, "Les sections sont les catégories racines"). Products
// are fetched once here, with the descendant categories rolled up and
// deduplicated by the Store API's own category_id filter, and handed
// straight to each card — no card ever loads its own Produit.
export default async function CarteSection({
  category,
  categories,
  countryCode,
  orderPossible,
}: {
  category: HttpTypes.StoreProductCategory
  categories: HttpTypes.StoreProductCategory[]
  countryCode: string
  orderPossible: boolean
}) {
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  const categoryIds = collectCategoryIdsWithDescendants(categories, category.id)

  // No pagination (docs/specs/commande-depuis-la-page-carte.md, "La Carte ne
  // pagine pas") — the 100-item ceiling is the same "fetch everything" limit
  // listProductsWithSort already relies on, sized for a Carte the spec itself
  // scopes to "dizaines de Produits" per section, not hundreds.
  const {
    response: { products },
  } = await listProducts({
    countryCode,
    queryParams: { category_id: categoryIds, limit: 100 },
  })

  if (products.length === 0) {
    return null
  }

  // The section obeys the Rang, through the same comparator the category
  // pages call (docs/specs/rang-des-produits.md, "Un seul comparateur pour
  // les deux surfaces"). Sorted here rather than asked of the server: the
  // whole section is already loaded, and Medusa cannot order on a metadata
  // key (ADR 0014).
  const sortedProducts = sortByCarteRank(products)

  return (
    // scrollMarginTop clears the fixed main nav, the sticky section nav, and
    // the announcement/cart-mismatch banner when present (docs/specs/
    // commande-depuis-la-page-carte.md, "compenser la hauteur de la barre")
    // so a jump never lands with the title hidden. Shares CARTE_NAV_OFFSET
    // with CarteSectionNav's scrollspy so the combined height is only ever
    // defined in one place.
    <section
      id={category.handle}
      style={{ scrollMarginTop: CARTE_NAV_OFFSET }}
      data-testid="carte-section"
    >
      <Heading level="h2" className="mb-6 text-neutral-900">
        {category.name}
      </Heading>
      <ul
        className="grid grid-cols-1 w-full xsmall:grid-cols-2 medium:grid-cols-3 gap-x-6 gap-y-10"
        data-testid="carte-section-products"
      >
        {sortedProducts.map((product) => (
          <li key={product.id}>
            <CarteProductCard
              product={product}
              region={region}
              orderPossible={orderPossible}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
