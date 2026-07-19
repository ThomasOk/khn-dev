import {
  CivilDay,
  civilDayAt,
  civilDayKey,
  dayOfWeek,
  hhmmToMinutes,
  wallTimeToTimestamp,
} from "../time/restaurant-time"

// The heart of the table-reservation feature: a PURE function with an INJECTED
// clock, on the model of deriveSlots. It derives the offerable Heures de
// réservation for one date and one party_size from the admin-configured
// Services — including capacity, which deriveSlots never had to consider
// (ADR 0006). It accepts existing reservations as plain data rather than
// reading them itself, so the hard part — overlapping intervals, mixed
// durations, the semi-open bound — stays testable without a database.
//
// Hard rule inherited from deriveSlots: there is NO `new Date()` with no
// argument and NO system-clock read anywhere in this file. `now` is the only
// time input.

// Mirrors the persisted ServiceWindow model structurally, so rows can be
// passed straight in, while keeping this function isolated from the module.
export type ServiceWindowInput = {
  id: string
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

// Fermeture de réservation — a civil-day PERIOD (inclusive on both ends) that
// wipes availability for every day it covers, whatever the day's Services
// say. Shares no table, row, or code with the pickup module's own Fermeture
// exceptionnelle (ADR 0007).
export type ReservationClosureInput = {
  start_date: string // civil day "YYYY-MM-DD", inclusive
  end_date: string // civil day "YYYY-MM-DD", inclusive
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
  closures: ReservationClosureInput[]
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

// The candidate Heures a set of today's Services can offer a party_size,
// each already checked against the délai minimum and the capacity sweep.
// Shared between deriveAvailability (which only needs the Heure) and
// deriveReservationAcceptance (which also needs to know WHICH Service
// accepted a specific Heure, to snapshot its id and Durée d'occupation onto
// the Réservation) — the two must never diverge on what counts as offerable.
function* offerableCandidates(
  todaysServices: ServiceWindowInput[],
  existingIntervals: { start: number; end: number; party_size: number }[],
  config: TableReservationConfigInput,
  requestedDay: CivilDay,
  party_size: number,
  earliestStartMs: number
): Generator<{ startMin: number; service: ServiceWindowInput }> {
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

      yield { startMin, service }
    }
  }
}

// The day-level context both deriveAvailability and deriveReservationAcceptance
// need before they can even consider a single candidate Heure: is the day
// covered by a Fermeture, past the horizon, or without a matching Service at
// all — collapsed into a single `null` outcome, since both callers treat
// every one of those reasons identically ("closed"/`open: false`). When the
// day IS open, callers get back exactly what offerableCandidates needs.
type OpenDayContext = {
  requestedDay: CivilDay
  todaysServices: ServiceWindowInput[]
  earliestStartMs: number
  existingIntervals: { start: number; end: number; party_size: number }[]
}

function resolveOpenDayContext(
  date: string,
  closures: ReservationClosureInput[],
  services: ServiceWindowInput[],
  reservations: ExistingReservationInput[],
  config: TableReservationConfigInput,
  now: Date
): OpenDayContext | null {
  const requestedDay = parseCivilDay(date)

  // A Fermeture whose period covers the REQUESTED day wipes that day's
  // Services entirely, bounds included — unlike deriveSlots, which only ever
  // has to check "today", availability is derived for an arbitrary future
  // date, so the closure check is against the requested day, not `now`.
  // Civil-day keys are lexicographically ordered, so this stays a string
  // comparison — no Date is built to check the interval.
  const requestedKey = civilDayKey(requestedDay)
  if (
    closures.some((c) => requestedKey >= c.start_date && requestedKey <= c.end_date)
  ) {
    return null
  }

  const today = civilDayAt(now.getTime())
  const daysUntil = daysBetween(requestedDay, today)
  const withinHorizon = daysUntil >= 0 && daysUntil <= config.horizon_days

  const dow = dayOfWeek(requestedDay)
  const todaysServices = services.filter(
    (s) => s.active && s.day_of_week === dow
  )

  if (!withinHorizon || todaysServices.length === 0) {
    return null
  }

  const earliestStartMs = now.getTime() + config.min_lead_minutes * MINUTE_MS

  const existingIntervals = reservations.map((r) => {
    const start = hhmmToMinutes(r.time)
    return { start, end: start + r.duration_minutes, party_size: r.party_size }
  })

  return { requestedDay, todaysServices, earliestStartMs, existingIntervals }
}

export function deriveAvailability(input: DeriveAvailabilityInput): Availability {
  const { date, party_size, services, reservations, closures, config, now } =
    input

  const context = resolveOpenDayContext(
    date,
    closures,
    services,
    reservations,
    config,
    now
  )
  if (!context) {
    return { times: [], open: false }
  }

  // Above the plafond: never an error, just nothing to offer — the route adds
  // the téléphone alongside `open: true`.
  if (party_size > config.max_party_size) {
    return { times: [], open: true }
  }

  const times: string[] = []

  for (const { startMin } of offerableCandidates(
    context.todaysServices,
    context.existingIntervals,
    config,
    context.requestedDay,
    party_size,
    context.earliestStartMs
  )) {
    times.push(minutesToHHMM(startMin))
  }

  times.sort()
  return { times, open: true }
}

// The acceptance decision for one specific customer-chosen Heure — the
// revalidation POST /store/table-reservations runs, inside the SAME locked
// job as the insert (ADR 0006). It reuses offerableCandidates so acceptance
// can never diverge from what GET .../availability would have offered, and
// reports which Service accepted the Heure so its id and CURRENT Durée
// d'occupation can be snapshotted onto the Réservation.
export type ReservationAcceptanceInput = DeriveAvailabilityInput & {
  time: string // local "HH:MM", the customer's chosen Heure de réservation
}

export type ReservationAcceptance =
  | { accepted: true; service_window_id: string; duration_minutes: number }
  | {
      accepted: false
      // "closed": no Service that day, past the horizon, or a Fermeture.
      // "party_size_too_large": above the plafond — the caller shows the
      // téléphone, this is not the same failure as a capacity conflict.
      // "time_unavailable": the Heure itself is no longer offerable (capacity
      // reached, below the délai minimum, or never a valid candidate at all).
      reason: "closed" | "party_size_too_large" | "time_unavailable"
    }

export function deriveReservationAcceptance(
  input: ReservationAcceptanceInput
): ReservationAcceptance {
  const { date, time, party_size, services, reservations, closures, config, now } =
    input

  const context = resolveOpenDayContext(
    date,
    closures,
    services,
    reservations,
    config,
    now
  )
  if (!context) {
    return { accepted: false, reason: "closed" }
  }

  if (party_size > config.max_party_size) {
    return { accepted: false, reason: "party_size_too_large" }
  }

  const requestedMin = hhmmToMinutes(time)

  for (const { startMin, service } of offerableCandidates(
    context.todaysServices,
    context.existingIntervals,
    config,
    context.requestedDay,
    party_size,
    context.earliestStartMs
  )) {
    if (startMin === requestedMin) {
      return {
        accepted: true,
        service_window_id: service.id,
        duration_minutes: service.duration_minutes,
      }
    }
  }

  return { accepted: false, reason: "time_unavailable" }
}
