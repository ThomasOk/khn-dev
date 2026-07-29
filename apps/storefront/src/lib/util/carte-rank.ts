import { HttpTypes } from "@medusajs/types"

// The Rang is one number per Produit, stored under a domain-prefixed key in
// the shared, schema-less `product.metadata` bag (docs/adr/0014-carte-rank-in-
// product-metadata.md).
export const CARTE_RANK_KEY = "carte_rank"

/**
 * Three rules, and they are the contract (docs/specs/rang-des-produits.md,
 * "Le comparateur, et ses trois règles"):
 *
 * - a numeric `carte_rank` wins, ascending;
 * - a missing *or non-numeric* one is treated as absent and sorts last, so a
 *   value typed by hand into the admin's raw metadata form degrades one dish
 *   instead of shuffling the section around it;
 * - equal Rangs tie-break on `created_at`, "the order that governs today".
 *
 * That third rule is deliberately not "sort by created_at ascending" or
 * "descending" here: the Carte and the category pages disagreed on that
 * direction before this comparator existed (the Carte rendered the Store
 * API's own order, ascending; category pages re-sorted to newest-first) and
 * still do. Picking one direction in the comparator would make it a no-op
 * for one surface and a regression for the other. Instead this returns 0 for
 * a tie and lets `Array.prototype.sort`'s guaranteed stability (ES2019)
 * leave tied Produits exactly where the caller's fetch already put them —
 * each surface keeps departaging on `created_at` the way it already did,
 * because that's the order it fetched in.
 */
const rankOf = (product: HttpTypes.StoreProduct): number => {
  const raw = product.metadata?.[CARTE_RANK_KEY]

  return typeof raw === "number" && Number.isFinite(raw)
    ? raw
    : Number.POSITIVE_INFINITY
}

export function compareByCarteRank(
  a: HttpTypes.StoreProduct,
  b: HttpTypes.StoreProduct
): number {
  const rankA = rankOf(a)
  const rankB = rankOf(b)

  // Compared rather than subtracted: two unranked Produits would otherwise
  // give Infinity - Infinity = NaN, which sort() reads as "leave them alone"
  // — which is the outcome we want here anyway, but only by accident, so
  // it's spelled out instead.
  if (rankA === rankB) {
    return 0
  }

  return rankA < rankB ? -1 : 1
}

/**
 * The single sort shared by the Carte and the category pages, applied in
 * memory after loading — `order=metadata.carte_rank` is not an option, Medusa
 * splits an order string on `.` and reads `metadata` as a relation (ADR 0014).
 * Both surfaces already fetch everything they render before rendering it, so
 * this adds no round-trip.
 */
export function sortByCarteRank(
  products: HttpTypes.StoreProduct[]
): HttpTypes.StoreProduct[] {
  return [...products].sort(compareByCarteRank)
}
