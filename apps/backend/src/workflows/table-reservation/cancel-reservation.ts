import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"

// The customer's only self-service action on a Réservation (ADR 0008: no
// modification, no other lifecycle). No lock is needed here — unlike
// reserve-table.ts, releasing Couverts never competes with anything else for
// them, so there is no race to close.

export type CancelReservationInput = {
  id: string
  token: string
  now_ms: number // epoch ms — the route is the only clock read (see api route)
}

export type CancelReservationResult = {
  id: string
  status: "cancelled"
}

const cancelReservationStep = createStep(
  "cancel-reservation",
  async (input: CancelReservationInput, { container }) => {
    const tableReservation: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )

    const [reservation] = await tableReservation.listTableReservations({
      id: input.id,
    })

    // Identical 404 for an unknown id and for a wrong token: nothing here
    // may tell someone probing ids apart from someone guessing tokens.
    if (!reservation || reservation.cancellation_token !== input.token) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No Réservation found for this id and token."
      )
    }

    // Idempotent: the customer's second click on the same link must return
    // 200, not an error, and must not overwrite the first cancellation's
    // cancelled_at.
    if (reservation.status === "cancelled") {
      return new StepResponse({ id: reservation.id, status: "cancelled" as const })
    }

    const cancelled = await tableReservation.updateTableReservations({
      id: input.id,
      status: "cancelled",
      cancelled_at: new Date(input.now_ms),
    })

    return new StepResponse({ id: cancelled.id, status: "cancelled" as const })
  }
)

const cancelReservationWorkflow = createWorkflow(
  "cancel-table-reservation",
  function (input: CancelReservationInput) {
    return new WorkflowResponse(cancelReservationStep(input))
  }
)

export default cancelReservationWorkflow
