import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"

// Fermetures de réservation — a civil-day period on which the dining room is
// closed, with an optional reason. Declared and removed from the admin. As
// with the service-window workflows, each mutation is a single step with
// nothing to compensate.

export type CreateReservationClosureInput = {
  start_date: string
  end_date: string
  reason?: string | null
}

const createClosureStep = createStep(
  "create-reservation-closure",
  async (input: CreateReservationClosureInput, { container }) => {
    const service: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    // Check-then-insert, not a database constraint: the admin is single-operator,
    // so the race window is not a real risk here. Two periods [a, b] and [c, d]
    // overlap iff a <= d && c <= b.
    const existingClosures = await service.listReservationClosures({})
    const overlapping = existingClosures.find(
      (c) => input.start_date <= c.end_date && c.start_date <= input.end_date
    )
    if (overlapping) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A closure already covers that period (${overlapping.start_date} – ${overlapping.end_date}).`
      )
    }
    const closure = await service.createReservationClosures(input)
    return new StepResponse(closure)
  }
)

export const createReservationClosureWorkflow = createWorkflow(
  "create-table-reservation-closure",
  (input: CreateReservationClosureInput) => {
    return new WorkflowResponse(createClosureStep(input))
  }
)

const deleteClosureStep = createStep(
  "delete-reservation-closure",
  async (id: string, { container }) => {
    const service: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    await service.deleteReservationClosures(id)
    return new StepResponse(id)
  }
)

export const deleteReservationClosureWorkflow = createWorkflow(
  "delete-table-reservation-closure",
  (input: { id: string }) => {
    return new WorkflowResponse(deleteClosureStep(input.id))
  }
)
