import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../../modules/pickup"
import PickupModuleService from "../../modules/pickup/service"

// Fermetures exceptionnelles (exceptional closures) — a civil-day period on which
// pickup is closed, with an optional reason. Declared and removed from the admin.
// As with the schedule workflows, each mutation is a single step with nothing to
// compensate.

export type CreateClosureInput = {
  start_date: string
  end_date: string
  reason?: string | null
}

const createClosureStep = createStep(
  "create-closure",
  async (input: CreateClosureInput, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    // Check-then-insert, not a database constraint: the admin is single-operator,
    // so the race window is not a real risk here. Two periods [a, b] and [c, d]
    // overlap iff a <= d && c <= b.
    const existingClosures = await service.listClosures({})
    const overlapping = existingClosures.find(
      (c) => input.start_date <= c.end_date && c.start_date <= input.end_date
    )
    if (overlapping) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `A closure already covers that period (${overlapping.start_date} – ${overlapping.end_date}).`
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
