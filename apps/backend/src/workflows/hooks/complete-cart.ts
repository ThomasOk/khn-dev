import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError } from "@medusajs/framework/utils"
import { getOfferableSlots } from "../../lib/slots/get-offerable-slots"

// cart.metadata is written by the client through a public route (POST
// /store/carts/:id): an unvalidated créneau is just a field the customer
// controls. `validate` is the only publicly typed hook on completeCartWorkflow,
// and the only point that runs before payment authorization — so it is where the
// créneau is re-derived against the schedule as it stands NOW and re-checked,
// not trusted from the choice made minutes (or fifteen) earlier on the payment
// page. Nothing here mutates state, so there is nothing to compensate.
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
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
})
