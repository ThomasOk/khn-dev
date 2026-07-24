// The restaurant's timezone is the only authority for pickup times (mirrors
// apps/backend/src/lib/time/timezone.ts, kept separate since it's a
// different app). Slots arrive from the backend as ISO 8601 with an offset;
// every renderer must still pass this constant explicitly to its formatter —
// otherwise a phone set to another timezone reads the wrong wall-clock hour
// (e.g. 11:15 instead of 12:15), which is the spec's most likely bug.
export const RESTAURANT_TIMEZONE = "Europe/Paris"

// en-CA formats as "YYYY-MM-DD" directly — the same civil-day text the
// table-reservation API expects for `date`. Driven only by the explicit
// timeZone, never the host's, so server and browser render the identical
// string regardless of either machine's local zone (no hydration mismatch).
const civilDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESTAURANT_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

export function todayInRestaurantTimezone(): string {
  return civilDayFormatter.format(new Date())
}

export type ReservationDayOption = {
  /** YYYY-MM-DD, restaurant civil day — what the availability route expects. */
  date: string
  weekday: string
  day: string
  month: string
}

const dayOptionWeekdayFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  weekday: "short",
})

const dayOptionDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  day: "numeric",
})

const dayOptionMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  month: "short",
})

// Anchored at noon UTC — the +1h/+2h Paris offset then never crosses into a
// different civil day, so DST transitions can't shift a card by one day the
// way adding raw 24h*n milliseconds could.
function toReservationDayOption(date: string): ReservationDayOption {
  const [year, month, day] = date.split("-").map(Number)
  const anchor = new Date(Date.UTC(year, month - 1, day, 12))

  return {
    date: civilDayFormatter.format(anchor),
    weekday: dayOptionWeekdayFormatter.format(anchor),
    day: dayOptionDayFormatter.format(anchor),
    month: dayOptionMonthFormatter.format(anchor),
  }
}

// The date picker only ever renders days the backend already reported as
// open (GET /store/table-reservations/open-days) — this just formats that
// list for display, it never generates a horizon client-side.
export function reservationDayOptionsFromDates(
  dates: string[]
): ReservationDayOption[] {
  return dates.map(toReservationDayOption)
}

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

export type ReservationTimeGroup = {
  label: "Midi" | "Soir"
  times: string[]
}

// The availability route deliberately returns a flat `times: string[]`, no
// Service per time (ticket 02) — so Midi/Soir is inferred here from the
// clock alone. A closed afternoon leaves a multi-hour hole between lunch's
// last slot and dinner's first; anything smaller is just the Service's own
// step (15-30 min). One split point is enough since today's model is
// exactly two Services a day.
const SERVICE_GAP_THRESHOLD_MINUTES = 90

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

export function groupReservationTimesByService(
  times: string[]
): ReservationTimeGroup[] {
  if (times.length === 0) {
    return []
  }

  const splitIndex = times.findIndex(
    (time, index) =>
      index > 0 &&
      timeToMinutes(time) - timeToMinutes(times[index - 1]) >=
        SERVICE_GAP_THRESHOLD_MINUTES
  )

  if (splitIndex === -1) {
    // Single Service that day: past 16:00 reads as Soir, otherwise Midi.
    const label = timeToMinutes(times[0]) >= 16 * 60 ? "Soir" : "Midi"
    return [{ label, times }]
  }

  return [
    { label: "Midi", times: times.slice(0, splitIndex) },
    { label: "Soir", times: times.slice(splitIndex) },
  ]
}
