// Shared shapes for the drag & drop reordering widget on the category detail
// page (docs/specs/rang-des-produits.md, ticket 02). The wire contract is in
// English (see AGENTS.md); "Rang" and "Carte" stay untranslated in prose per
// the domain glossary.

import { HttpTypes } from "@medusajs/types"

// Mirrors apps/storefront/src/lib/util/carte-rank.ts's CARTE_RANK_KEY — kept
// as a separate client-side copy per the admin/lib convention (admin/lib/pickup.ts
// mirrors the storefront's key format the same way rather than importing
// across the app boundary).
export const CARTE_RANK_KEY = "carte_rank"

const rankOf = (product: HttpTypes.AdminProduct): number => {
  const raw = product.metadata?.[CARTE_RANK_KEY]

  return typeof raw === "number" && Number.isFinite(raw)
    ? raw
    : Number.POSITIVE_INFINITY
}

export function isUnranked(product: HttpTypes.AdminProduct): boolean {
  return !Number.isFinite(rankOf(product))
}

// Mirrors the storefront's compareByCarteRank (ADR 0014, "Le comparateur, et
// ses trois règles") closely enough for display purposes: a numeric
// carte_rank wins, ascending, and a missing or non-numeric one sorts last.
// Ties keep the array's own order — Array.prototype.sort is stable (ES2019)
// and the fetch below already orders by created_at, the storefront's own
// tie-break. This comparator is manually verified, not unit tested — the one
// seam this feature protects with a test is buildCarteRankBatchUpdate below
// (spec §"La logique d'attribution des Rangs").
export function compareByCarteRank(
  a: HttpTypes.AdminProduct,
  b: HttpTypes.AdminProduct
): number {
  const rankA = rankOf(a)
  const rankB = rankOf(b)

  if (rankA === rankB) {
    return 0
  }

  return rankA < rankB ? -1 : 1
}

export type CarteRankableProduct = {
  id: string
  metadata?: Record<string, unknown> | null
}

export type CarteRankBatchUpdate = {
  id: string
  metadata: Record<string, unknown>
}

// Turns a drag-and-dropped list into the batch update payload that rewrites
// the whole Section densely as 0…N-1 (ADR 0014, "Dense 0…N-1, rewritten
// across the Section on every drop"). A product update replaces `metadata`
// wholesale, so every other key already on the Produit must survive the
// round trip — only `carte_rank` changes.
export function buildCarteRankBatchUpdate(
  orderedProducts: CarteRankableProduct[]
): CarteRankBatchUpdate[] {
  return orderedProducts.map((product, index) => ({
    id: product.id,
    metadata: { ...(product.metadata ?? {}), [CARTE_RANK_KEY]: index },
  }))
}
