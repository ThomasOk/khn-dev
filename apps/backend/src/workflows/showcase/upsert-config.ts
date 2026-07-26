import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { SHOWCASE_MODULE } from "../../modules/showcase"
import ShowcaseModuleService from "../../modules/showcase/service"

// Mode vitrine — a SINGLE row carrying `enabled` and `note`. The admin edits
// it in place, so the write is an upsert: the conditional "create or update"
// lives inside the step (a plain async function), never in the workflow body
// (which forbids conditionals). Same shape as upsertPickupConfigWorkflow.

export type UpsertShowcaseConfigInput = {
  enabled: boolean
  note: string | null
}

const upsertShowcaseConfigStep = createStep(
  "upsert-showcase-config",
  async (input: UpsertShowcaseConfigInput, { container }) => {
    const service: ShowcaseModuleService = container.resolve(SHOWCASE_MODULE)
    const [existing] = await service.listShowcaseConfigs()
    const config = existing
      ? await service.updateShowcaseConfigs({ id: existing.id, ...input })
      : await service.createShowcaseConfigs(input)
    return new StepResponse(config)
  }
)

export const upsertShowcaseConfigWorkflow = createWorkflow(
  "upsert-showcase-config",
  (input: UpsertShowcaseConfigInput) => {
    return new WorkflowResponse(upsertShowcaseConfigStep(input))
  }
)
