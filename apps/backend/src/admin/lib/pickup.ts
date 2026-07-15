// Shared shapes and labels for the pickup settings page. The wire contract is in
// English (see AGENTS.md); the French domain vocabulary lives in the docs, not here.

export type PickupSchedule = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

export type Closure = {
  id: string
  date: string
  reason: string | null
}

export type PickupConfig = {
  id: string
  prep_delay_minutes: number
  slot_duration_minutes: number
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
