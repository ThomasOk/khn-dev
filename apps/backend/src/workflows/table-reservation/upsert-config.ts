import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"

// Configuration de la réservation de table — a SINGLE row. The admin edits it
// in place, so the write is an upsert: the conditional "create or update"
// lives inside the step (a plain async function), never in the workflow body
// (which forbids conditionals).

export type UpsertConfigInput = {
  min_lead_minutes: number
  horizon_days: number
  slot_step_minutes: number
  max_party_size: number
  last_seating_margin_minutes: number
  large_party_phone: string
  restaurant_notification_email?: string | null
}

const upsertConfigStep = createStep(
  "upsert-table-reservation-config",
  async (input: UpsertConfigInput, { container }) => {
    const service: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    const [existing] = await service.listTableReservationConfigs()
    const config = existing
      ? await service.updateTableReservationConfigs({ id: existing.id, ...input })
      : await service.createTableReservationConfigs(input)
    return new StepResponse(config)
  }
)

export const upsertTableReservationConfigWorkflow = createWorkflow(
  "upsert-table-reservation-config",
  (input: UpsertConfigInput) => {
    return new WorkflowResponse(upsertConfigStep(input))
  }
)
