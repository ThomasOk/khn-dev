import { offsetMsAt, wallClockAt } from "../time/restaurant-time"

const pad = (value: number): string => String(value).padStart(2, "0")

// Renders an instant as ISO 8601 WITH the restaurant-timezone offset, e.g.
// "2026-07-14T12:15:00+02:00" — never UTC "Z", never a bare local time. The
// offset is what lets a client render the correct Paris wall-clock whatever its
// own timezone: without it, a phone set to London would read 11:15 for the 12:15
// slot and arrive an hour early (the spec's most likely bug).
export function toRestaurantIso(date: Date): string {
  const timestampMs = date.getTime()
  const { year, month, day, hour, minute, second } = wallClockAt(timestampMs)

  // The offset is derived from the same instant, so it carries that instant's own
  // DST state rather than a fixed guess.
  const offsetMinutes = Math.round(offsetMsAt(timestampMs) / 60_000)
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMinutes)

  return (
    `${year}-${pad(month)}-${pad(day)}` +
    `T${pad(hour)}:${pad(minute)}:${pad(second)}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}
