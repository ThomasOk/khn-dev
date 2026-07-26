import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { getOfferableSlots } from "../../lib/slots/get-offerable-slots"
import { assertValidFormuleSelection } from "../../lib/formule/assert-valid-selection"
import { SHOWCASE_MODULE } from "../../modules/showcase"
import ShowcaseModuleService from "../../modules/showcase/service"

// cart.metadata is written by the client through a public route (POST
// /store/carts/:id): an unvalidated créneau is just a field the customer
// controls. `validate` is the only publicly typed hook on completeCartWorkflow,
// and the only point that runs before payment authorization — so it is where the
// créneau is re-derived against the schedule as it stands NOW and re-checked,
// not trusted from the choice made minutes (or fifteen) earlier on the payment
// page. Nothing here mutates state, so there is nothing to compensate.
//
// A single validate hook per workflow (spec §"La validation serveur"): the
// Sélection re-check below is appended to this same hook rather than
// registered as a second one, and re-runs the identical control
// addToCartWorkflow/updateLineItemInCartWorkflow already ran at add-time —
// because the Curation may have changed while the customer sat on the
// payment page, the same reasoning as the créneau re-derivation above.
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  // Mode vitrine runs FIRST, before the créneau re-check: when both would
  // fail (mode active AND a stale créneau), the client must read that
  // orders are suspended, not a message that would send them to pick
  // another slot (spec §"Refus au paiement"). A deliberate refusal by the
  // restaurant, not invalid data from the client — CONFLICT (409), not
  // INVALID_DATA (400).
  const showcase: ShowcaseModuleService = container.resolve(SHOWCASE_MODULE)
  const [showcaseConfig] = await showcase.listShowcaseConfigs()

  if (showcaseConfig?.enabled) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Online ordering is currently suspended."
    )
  }

  const slotStart = cart.metadata?.creneau_debut as string | undefined
  const slotEnd = cart.metadata?.creneau_fin as string | undefined

  if (!slotStart || !slotEnd) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This cart has no pickup slot: choose one before paying."
    )
  }

  const offerableSlots = await getOfferableSlots(container, new Date())

  const chosenStartMs = new Date(slotStart).getTime()
  const chosenEndMs = new Date(slotEnd).getTime()

  const stillOfferable = offerableSlots.some(
    (slot) =>
      slot.start.getTime() === chosenStartMs &&
      slot.end.getTime() === chosenEndMs
  )

  if (!stillOfferable) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "This pickup slot is no longer available: it may have passed, fallen under the prep delay, or the schedule may have changed."
    )
  }

  for (const item of cart.items ?? []) {
    if (!item.variant_id) {
      continue
    }
    await assertValidFormuleSelection(container, item.variant_id, item.metadata)
  }
})
