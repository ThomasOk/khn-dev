import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PICKUP_MODULE } from "../../modules/pickup"
import PickupModuleService from "../../modules/pickup/service"

// Configuration du retrait — a SINGLE row carrying the Délai de préparation and
// the slot duration. The admin edits it in place, so the write is an upsert: the
// conditional "create or update" lives inside the step (a plain async function),
// never in the workflow body (which forbids conditionals).

export type UpsertConfigInput = {
  prep_delay_minutes: number
  slot_duration_minutes: number
  restaurant_notification_email?: string | null
}

const upsertConfigStep = createStep(
  "upsert-config",
  async (input: UpsertConfigInput, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    const [existing] = await service.listPickupConfigs()
    const config = existing
      ? await service.updatePickupConfigs({ id: existing.id, ...input })
      : await service.createPickupConfigs(input)
    return new StepResponse(config)
  }
)

export const upsertPickupConfigWorkflow = createWorkflow(
  "upsert-pickup-config",
  (input: UpsertConfigInput) => {
    return new WorkflowResponse(upsertConfigStep(input))
  }
)
