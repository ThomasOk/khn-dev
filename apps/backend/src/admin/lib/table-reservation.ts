// Shared shapes and labels for the table-reservation settings page. The wire
// contract is in English (see AGENTS.md); the French domain vocabulary lives
// in the docs, not here.

export type ServiceWindow = {
  id: string
  name: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  duration_minutes: number
  active: boolean
}

export type TableReservationConfig = {
  id: string
  min_lead_minutes: number
  horizon_days: number
  slot_step_minutes: number
  max_party_size: number
  last_seating_margin_minutes: number
  large_party_phone: string
  restaurant_notification_email: string | null
}

// 0 = Sunday .. 6 = Saturday, matching Date.getDay() and the day_of_week column.
export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const
