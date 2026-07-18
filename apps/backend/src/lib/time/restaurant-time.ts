import { RESTAURANT_TIMEZONE } from "./timezone"

// The shared floor under every wall-clock computation in the app: converting
// between the restaurant's local wall time and instants, and doing civil-calendar
// arithmetic. Pickup slot derivation was the first caller; table-reservation
// availability is the second. They must agree, and in particular must be wrong
// in no different ways on the two days a year the offset moves — hence one copy.
//
// Hard rule inherited from the pickup spec: there is NO `new Date()` with no
// argument and NO system-clock read anywhere in this file. Every function is a
// pure mapping from its arguments. Instants are passed as epoch milliseconds
// (numbers) rather than Dates, so nothing here can be handed an implicit "now".
//
// RESTAURANT_TIMEZONE is the sole authority; the caller's timezone decides
// nothing and is never consulted.

export type CivilDay = {
  year: number
  month: number // 1 = January .. 12 = December
  day: number
}

export type WallClock = CivilDay & {
  hour: number // 0..23
  minute: number
  second: number
}

// Reused across calls — constructing an Intl.DateTimeFormat is the expensive
// part, and these primitives run in tight loops over a service's slots.
const zonedParts = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23", // so midnight reads as hour 0, never as the previous day's 24
})

// The restaurant-timezone wall-clock components of an instant.
export function wallClockAt(timestampMs: number): WallClock {
  const parts: Record<string, number> = {}
  for (const part of zonedParts.formatToParts(timestampMs)) {
    if (part.type !== "literal") parts[part.type] = Number(part.value)
  }

  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
    second: parts.second,
  }
}

// The restaurant-timezone civil day an instant falls on. Not the UTC day: just
// after midnight in Paris, the two calendars disagree.
export function civilDayAt(timestampMs: number): CivilDay {
  const { year, month, day } = wallClockAt(timestampMs)
  return { year, month, day }
}

// Offset (ms) of the restaurant timezone at a given instant: how far its
// wall-clock runs ahead of UTC. Positive for Paris (+1h winter, +2h summer).
export function offsetMsAt(timestampMs: number): number {
  const { year, month, day, hour, minute, second } = wallClockAt(timestampMs)
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  return asUtc - timestampMs
}

// Convert a restaurant-timezone wall time (minutes since midnight on a civil
// day) to the instant it names, as epoch ms.
//
// Two passes, and this is the whole point of the file: the offset is taken at
// the *target* wall time, not at UTC-midnight of that day. A single pass would
// place every slot on a DST-change Sunday an hour off, because it would use
// midnight's offset for a lunch service that sits on the other side of the jump.
//
// `minutesSinceMidnight` may exceed 1440: a dinner service running past midnight
// still belongs to its own civil day, and Date.UTC rolls the overflow forward.
//
// Two wall times have no single answer, and the resolution is deliberate:
//   - a time skipped by the spring-forward jump (02:30 on that Sunday) lands
//     just after the jump, at 03:30 local, rather than throwing;
//   - a time repeated by the fall-back (02:30 on that Sunday) resolves to its
//     *second*, post-fall occurrence.
export function wallTimeToTimestamp(
  day: CivilDay,
  minutesSinceMidnight: number
): number {
  const hour = Math.floor(minutesSinceMidnight / 60)
  const minute = minutesSinceMidnight % 60
  const guess = Date.UTC(day.year, day.month - 1, day.day, hour, minute, 0)
  const firstOffset = offsetMsAt(guess)
  const refined = offsetMsAt(guess - firstOffset)
  return guess - refined
}

// Sakamoto's algorithm — pure arithmetic, no Date. 0 = Sunday .. 6 = Saturday.
// Months before March count against the previous year, which is what makes the
// leap-day correction fall at the end of the shifted year.
const SAKAMOTO = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
export function dayOfWeek({ year, month, day }: CivilDay): number {
  const y = month < 3 ? year - 1 : year
  return (
    (y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) +
      SAKAMOTO[month - 1] +
      day) %
    7
  )
}

// A wall-clock "HH:MM" (as stored on schedule rows) to minutes since midnight.
export const hhmmToMinutes = (hhmm: string): number => {
  const [hours, minutes] = hhmm.split(":").map(Number)
  return hours * 60 + minutes
}

// A civil day as "YYYY-MM-DD". Zero-padded, so the keys sort lexicographically
// in chronological order — that is what lets closure intervals be compared as
// plain strings, with no Date built to test membership.
export const civilDayKey = ({ year, month, day }: CivilDay): string =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
