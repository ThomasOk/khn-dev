import { model } from "@medusajs/framework/utils"

// Configuration du retrait — a single row carrying the Délai de préparation and
// the slot duration. Slot duration is not a domain concept: it is the step used
// to slice a Horaire's window into slots, and its home is here, in configuration.
const PickupConfig = model.define("pickup_config", {
  id: model.id().primaryKey(),
  // Délai de préparation: how far ahead of "now" a slot must start to be offered.
  prep_delay_minutes: model.number(),
  // Slicing step of a Horaire's window.
  slot_duration_minutes: model.number(),
})

export default PickupConfig
