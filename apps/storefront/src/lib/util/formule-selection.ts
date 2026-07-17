import type { FormuleComposant } from "@lib/data/formules"

export type FormuleSelectionEntry = {
  label: string
  variantTitle: string
}

// The query-param key the payment step's redirect and the cart page's
// recovery banner must agree on. Named once for the same reason as
// PICKUP_SLOT_ERROR_PARAM (lib/util/pickup-slot.ts).
export const FORMULE_SELECTION_ERROR_PARAM = "formule_selection_error"

// Must match FORMULE_SELECTION_INVALID_CODE in apps/backend/src/lib/formule/
// assert-valid-selection.ts — the `code` MedusaError carries end to end for
// a rejected Sélection (completeCartWorkflow.hooks.validate, extended
// there). Matching on this stable code, not on the free-form `message` text,
// is how the storefront tells a rejected Sélection apart from any other
// completion failure without the two apps sharing more than one string.
const FORMULE_SELECTION_INVALID_CODE = "formule_selection_invalid"

export function isFormuleSelectionValidationError(
  code: string | null | undefined
): boolean {
  return code === FORMULE_SELECTION_INVALID_CODE
}

// The metadata key a line item's Sélection is written under, one per
// Composant (ADR 0005): `formule_<key>_variant_id`. Named once so the write
// (formule-actions) and the read (below) can't drift apart under a rename.
export const formuleSelectionKey = (composantKey: string) =>
  `formule_${composantKey}_variant_id`

// True as soon as a line item carries at least one Sélection key — the cheap
// check that decides whether a Curation lookup is worth making at all, before
// resolving any of it to a readable label.
export function hasFormuleSelection(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (!metadata) {
    return false
  }

  return Object.keys(metadata).some(
    (key) => key.startsWith("formule_") && key.endsWith("_variant_id")
  )
}

// Turns the flat, technical Sélection on line_item.metadata into what the
// spec requires the cart to show: Composant `label` → chosen Variante
// `title` — never the raw metadata (User Story 13). Ordered by the
// Composants' own rank, exactly as the Curation route returns them.
export function formatFormuleSelection(
  metadata: Record<string, unknown> | null | undefined,
  composants: FormuleComposant[]
): FormuleSelectionEntry[] {
  if (!metadata) {
    return []
  }

  return composants.reduce<FormuleSelectionEntry[]>((entries, composant) => {
    const variantId = metadata[formuleSelectionKey(composant.key)]

    if (typeof variantId !== "string") {
      return entries
    }

    const variant = composant.variants.find((v) => v.id === variantId)

    if (!variant) {
      return entries
    }

    entries.push({ label: composant.label, variantTitle: variant.title })
    return entries
  }, [])
}
