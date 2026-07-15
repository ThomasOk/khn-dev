import { RESTAURANT_TIMEZONE } from "./timezone"

// The heart of the pickup feature: a PURE function with an INJECTED clock. It
// derives the offerable pickup slots from the admin-configured schedule — the
// slots are never stored (ADR 0003).
//
// Hard rule (the most important design constraint of the spec): there is NO
// `new Date()` with no argument and NO system-clock read anywhere under this
// function. `now` is the only time input. Every Date built below comes from an
// explicit epoch-millisecond value, never from the system clock — that is what
// makes the daylight-saving behaviour testable without waiting for October.
//
// The restaurant timezone (RESTAURANT_TIMEZONE) is the sole authority; the
// caller's timezone decides nothing.

// These mirror the persisted pickup models (src/modules/pickup) structurally, so
// service rows can be passed straight in — but the function stays isolated from
// the module and depends on nothing but plain data.
export type PickupScheduleInput = {
  day_of_week: number // 0 = Sunday .. 6 = Saturday
  start_time: string // local "HH:MM" in RESTAURANT_TIMEZONE
  end_time: string // local "HH:MM"
  active: boolean
}

export type ClosureInput = {
  start_date: string // civil day "YYYY-MM-DD" in RESTAURANT_TIMEZONE, inclusive
  end_date: string // civil day "YYYY-MM-DD" in RESTAURANT_TIMEZONE, inclusive
}

export type PickupConfigInput = {
  prep_delay_minutes: number
  slot_duration_minutes: number
}

export type Slot = {
  start: Date
  end: Date
}

export type DeriveSlotsInput = {
  schedules: PickupScheduleInput[]
  closures: ClosureInput[]
  config: PickupConfigInput
  now: Date
}

const MINUTE_MS = 60_000

// Reused across calls; interpreting an instant in the restaurant timezone.
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

type CivilDay = { year: number; month: number; day: number }

// The restaurant-timezone civil wall-clock components of an instant. Takes a
// timestamp (a number), not a Date, so no Date is constructed here.
function partsAt(timestampMs: number): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of zonedParts.formatToParts(timestampMs)) {
    if (p.type !== "literal") out[p.type] = Number(p.value)
  }
  return out
}

// Offset (ms) of the restaurant timezone at a given instant: how far its
// wall-clock is ahead of UTC. Positive for Paris (+1h winter, +2h summer).
function offsetMsAt(timestampMs: number): number {
  const p = partsAt(timestampMs)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - timestampMs
}

// Convert a restaurant-timezone wall-clock time (minutes since midnight on a
// civil day) to the UTC instant (epoch ms). Two passes so the offset is taken at
// the *target* wall time, not at UTC — this is what makes a slot on a DST-change
// day land on its own offset rather than midnight's.
function wallTimeToTimestamp(day: CivilDay, minutesSinceMidnight: number): number {
  const hour = Math.floor(minutesSinceMidnight / 60)
  const minute = minutesSinceMidnight % 60
  const guess = Date.UTC(day.year, day.month - 1, day.day, hour, minute, 0)
  const firstOffset = offsetMsAt(guess)
  const refined = offsetMsAt(guess - firstOffset)
  return guess - refined
}

// Sakamoto's algorithm — pure arithmetic, no Date. 0 = Sunday .. 6 = Saturday.
const SAKAMOTO = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4]
function dayOfWeek({ year, month, day }: CivilDay): number {
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

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number)
  return h * 60 + m
}

const civilDayKey = ({ year, month, day }: CivilDay): string =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

export function deriveSlots(input: DeriveSlotsInput): Slot[] {
  const { schedules, closures, config, now } = input
  const { prep_delay_minutes, slot_duration_minutes } = config

  // Commands are same-day: everything hangs off the restaurant-timezone civil day
  // of `now`. We never look at tomorrow.
  const nowParts = partsAt(now.getTime())
  const today: CivilDay = {
    year: nowParts.year,
    month: nowParts.month,
    day: nowParts.day,
  }

  // A closure whose period covers the current day wipes the day's schedule
  // entirely. Civil-day keys are lexicographically ordered, so this stays a
  // string comparison — no Date is built to check the interval.
  const todayKey = civilDayKey(today)
  if (closures.some((c) => todayKey >= c.start_date && todayKey <= c.end_date)) {
    return []
  }

  const todayDow = dayOfWeek(today)
  const earliestStartMs = now.getTime() + prep_delay_minutes * MINUTE_MS

  const slots: Slot[] = []

  for (const schedule of schedules) {
    if (!schedule.active || schedule.day_of_week !== todayDow) {
      continue
    }

    const windowStart = toMinutes(schedule.start_time)
    const windowEnd = toMinutes(schedule.end_time)

    // Slice the window into steps; a slot must fit entirely inside the window,
    // so a trailing partial slot is dropped.
    for (
      let startMin = windowStart;
      startMin + slot_duration_minutes <= windowEnd;
      startMin += slot_duration_minutes
    ) {
      const endMin = startMin + slot_duration_minutes
      const startMs = wallTimeToTimestamp(today, startMin)

      // Offerable only if it starts strictly after now + prep delay.
      if (startMs <= earliestStartMs) {
        continue
      }

      const endMs = wallTimeToTimestamp(today, endMin)
      slots.push({ start: new Date(startMs), end: new Date(endMs) })
    }
  }

  // Chronological order, deduped on start (two services can't overlap, but a
  // misconfiguration shouldn't surface the same instant twice).
  slots.sort((a, b) => a.start.getTime() - b.start.getTime())
  return slots.filter(
    (slot, i) => i === 0 || slot.start.getTime() !== slots[i - 1].start.getTime()
  )
}
