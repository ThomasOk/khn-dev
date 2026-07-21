import type { HttpTypes } from "@medusajs/types"

// A Carte section is a root category, but the Produits it must list also
// live in that category's descendants (docs/specs/commande-depuis-la-page-
// carte.md, "Les sections sont les catégories racines"). Built from the
// flat category list the Store API already returns — every category, at
// any depth, appears once in it with its own parent_category_id — so this
// walks parent → children without depending on how deep `listCategories`'
// own `category_children` field expansion goes.
export function collectCategoryIdsWithDescendants(
  categories: HttpTypes.StoreProductCategory[],
  rootCategoryId: string
): string[] {
  const childIdsByParentId = new Map<string, string[]>()

  for (const category of categories) {
    if (!category.parent_category_id) {
      continue
    }

    const siblingIds = childIdsByParentId.get(category.parent_category_id) ?? []
    siblingIds.push(category.id)
    childIdsByParentId.set(category.parent_category_id, siblingIds)
  }

  const ids: string[] = []
  const queue = [rootCategoryId]

  while (queue.length > 0) {
    const id = queue.shift()!
    ids.push(id)
    queue.push(...(childIdsByParentId.get(id) ?? []))
  }

  return ids
}
