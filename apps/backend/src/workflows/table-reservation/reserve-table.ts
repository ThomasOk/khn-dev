import { randomUUID } from "node:crypto"
import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { ILockingModule } from "@medusajs/framework/types"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"
import { TableReservationEvents } from "../../modules/table-reservation/events"
import { deriveReservationAcceptance } from "../../lib/reservation/derive-availability"
import { createRateLimiter } from "../../lib/reservation/rate-limiter"
import {
  civilDayAt,
  civilDayKey,
  wallTimeToTimestamp,
} from "../../lib/time/restaurant-time"

// The only place in the table-reservation feature with a real concurrency
// problem (ADR 0006): two customers can race for the last Couverts of the
// same date. The search for availability and the insert therefore run
// together inside ONE job, locked on a key derived from the date — never
// split into a "check" step followed by a separate "create" step, which
// would reopen exactly the race the lock exists to close.
const LOCK_TIMEOUT_SECONDS = 5

// Both the in-memory and the postgres locking providers reject with exactly
// this message when the timeout elapses before the lock is acquired (see
// their `getTimeout` in @medusajs/locking's providers/in-memory.js and
// @medusajs/locking-postgres's services/advisory-lock.js) — the module gives
// no typed error to distinguish it by. The job body below never throws for
// an expected outcome (every business result is returned, not thrown), so
// this is the only signal that separates "the lock itself timed out" — the
// one case ADR 0006 asks to be reported as a retry-inviting 409 — from a
// genuine bug inside the job, which must surface as itself, not be disguised
// as a customer-facing conflict.
const LOCK_TIMEOUT_MESSAGE = "Timed-out acquiring lock."

// Ticket 08's "garde-fous": three silent, hardcoded circuit breakers on a
// public route with no account, none of them touching the Réservation's own
// state (ADR 0008 — "sans état supplémentaire"). None of these numbers are
// admin-configurable on purpose: unlike the Configuration (min_lead_minutes,
// horizon_days, …), they aren't a business dial anyone is expected to tune —
// they exist purely to blunt abuse, well above any volume real usage of a
// small dining room ever produces.
//
// The per-email and per-IP limits are deliberately per-process (see
// rate-limiter.ts) — they are not the anti-fraud measure, only a blunt
// deterrent against a script or a stuck retry loop. The daily plafond, by
// contrast, is backed by the ALREADY-PERSISTED table_reservation rows (their
// own `created_at`), so it holds across restarts and instances without a
// single new column or table.
// Exported so the HTTP tests can hit exactly up to each boundary instead of
// duplicating these numbers.
export const EMAIL_RATE_LIMIT = { windowMs: 10 * 60_000, max: 8 }
export const IP_RATE_LIMIT = { windowMs: 10 * 60_000, max: 20 }
export const DAILY_RESERVATION_CAP = 120

const emailRateLimiter = createRateLimiter(EMAIL_RATE_LIMIT)
const ipRateLimiter = createRateLimiter(IP_RATE_LIMIT)

export type ReserveTableInput = {
  date: string
  time: string
  party_size: number
  name: string
  email: string
  phone: string
  note?: string | null
  ip: string
  now_ms: number // epoch ms — the route is the only clock read (see api route)
}

export type ReserveTableResult =
  | {
      outcome: "created"
      reservation: {
        id: string
        date: string
        time: string
        party_size: number
        cancellation_token: string
      }
    }
  | {
      // Distinct from a capacity conflict on purpose: the storefront shows
      // the téléphone instead of retrying, so this is returned rather than
      // thrown — a thrown MedusaError's body has no room for extra data.
      outcome: "party_size_too_large"
      large_party_phone: string
    }

type JobResult =
  | ReserveTableResult
  | { outcome: "unavailable" }
  // Same email, same Service (ADR 0008: no state added to distinguish this
  // from any other refusal — it is read back from the confirmed rows
  // already fetched for the date, never from a flag). A cancelled
  // Réservation never matches: it already dropped out of the "confirmed"
  // filter both this check and the capacity search share.
  | { outcome: "duplicate" }
  | { outcome: "daily_cap_reached" }

