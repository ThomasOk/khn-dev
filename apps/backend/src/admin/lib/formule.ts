// Shared shapes for the Curation widget. The wire contract is in English (see
// AGENTS.md); "Formule" and "Composant" stay untranslated on purpose (ticket
// 01-curation-module-et-administration.md, §"Correspondance des noms").

export type CuratedVariant = {
  id: string
  title: string
  product?: { title: string } | null
}

export type FormuleComposant = {
  id: string
  key: string
  label: string
  rank: number
  product_variants: CuratedVariant[]
}

export type Formule = {
  id: string
  product_id: string
  composants: FormuleComposant[]
}

// A Variante's title alone ("Bœuf") isn't enough to cook from — it's the dish
// name that disambiguates (spec: "par nom lisible", never by ID). Falls back
// to the variant title alone when the product isn't loaded on the object.
export function variantDisplayName(variant: {
  title: string
  product?: { title: string } | null
}): string {
  if (variant.product?.title) {
    return `${variant.product.title} — ${variant.title}`
  }
  return variant.title
}

export type FormuleSelectionEntry = {
  composantKey: string
  variantId: string
}

// The flat metadata key a Composant's choice is written under (ADR 0005):
// `formule_<key>_variant_id`. A client-side copy of the same pattern as
// src/lib/formule/validate-selection.ts's formuleSelectionMetadataKey — kept
// separate per the admin/lib convention of not importing outside src/admin
// (see admin/lib/pickup.ts, which mirrors the storefront's key format the
// same way rather than importing it).
const SELECTION_KEY_PATTERN = /^formule_(.+)_variant_id$/

// Turns a line item's raw metadata into the Sélection entries the order
// widget resolves against a Formule's Curation (ticket 05). Order rather
// than the underlying object's own iteration order — good enough since the
// widget re-sorts by the Composant's own rank once Curation is resolved.
export function formuleSelectionEntries(
  metadata: Record<string, unknown> | null | undefined
): FormuleSelectionEntry[] {
  if (!metadata) {
    return []
  }

  return Object.entries(metadata).flatMap(([key, value]) => {
    const match = key.match(SELECTION_KEY_PATTERN)
    if (!match || typeof value !== "string" || value.length === 0) {
      return []
    }
    return [{ composantKey: match[1], variantId: value }]
  })
}

export type ResolvedFormuleSelectionEntry = {
  composantKey: string
  label: string
  variantLabel: string
}

// Resolves the Sélection's raw ids against the Curation for display, in the
// Composants' own rank order. Falls back to the raw key/variant_id — never
// drops the entry — when Curation can't answer: a Variante can be
// un-curated from its Composant at any time (spec User Story 6, "réagir à
// une rupture de stock"), which can happen for an order already placed. A
// restaurateur must still see something to cook from, not a vanished line —
// the exact failure User Story 17 exists to prevent.
export function resolveFormuleSelectionEntries(
  entries: FormuleSelectionEntry[],
  formule: Formule | null | undefined
): ResolvedFormuleSelectionEntry[] {
  const composants = formule?.composants ?? []
  const resolved: ResolvedFormuleSelectionEntry[] = []
  const matchedKeys = new Set<string>()

  for (const composant of composants) {
    const entry = entries.find((e) => e.composantKey === composant.key)
    if (!entry) {
      continue
    }
    matchedKeys.add(entry.composantKey)
    const variant = composant.product_variants.find(
      (v) => v.id === entry.variantId
    )
    resolved.push({
      composantKey: composant.key,
      label: composant.label,
      variantLabel: variant ? variantDisplayName(variant) : entry.variantId,
    })
  }

  for (const entry of entries) {
    if (matchedKeys.has(entry.composantKey)) {
      continue
    }
    resolved.push({
      composantKey: entry.composantKey,
      label: entry.composantKey,
      variantLabel: entry.variantId,
    })
  }

  return resolved
}
