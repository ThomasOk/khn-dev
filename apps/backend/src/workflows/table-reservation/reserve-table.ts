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

export type ReserveTableInput = {
  date: string
  time: string
  party_size: number
  name: string
  email: string
  phone: string
  note?: string | null
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

type JobResult = ReserveTableResult | { outcome: "unavailable" }

const reserveTableStep = createStep(
  "reserve-table",
  async (input: ReserveTableInput, { container }) => {
    const tableReservation: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    const locking: ILockingModule = container.resolve(Modules.LOCKING)

    const lockKey = `table-reservation:${input.date}`

    let jobResult: JobResult
    try {
      jobResult = await locking.execute<JobResult>(
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

          const reservation = await tableReservation.createTableReservations({
            date: input.date,
            time: input.time,
            party_size: input.party_size,
            // Snapshotted from the accepted Service, never re-read from it
            // afterwards (ADR 0006).
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
