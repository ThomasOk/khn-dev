import { model } from "@medusajs/framework/utils"

// Configuration de la réservation de table — a single row. The module owns
// its OWN notification email: pickup_config already has one, and the two
// modules share nothing (ADR 0007).
const TableReservationConfig = model.define("table_reservation_config", {
  id: model.id().primaryKey(),
  // Délai minimum: how far ahead of "now" a Heure de réservation must start
  // to be offered.
  min_lead_minutes: model.number(),
  // Horizon: how many days out a Réservation may be taken.
  horizon_days: model.number(),
  // Slicing step used to derive candidate Heures from a Service's window.
  slot_step_minutes: model.number(),
  // Taille de groupe maximale bookable online; above it, the storefront shows
  // large_party_phone instead of a form.
  max_party_size: model.number(),
  // Marge de dernier départ: subtracted from a Service's end_time to get its
  // last offerable Heure.
  last_seating_margin_minutes: model.number(),
  // Téléphone shown to parties above max_party_size — a restaurant property,
  // not a line of code.
  large_party_phone: model.text(),
  // Recipient of the réservation/annulation notifications. Nullable: an
  // existing row may predate this field, and nothing reads it yet.
  restaurant_notification_email: model.text().nullable(),
})

export default TableReservationConfig
