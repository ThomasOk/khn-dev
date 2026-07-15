import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../../modules/pickup"
import PickupModuleService from "../../modules/pickup/service"

// Fermetures exceptionnelles (exceptional closures) — a civil day on which pickup
// is closed, with an optional reason. Declared and removed from the admin. As with
// the schedule workflows, each mutation is a single step with nothing to
// compensate.

export type CreateClosureInput = {
  date: string
  reason?: string | null
}

const createClosureStep = createStep(
  "create-closure",
  async (input: CreateClosureInput, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    // `date` is unique in the model; catch the clash here so the admin gets a
    // clear message instead of a raw Postgres constraint error in a toast.
    const [existing] = await service.listClosures({ date: input.date })
    if (existing) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A closure is already declared on ${input.date}.`
      )
    }
    const closure = await service.createClosures(input)
    return new StepResponse(closure)
  }
)

export const createPickupClosureWorkflow = createWorkflow(
  "create-pickup-closure",
  (input: CreateClosureInput) => {
    return new WorkflowResponse(createClosureStep(input))
  }
)

const deleteClosureStep = createStep(
  "delete-closure",
  async (id: string, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    await service.deleteClosures(id)
    return new StepResponse(id)
  }
)

export const deletePickupClosureWorkflow = createWorkflow(
  "delete-pickup-closure",
  (input: { id: string }) => {
    return new WorkflowResponse(deleteClosureStep(input.id))
  }
)
