// The restaurant's timezone is the only authority for pickup times (mirrors
// apps/backend/src/lib/time/timezone.ts, kept separate since it's a
// different app). Slots arrive from the backend as ISO 8601 with an offset;
// every renderer must still pass this constant explicitly to its formatter —
// otherwise a phone set to another timezone reads the wrong wall-clock hour
// (e.g. 11:15 instead of 12:15), which is the spec's most likely bug.
export const RESTAURANT_TIMEZONE = "Europe/Paris"

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
})

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
})

export function formatSlotTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

export function formatSlotRange(start: string, end: string): string {
  return `${formatSlotTime(start)}–${formatSlotTime(end)}`
}

// e.g. "Wed, 15/07 · 12:15–12:30" — the confirmation page's trace of the slot
// the customer just committed to, always read in restaurant (Paris) wall-clock
// time regardless of the customer's own browser timezone.
export function formatSlotLabel(start: string, end: string): string {
  return `${dayFormatter.format(new Date(start))} · ${formatSlotRange(
    start,
    end
  )}`
}
