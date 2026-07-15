import { model } from "@medusajs/framework/utils"

// Horaire de retrait — a recurring weekly pickup window (local wall-clock hours,
// NOT instants). Several rows may target the same weekday: that is what gives a
// lunch service and a dinner service on the same day.
const PickupSchedule = model.define("pickup_schedule", {
  id: model.id().primaryKey(),
  // 0 = Sunday .. 6 = Saturday, matching JavaScript's Date.getDay() convention.
  day_of_week: model.number(),
  // Local "HH:MM" in the restaurant timezone (see RESTAURANT_TIMEZONE), not an instant.
  start_time: model.text(),
  end_time: model.text(),
  active: model.boolean().default(true),
})

export default PickupSchedule
