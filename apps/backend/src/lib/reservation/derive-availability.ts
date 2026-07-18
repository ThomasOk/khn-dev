import {
  CivilDay,
  civilDayAt,
  dayOfWeek,
  hhmmToMinutes,
  wallTimeToTimestamp,
} from "../time/restaurant-time"

// The heart of the table-reservation feature: a PURE function with an INJECTED
// clock, on the model of deriveSlots. It derives the offerable Heures de
// réservation for one date and one party_size from the admin-configured
// Services — including capacity, which deriveSlots never had to consider
// (ADR 0006). No Réservation can be persisted yet (that is ticket 04); this
// function accepts existing reservations as plain data specifically so the
// hard part — overlapping intervals, mixed durations, the semi-open bound —
// can be tested before persistence exists at all.
//
// Hard rule inherited from deriveSlots: there is NO `new Date()` with no
// argument and NO system-clock read anywhere in this file. `now` is the only
// time input.

// Mirrors the persisted ServiceWindow model structurally, so rows can be
// passed straight in, while keeping this function isolated from the module.
export type ServiceWindowInput = {
  day_of_week: number // 0 = Sunday .. 6 = Saturday
  start_time: string // local "HH:MM" in RESTAURANT_TIMEZONE
  end_time: string // local "HH:MM"
  capacity: number // Couverts
  duration_minutes: number // Durée d'occupation for a Réservation taken in this Service
  active: boolean
}

// A confirmed Réservation already sitting in the day's Services, reduced to
// the three fields the capacity computation needs. `time` is local "HH:MM" on
// the requested date's Service day — the caller is responsible for only
// passing reservations that belong to that day (a dinner service spanning
// midnight still belongs to the day its Service started on, never the next).
export type ExistingReservationInput = {
  time: string
  party_size: number
  duration_minutes: number
}

export type TableReservationConfigInput = {
  min_lead_minutes: number
  horizon_days: number
  slot_step_minutes: number
  max_party_size: number
  last_seating_margin_minutes: number
}

export type DeriveAvailabilityInput = {
  date: string // civil day "YYYY-MM-DD" in RESTAURANT_TIMEZONE, the requested day
  party_size: number
  services: ServiceWindowInput[]
  reservations: ExistingReservationInput[]
  config: TableReservationConfigInput
  now: Date
}

export type Availability = {
  times: string[] // local "HH:MM", chronological
  open: boolean
}

const MINUTE_MS = 60_000

function parseCivilDay(date: string): CivilDay {
  const [year, month, day] = date.split("-").map(Number)
  return { year, month, day }
}

// Whole-day difference between two civil days, computed on their Y/M/D
// components via Date.UTC — this is calendar arithmetic, not a real-time
// duration, so it carries no DST concern of its own.
function daysBetween(a: CivilDay, b: CivilDay): number {
  const aUtc = Date.UTC(a.year, a.month - 1, a.day)
  const bUtc = Date.UTC(b.year, b.month - 1, b.day)
  return Math.round((aUtc - bUtc) / (24 * 60 * MINUTE_MS))
}

function minutesToHHMM(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

// The Couverts already committed at any instant within [intervalStart,
// intervalEnd) by the reservations that overlap it at all. A classic sweep
// over start/end events, clipped to the candidate interval so a reservation
// that only grazes the edges cannot inflate a peak that occurs outside it.
// The interval is semi-open throughout: an existing reservation ending
// exactly at intervalStart contributes nothing, and one starting exactly at
// intervalEnd is never even considered.
function peakOccupancy(
  reservations: { start: number; end: number; party_size: number }[],
  intervalStart: number,
  intervalEnd: number
): number {
  const overlapping = reservations.filter(
    (r) => r.start < intervalEnd && r.end > intervalStart
  )
  if (overlapping.length === 0) {
    return 0
  }

  const events: [number, number][] = []
  for (const r of overlapping) {
    events.push([Math.max(r.start, intervalStart), r.party_size])
    events.push([Math.min(r.end, intervalEnd), -r.party_size])
  }
  // Same-instant removals sort before additions (negative delta first),
  // which is what makes the bound semi-open: a party leaving at 20:00 frees
  // its Couverts before a party arriving at 20:00 claims theirs.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1])

  let current = 0
  let peak = 0
  for (const [, delta] of events) {
    current += delta
    peak = Math.max(peak, current)
  }
  return peak
}

export function deriveAvailability(input: DeriveAvailabilityInput): Availability {
  const { date, party_size, services, reservations, config, now } = input

  const requestedDay = parseCivilDay(date)
  const today = civilDayAt(now.getTime())
  const daysUntil = daysBetween(requestedDay, today)
  const withinHorizon = daysUntil >= 0 && daysUntil <= config.horizon_days

  const dow = dayOfWeek(requestedDay)
  const todaysServices = services.filter(
    (s) => s.active && s.day_of_week === dow
  )

  const open = withinHorizon && todaysServices.length > 0

  if (!open) {
    return { times: [], open: false }
  }

  // Above the plafond: never an error, just nothing to offer — the route adds
  // the téléphone alongside `open: true`.
  if (party_size > config.max_party_size) {
    return { times: [], open: true }
  }

  const earliestStartMs = now.getTime() + config.min_lead_minutes * MINUTE_MS

  const existingIntervals = reservations.map((r) => {
    const start = hhmmToMinutes(r.time)
    return { start, end: start + r.duration_minutes, party_size: r.party_size }
  })

  const times: string[] = []

  for (const service of todaysServices) {
    const windowStart = hhmmToMinutes(service.start_time)
    const windowEnd = hhmmToMinutes(service.end_time)
    const lastOfferable = windowEnd - config.last_seating_margin_minutes

    for (
      let startMin = windowStart;
      startMin <= lastOfferable;
      startMin += config.slot_step_minutes
    ) {
      const candidateStartMs = wallTimeToTimestamp(requestedDay, startMin)
      // Strictly after now + délai minimum, same convention as deriveSlots.
      if (candidateStartMs <= earliestStartMs) {
        continue
      }

      // Minutes since midnight of the Service's own day — deliberately
      // allowed to exceed 1440 (ADR 0006's reading): a dinner starting at
      // 22h30 with a 2h Durée occupies until 00h30 of the FOLLOWING civil
      // day, but that occupancy still belongs to this Service, on this day.
      const candidateEnd = startMin + service.duration_minutes

      const peak = peakOccupancy(existingIntervals, startMin, candidateEnd)
      if (peak + party_size > service.capacity) {
        continue
      }

      times.push(minutesToHHMM(startMin))
    }
  }

  times.sort()
  return { times, open: true }
}
