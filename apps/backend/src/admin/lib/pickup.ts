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
  start_date: string
  end_date: string
  reason: string | null
}

export type PickupConfig = {
  id: string
  prep_delay_minutes: number
  slot_duration_minutes: number
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

// The two flat, top-level metadata keys the créneau is written under (ADR
// 0004) — mirrors apps/storefront/src/lib/util/pickup-slot.ts. Order metadata
// is recopied verbatim from cart.metadata by completeCartWorkflow, so these
// are the same keys the checkout step writes; this widget reads them off
// order.metadata specifically, but the reader below is generic over either.
export const CRENEAU_DEBUT_KEY = "creneau_debut"
export const CRENEAU_FIN_KEY = "creneau_fin"

export type PickupSlot = { start: string; end: string }

export function pickupSlotFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): PickupSlot | null {
  const start = metadata?.[CRENEAU_DEBUT_KEY]
  const end = metadata?.[CRENEAU_FIN_KEY]

  if (typeof start === "string" && typeof end === "string") {
    return { start, end }
  }

  return null
}
