"use client"

import { FORMULE_SELECTION_ERROR_PARAM } from "@lib/util/formule-selection"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useSearchParams } from "next/navigation"

// The Formule counterpart of the créneau-expired recovery on the payment
// step (payment-button/index.tsx): completeCartWorkflow rejected a Sélection
// whose Curation changed between add-to-cart and payment, and the customer
// was routed back here. The message already names the Composant and the
// Formule at fault (built server-side, src/lib/formule/
// assert-valid-selection.ts) — showing it here is what lets the customer
// find and fix that one line (delete it, re-add it from the product page)
// instead of restarting the whole cart.
export default function FormuleSelectionError() {
  const searchParams = useSearchParams()
  const message = searchParams.get(FORMULE_SELECTION_ERROR_PARAM)

  return (
    <ErrorMessage
      error={message}
      data-testid="formule-selection-error-message"
    />
  )
}
