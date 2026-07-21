import { HttpTypes } from "@medusajs/types"

import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { collectCategoryIdsWithDescendants } from "@lib/util/category-tree"
import { Heading } from "@modules/common/components/ui"
import CarteProductCard from "@modules/store/components/carte-product-card"

// One section of the Carte per root category (docs/specs/commande-depuis-
// la-page-carte.md, "Les sections sont les catégories racines"). Products
// are fetched once here, with the descendant categories rolled up and
// deduplicated by the Store API's own category_id filter, and handed
// straight to each card — no card ever loads its own Produit.
export default async function CarteSection({
  category,
  categories,
  countryCode,
}: {
  category: HttpTypes.StoreProductCategory
  categories: HttpTypes.StoreProductCategory[]
  countryCode: string
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

  return (
    <section id={category.handle} data-testid="carte-section">
      <Heading level="h2" className="mb-6 text-neutral-900">
        {category.name}
      </Heading>
      <ul
        className="grid grid-cols-2 w-full small:grid-cols-3 gap-x-6 gap-y-10"
        data-testid="carte-section-products"
      >
        {products.map((product) => (
          <li key={product.id}>
            <CarteProductCard product={product} region={region} />
          </li>
        ))}
      </ul>
    </section>
  )
}
