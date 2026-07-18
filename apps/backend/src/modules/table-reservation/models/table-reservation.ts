import { model } from "@medusajs/framework/utils"

// Réservation — the restaurant's confirmed, unconditional commitment to seat
// `party_size` Couverts at `time` on `date` (ADR 0008: no lifecycle beyond
// confirmed/cancelled, no human approval). `date`/`time` are local wall-clock
// text, exactly like ServiceWindow — not instants.
//
// `duration_minutes` is COPIED from the ServiceWindow at creation and never
// read back from it (ADR 0006): re-tuning a Service's Durée d'occupation
// later must never rewrite the occupancy of a Réservation already promised.
// `service_window_id` is kept as a plain reference, not a DML relation —
// this module's Services and Fermetures already carry no relations either,
// and nothing here ever needs to navigate back from a Réservation to its
// Service.
const TableReservation = model.define("table_reservation", {
  id: model.id().primaryKey(),
  date: model.text(), // civil day "YYYY-MM-DD", the Service's own day
  time: model.text(), // local "HH:MM", the Heure de réservation
  party_size: model.number(), // Couverts
  duration_minutes: model.number(), // snapshotted Durée d'occupation
  service_window_id: model.text(),
  status: model.enum(["confirmed", "cancelled"]).default("confirmed"),
  customer_name: model.text(),
  customer_email: model.text(),
  customer_phone: model.text(),
  note: model.text().nullable(),
  // Lets the customer cancel from the link in their confirmation email
  // without an account (ADR 0008) — unguessable and unique.
  cancellation_token: model.text().unique(),
  cancelled_at: model.dateTime().nullable(),
})

export default TableReservation
