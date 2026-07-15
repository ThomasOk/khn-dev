import { RESTAURANT_TIMEZONE } from "./timezone"

// Reused across calls; reads an instant's wall-clock components in the restaurant
// timezone (see RESTAURANT_TIMEZONE).
const zonedParts = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

// Renders an instant as ISO 8601 WITH the restaurant-timezone offset, e.g.
// "2026-07-14T12:15:00+02:00" — never UTC "Z", never a bare local time. The
// offset is what lets a client render the correct Paris wall-clock whatever its
// own timezone: without it, a phone set to London would read 11:15 for the 12:15
// slot and arrive an hour early (the spec's most likely bug).
export function toRestaurantIso(date: Date): string {
  const p: Record<string, string> = {}
  for (const part of zonedParts.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = part.value
  }

  // The offset is derived from the same instant, so it carries that instant's own
  // DST state rather than a fixed guess.
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  )
  const offsetMinutes = Math.round((asUtc - date.getTime()) / 60_000)
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMinutes)
  const offsetHH = String(Math.floor(abs / 60)).padStart(2, "0")
  const offsetMM = String(abs % 60).padStart(2, "0")

  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${offsetHH}:${offsetMM}`
}
