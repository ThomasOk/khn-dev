import { model } from "@medusajs/framework/utils"

// Service — a recurring named window during which the restaurant seats
// customers ("Déjeuner, mardi, 12h00-14h00"). Unlike a Horaire de retrait, a
// Service also carries its OWN Capacité and its OWN Durée d'occupation: a
// Tuesday lunch and a Saturday dinner differ in both (see CONTEXT.md, "La
// réservation de table"). Several rows may target the same weekday — that is
// what gives a lunch service and a dinner service on the same day.
const ServiceWindow = model.define("table_reservation_service_window", {
  id: model.id().primaryKey(),
  name: model.text(),
  // 0 = Sunday .. 6 = Saturday, matching JavaScript's Date.getDay() convention
  // (same as pickup_schedule.day_of_week).
  day_of_week: model.number(),
  // Local "HH:MM" in RESTAURANT_TIMEZONE, not an instant.
  start_time: model.text(),
  end_time: model.text(),
  // Capacité — Couverts this Service can seat simultaneously (ADR 0006).
  capacity: model.number(),
  // Durée d'occupation — copied onto each Réservation at creation, never read
  // back from here afterwards, so re-tuning it never rewrites the occupancy
  // of a Réservation already promised.
  duration_minutes: model.number(),
  active: model.boolean().default(true),
})

export default ServiceWindow
