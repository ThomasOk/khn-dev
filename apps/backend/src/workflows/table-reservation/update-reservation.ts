import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"

// The restaurateur's correction of a Réservation from the admin — "le client
// a appelé" (ticket 07). Unlike reserve-table.ts, this never re-derives
// availability: a human already made the call on the phone, and re-checking
// Capacité here would just be a second, silent decision-maker overruling the
// first. A single step, nothing to compensate, same convention as the
// Service-window and closure workflows.

export type UpdateReservationInput = {
  id: string
  date?: string
  time?: string
  party_size?: number
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  note?: string | null
}

const updateReservationStep = createStep(
  "update-reservation",
  async (input: UpdateReservationInput, { container }) => {
    const service: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    const reservation = await service.updateTableReservations(input)
    return new StepResponse(reservation)
  }
)

export const updateReservationWorkflow = createWorkflow(
  "update-table-reservation",
  (input: UpdateReservationInput) => {
    return new WorkflowResponse(updateReservationStep(input))
  }
)
