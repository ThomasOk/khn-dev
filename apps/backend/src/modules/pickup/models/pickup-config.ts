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
  // Recipient of the Notification de commande — a restaurant property, not a
  // technical env var, so it can change without a deploy (ticket 03). Nullable:
  // an existing Configuration row predates this field, and nothing reads it yet.
  restaurant_notification_email: model.text().nullable(),
})

export default PickupConfig