const reserveTableStep = createStep(
  "reserve-table",
  async (input: ReserveTableInput, { container }) => {
    const tableReservation: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    const locking: ILockingModule = container.resolve(Modules.LOCKING)

    const normalizedEmail = input.email.trim().toLowerCase()

    // Guard rails run BEFORE the lock is even acquired: they gate on
    // dimensions (email, IP, the day a row would be CREATED) that have
    // nothing to do with ADR 0006's per-date capacity race, so there is no
    // reason to serialize them behind it.
    if (
      !emailRateLimiter.allow(normalizedEmail, input.now_ms) ||
      !ipRateLimiter.allow(input.ip, input.now_ms)
    ) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "Too many reservation attempts. Please wait a few minutes and try again, or call the restaurant."
      )
    }

    const startOfToday = wallTimeToTimestamp(civilDayAt(input.now_ms), 0)
    // Keyed on the CREATION day (today), never on `input.date` (the day being
    // booked) — a world apart from the per-date lock below. Reading the
    // day's count and inserting must happen as one atomic step, exactly like
    // the capacity search: read-then-insert with no lock in between is the
    // same race ADR 0006 closes, just on this guard's own key. Nesting it
    // OUTSIDE the per-date lock (rather than skipping it) means every
    // Réservation created anywhere today serializes through this one job,
    // which is the only way the plafond holds against a burst instead of
    // just against a slow trickle.
    const dailyCapLockKey = `table-reservation:daily-cap:${civilDayKey(
      civilDayAt(input.now_ms)
    )}`

    const lockKey = `table-reservation:${input.date}`

    let jobResult: JobResult
    try {
      jobResult = await locking.execute<JobResult>(
        dailyCapLockKey,
        async () => {
          const createdToday = await tableReservation.listTableReservations({
            created_at: { $gte: new Date(startOfToday) },
          })
          if (createdToday.length >= DAILY_RESERVATION_CAP) {
            return { outcome: "daily_cap_reached" }
          }

          return await locking.execute<JobResult>(
            lockKey,
            async () => {
              const [configs, services, closures, existingReservations] =
                await Promise.all([
                  tableReservation.listTableReservationConfigs(),
                  tableReservation.listServiceWindows(),
                  tableReservation.listReservationClosures(),
                  tableReservation.listTableReservations({
                    date: input.date,
                    status: "confirmed",
                  }),
                ])

              const config = configs[0]
              if (!config) {
                return { outcome: "unavailable" }
              }

              const acceptance = deriveReservationAcceptance({
                date: input.date,
                time: input.time,
                party_size: input.party_size,
                services,
                reservations: existingReservations.map((r) => ({
                  time: r.time,
                  party_size: r.party_size,
                  duration_minutes: r.duration_minutes,
                })),
                closures,
                config,
                now: new Date(input.now_ms),
              })

              if (!acceptance.accepted) {
                if (acceptance.reason === "party_size_too_large") {
                  return {
                    outcome: "party_size_too_large",
                    large_party_phone: config.large_party_phone,
                  }
                }
                return { outcome: "unavailable" }
              }

              // The double-click / refresh case (ticket 08): checked here,
              // INSIDE the same locked job that inserts, against the very
              // `existingReservations` the capacity search just read — never
              // as a separate pre-check, which two simultaneous double-clicks
              // would sail through exactly as they would the capacity race
              // (ADR 0006). The lock key is derived from `input.date` alone,
              // and a duplicate necessarily targets that same date, so this
              // reuses that lock rather than adding a second one.
              const isDuplicate = existingReservations.some(
                (existing) =>
                  existing.customer_email.trim().toLowerCase() ===
                    normalizedEmail &&
                  existing.service_window_id === acceptance.service_window_id
              )
              if (isDuplicate) {
                return { outcome: "duplicate" }
              }

              const reservation = await tableReservation.createTableReservations({
                date: input.date,
                time: input.time,
                party_size: input.party_size,
                // Snapshotted from the accepted Service, never re-read from
                // it afterwards (ADR 0006).
                duration_minutes: acceptance.duration_minutes,
                service_window_id: acceptance.service_window_id,
                status: "confirmed",
                customer_name: input.name,
                customer_email: input.email,
                customer_phone: input.phone,
                note: input.note ?? null,
                cancellation_token: randomUUID(),
              })

              return {
                outcome: "created",
                reservation: {
                  id: reservation.id,
                  date: reservation.date,
                  time: reservation.time,
                  party_size: reservation.party_size,
                  cancellation_token: reservation.cancellation_token,
                },
              }
            },
            { timeout: LOCK_TIMEOUT_SECONDS }
          )
        },
        { timeout: LOCK_TIMEOUT_SECONDS }
      )
    } catch (error) {
      // Only a genuine lock-acquisition timeout gets the retry-inviting 409
      // ADR 0006 asks for. Anything else that escaped the job (a real bug, a
      // DB failure) is NOT ours to reinterpret as "try again" — it propagates
      // as itself, so it surfaces as a 500 and gets investigated rather than
      // silently hidden behind a plausible-looking conflict.
      if (error instanceof Error && error.message === LOCK_TIMEOUT_MESSAGE) {
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "Reservations are busy right now — please try again."
        )
      }
      throw error
    }

    if (jobResult.outcome === "unavailable") {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "This Heure de réservation is no longer available. Please choose another one."
      )
    }

    if (jobResult.outcome === "duplicate") {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "You already have a confirmed Réservation for this Service. Cancel it from your confirmation email before booking again."
      )
    }

    if (jobResult.outcome === "daily_cap_reached") {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "The restaurant can't take any more online reservations today. Please call to book."
      )
    }

    return new StepResponse(jobResult)
  }
)

const reserveTableWorkflow = createWorkflow(
  "reserve-table",
  function (input: ReserveTableInput) {
    const result = reserveTableStep(input)

    // Only a genuine "created" outcome is worth a notification — never
    // "party_size_too_large", which never touched the database (ticket 06).
    when(result, (result) => result.outcome === "created").then(function () {
      const reservationId = transform({ result }, ({ result }) => {
        if (result.outcome !== "created") {
          return ""
        }
        return result.reservation.id
      })

      emitEventStep({
        eventName: TableReservationEvents.RESERVED,
        data: { id: reservationId },
      })
    })

    return new WorkflowResponse(result)
  }
)

export default reserveTableWorkflow
