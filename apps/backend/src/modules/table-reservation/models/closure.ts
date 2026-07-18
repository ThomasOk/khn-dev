import { model } from "@medusajs/framework/utils"

// Fermeture de réservation — a civil-day PERIOD (NOT an instant) on which the
// dining room is closed. Overrides that period's Services entirely: no Heure
// de réservation is derived for any day within it. A single closed day (a bank
// holiday) is the degenerate case start_date === end_date. Shares NO table, NO
// row and NO code with the pickup module's Fermeture exceptionnelle (ADR
// 0007): a privatised evening closes the dining room while click & collect
// carries on unaffected.
const ReservationClosure = model.define("table_reservation_closure", {
  id: model.id().primaryKey(),
  // Civil days "YYYY-MM-DD" in the restaurant timezone, stored as text on
  // purpose: a dateTime would pin them to an instant, which a closed day is
  // not.
  start_date: model.text(),
  end_date: model.text(),
  reason: model.text().nullable(),
})

export default ReservationClosure
