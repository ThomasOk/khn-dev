// Seam 1 of the spec (§"La validation serveur"): a PURE control, no
// database, no container — given a Formule's Curation and a submitted
// Sélection, it says valid or hands back a structured reason. Both hook call
// sites (src/workflows/hooks/cart-line-items.ts,
// src/workflows/hooks/complete-cart.ts) resolve the Curation from the
// database and then defer the actual judgment call to this function, so the
// judgment itself stays testable without a Postgres instance.

export type FormuleComposantCuration = {
  key: string
  label: string
  // The Variante ids curated for THIS Composant specifically — not "any
  // Composant of the Formule". Checking membership in the wrong list is
  // exactly the margin-losing bug this control exists to close (ADR 0001).
  curatedVariantIds: string[]
}

export type FormuleCuration = {
  composants: FormuleComposantCuration[]
}

export type SelectionRejection =
  // The line's Variante isn't a Formule at all, yet its metadata carries a
  // Sélection key — a Sélection has no meaning without a Curation to check
  // it against.
  | { code: "not_a_formule" }
  // A Composant of this Formule has no matching Sélection key, or its value
  // isn't a non-empty string.
  | { code: "missing_composant"; composant: FormuleComposantCuration }
  // A Sélection key doesn't correspond to any Composant of this Formule.
  | { code: "unknown_key"; key: string }
  // The chosen Variante isn't curated for the Composant it was submitted
  // for — it may still be curated for a DIFFERENT Composant of the same
  // Formule, which is precisely what makes this check necessary.
  | {
      code: "variant_not_curated"
      composant: FormuleComposantCuration
      variantId: string
    }

export type SelectionValidation =
  | { valid: true }
  | { valid: false; rejection: SelectionRejection }

// Exported so resolve-selection-entries.ts (same module, no admin/storefront
// boundary to respect here) can parse the same metadata shape without a
// second copy of this pattern.
export const SELECTION_KEY_PATTERN = /^formule_(.+)_variant_id$/

// The flat metadata key a Composant's choice is written under (ADR 0005).
// Named once so this control and the two hooks that call it can't drift
// apart from the storefront's own formuleSelectionKey under a rename.
export function formuleSelectionMetadataKey(composantKey: string): string {
  return `formule_${composantKey}_variant_id`
}

function selectionKeysIn(
  metadata: Record<string, unknown> | null | undefined
): string[] {
  if (!metadata) {
    return []
  }
  return Object.keys(metadata).filter((key) => SELECTION_KEY_PATTERN.test(key))
}

export function validateFormuleSelection(
  curation: FormuleCuration | null,
  metadata: Record<string, unknown> | null | undefined
): SelectionValidation {
  const presentKeys = selectionKeysIn(metadata)

  if (!curation) {
    if (presentKeys.length === 0) {
      return { valid: true }
    }
    return { valid: false, rejection: { code: "not_a_formule" } }
  }

  const composantKeys = new Set(curation.composants.map((c) => c.key))
  const unknownKey = presentKeys.find((key) => {
    const match = key.match(SELECTION_KEY_PATTERN)
    return !match || !composantKeys.has(match[1])
  })
  if (unknownKey) {
    return { valid: false, rejection: { code: "unknown_key", key: unknownKey } }
  }

  for (const composant of curation.composants) {
    const value = metadata?.[formuleSelectionMetadataKey(composant.key)]

    if (typeof value !== "string" || value.length === 0) {
      return { valid: false, rejection: { code: "missing_composant", composant } }
    }

    if (!composant.curatedVariantIds.includes(value)) {
      return {
        valid: false,
        rejection: { code: "variant_not_curated", composant, variantId: value },
      }
    }
  }

  return { valid: true }
}
