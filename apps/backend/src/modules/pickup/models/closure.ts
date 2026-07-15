import { model } from "@medusajs/framework/utils"

// Fermeture exceptionnelle — a civil day (NOT an instant) on which pickup is
// closed. Overrides that day's Horaires entirely: no slot is derived for it.
const Closure = model.define("pickup_closure", {
  id: model.id().primaryKey(),
  // Civil day "YYYY-MM-DD" in the restaurant timezone, stored as text on purpose:
  // a dateTime would pin it to an instant, which a closed day is not.
  date: model.text().unique(),
  reason: model.text().nullable(),
})

export default Closure
