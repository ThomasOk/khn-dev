import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { getFormuleCurationForVariant } from "./get-curation-for-variant"
import { SelectionRejection, validateFormuleSelection } from "./validate-selection"

// MedusaError's third constructor argument is a `code`, distinct from its
// `type` — the error-handler middleware forwards it verbatim into the JSON
// response body for INVALID_DATA (400) errors, so it survives the HTTP round
// trip. The storefront's isFormuleSelectionValidationError (lib/util/
// formule-selection.ts) matches on this exact string — a stable, typed
// discriminator instead of sniffing English/French prose out of `message`,
// which is free-form UI text and not meant to be parsed.
export const FORMULE_SELECTION_INVALID_CODE = "formule_selection_invalid"

function rejectionMessage(
  rejection: SelectionRejection,
  formuleTitle: string
): string {
  switch (rejection.code) {
    case "not_a_formule":
      return "This line item is not a Formule and cannot carry a Sélection."
    case "missing_composant":
      return `The Sélection for "${formuleTitle}" is missing a choice for "${rejection.composant.label}".`
    case "unknown_key":
      return `The Sélection for "${formuleTitle}" includes a choice that does not belong to it.`
    case "variant_not_curated":
      return `The Sélection for "${formuleTitle}" is invalid: the chosen item for "${rejection.composant.label}" is no longer available. Please choose another.`
  }
}

// The one place both hook call sites (addToCartWorkflow / updateLineItemIn
// CartWorkflow — the immediate, exploitable rejection — and
// completeCartWorkflow — the check that counts, spec §"La validation
// serveur") resolve a line's Curation and re-run Seam 1's pure control
// against it. Throws on rejection, never mutates anything, so there is
// nothing to compensate.
export async function assertValidFormuleSelection(
  container: MedusaContainer,
  variantId: string,
  metadata: Record<string, unknown> | null | undefined
): Promise<void> {
  const curation = await getFormuleCurationForVariant(container, variantId)
  const result = validateFormuleSelection(curation, metadata)

  if (!result.valid) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      rejectionMessage(result.rejection, curation?.productTitle ?? "this product"),
      FORMULE_SELECTION_INVALID_CODE
    )
  }
}
