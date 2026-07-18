import {
  CivilDay,
  civilDayAt,
  civilDayKey,
  dayOfWeek,
  hhmmToMinutes,
  wallTimeToTimestamp,
} from "../time/restaurant-time"

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
// The wall-clock arithmetic itself lives in ../time/restaurant-time, shared with
// table-reservation availability: the restaurant timezone is the sole authority
// there, and the caller's timezone decides nothing.

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

export function deriveSlots(input: DeriveSlotsInput): Slot[] {
  const { schedules, closures, config, now } = input
  const { prep_delay_minutes, slot_duration_minutes } = config

  // Commands are same-day: everything hangs off the restaurant-timezone civil day
  // of `now`. We never look at tomorrow.
  const today: CivilDay = civilDayAt(now.getTime())

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

    const windowStart = hhmmToMinutes(schedule.start_time)
    const windowEnd = hhmmToMinutes(schedule.end_time)

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
