import {
  addToCartWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows"
import { assertValidFormuleSelection } from "../../lib/formule/assert-valid-selection"

// line_item.metadata is written by the client through a public route (spec
// §"La validation serveur"): without re-verification, a Sélection is a UI
// suggestion, not a guarantee. These two hooks are the immediate,
// exploitable rejection — the customer is still on the page that can fix it
// — as opposed to completeCartWorkflow's validate hook (src/workflows/hooks/
// complete-cart.ts), which is the check that counts because the Curation may
// have changed since. Nothing here mutates state, so there is nothing to
// compensate.
addToCartWorkflow.hooks.validate(async ({ input }, { container }) => {
  for (const item of input.items ?? []) {
    if (!item.variant_id) {
      continue
    }
    await assertValidFormuleSelection(container, item.variant_id, item.metadata)
  }
})

// updateLineItemInCartWorkflow can change a line's metadata without touching
// its variant_id — the metadata update is shallow-merged onto the existing
// item (same contract the storefront relies on for the créneau, ADR 0004),
// so the Sélection re-checked here is the item's existing metadata with
// whatever this update contributes layered on top, exactly what the line
// will carry once the update lands.
updateLineItemInCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  const item = cart.items?.find((i: { id: string }) => i.id === input.item_id)
  if (!item?.variant_id) {
    return
  }

  const metadata = {
    ...(item.metadata ?? {}),
    ...(input.update.metadata ?? {}),
  }

  await assertValidFormuleSelection(container, item.variant_id, metadata)
})
