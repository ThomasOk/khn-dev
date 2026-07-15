// The restaurant's timezone is the only authority for pickup times (mirrors
// apps/backend/src/lib/slots/timezone.ts, kept separate since it's a
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

export function formatSlotTime(iso: string): string {
  return timeFormatter.format(new Date(iso))
}

export function formatSlotRange(start: string, end: string): string {
  return `${formatSlotTime(start)}–${formatSlotTime(end)}`
}
