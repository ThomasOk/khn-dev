import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PICKUP_MODULE } from "../../modules/pickup"
import PickupModuleService from "../../modules/pickup/service"

// Horaires de retrait (pickup schedules) are edited from the admin settings page.
// Each mutation goes through a workflow rather than being called on the module
// service straight from the route — the Medusa convention for all mutations.
// They are single-step, so there is nothing to compensate: if the step throws,
// nothing was committed.

export type CreateScheduleInput = {
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

export type UpdateScheduleInput = {
  id: string
  day_of_week?: number
  start_time?: string
  end_time?: string
  active?: boolean
}

const createScheduleStep = createStep(
  "create-schedule",
  async (input: CreateScheduleInput, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    const schedule = await service.createPickupSchedules(input)
    return new StepResponse(schedule)
  }
)

export const createPickupScheduleWorkflow = createWorkflow(
  "create-pickup-schedule",
  (input: CreateScheduleInput) => {
    return new WorkflowResponse(createScheduleStep(input))
  }
)

const updateScheduleStep = createStep(
  "update-schedule",
  async (input: UpdateScheduleInput, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    const schedule = await service.updatePickupSchedules(input)
    return new StepResponse(schedule)
  }
)

export const updatePickupScheduleWorkflow = createWorkflow(
  "update-pickup-schedule",
  (input: UpdateScheduleInput) => {
    return new WorkflowResponse(updateScheduleStep(input))
  }
)

const deleteScheduleStep = createStep(
  "delete-schedule",
  async (id: string, { container }) => {
    const service: PickupModuleService = container.resolve(PICKUP_MODULE)
    await service.deletePickupSchedules(id)
    return new StepResponse(id)
  }
)

export const deletePickupScheduleWorkflow = createWorkflow(
  "delete-pickup-schedule",
  (input: { id: string }) => {
    return new WorkflowResponse(deleteScheduleStep(input.id))
  }
)
