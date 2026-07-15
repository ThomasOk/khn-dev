import { model } from "@medusajs/framework/utils"

// Fermeture exceptionnelle — a civil-day PERIOD (NOT an instant) on which pickup
// is closed. Overrides that period's Horaires entirely: no slot is derived for
// any day within it. A single closed day (a bank holiday) is the degenerate case
// start_date === end_date.
const Closure = model.define("pickup_closure", {
  id: model.id().primaryKey(),
  // Civil days "YYYY-MM-DD" in the restaurant timezone, stored as text on purpose:
  // a dateTime would pin them to an instant, which a closed day is not.
  start_date: model.text(),
  end_date: model.text(),
  reason: model.text().nullable(),
})

export default Closure
