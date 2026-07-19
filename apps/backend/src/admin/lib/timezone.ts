// The restaurant's timezone is the only authority for pickup times (mirrors
// apps/backend/src/lib/time/timezone.ts and apps/storefront/src/lib/util/timezone.ts,
// kept separate here since the admin dashboard is a separately bundled SPA). The
// order widget must still pass this constant explicitly to its formatter —
// otherwise a browser set to another timezone reads the wrong wall-clock hour
// (e.g. 11:15 instead of 12:15), which is the spec's most likely bug.
export const RESTAURANT_TIMEZONE = "Europe/Paris"

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESTAURANT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

// "YYYY-MM-DD" for right now, in the restaurant's own civil day — never the
// admin browser's timezone, which can disagree with Paris around midnight.
export function todayInRestaurantTimezone(): string {
  return dateKeyFormatter.format(new Date())
}

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
})

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
})

// e.g. "Wed, 15/07 · 12:15–12:30", always read in restaurant (Paris) wall-clock
// time regardless of the admin's own browser timezone.
export function formatSlotLabel(start: string, end: string): string {
  const day = dayFormatter.format(new Date(start))
  const range = `${timeFormatter.format(new Date(start))}–${timeFormatter.format(
    new Date(end)
  )}`

  return `${day} · ${range}`
}
