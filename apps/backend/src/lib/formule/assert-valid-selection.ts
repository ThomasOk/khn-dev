import { MedusaError } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { getFormuleCurationForVariant } from "./get-curation-for-variant"
import { SelectionRejection, validateFormuleSelection } from "./validate-selection"

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
      rejectionMessage(result.rejection, curation?.productTitle ?? "this product")
    )
  }
}
