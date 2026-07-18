import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"

// Services are edited from the admin settings page. Each mutation goes through
// a workflow rather than being called on the module service straight from the
// route — the Medusa convention for all mutations. They are single-step, so
// there is nothing to compensate: if the step throws, nothing was committed.

export type CreateServiceWindowInput = {
  name: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  duration_minutes: number
  active: boolean
}

export type UpdateServiceWindowInput = {
  id: string
  name?: string
  day_of_week?: number
  start_time?: string
  end_time?: string
  capacity?: number
  duration_minutes?: number
  active?: boolean
}

const createServiceWindowStep = createStep(
  "create-service-window",
  async (input: CreateServiceWindowInput, { container }) => {
    const service: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    const serviceWindow = await service.createServiceWindows(input)
    return new StepResponse(serviceWindow)
  }
)

export const createServiceWindowWorkflow = createWorkflow(
  "create-table-reservation-service-window",
  (input: CreateServiceWindowInput) => {
    return new WorkflowResponse(createServiceWindowStep(input))
  }
)

const updateServiceWindowStep = createStep(
  "update-service-window",
  async (input: UpdateServiceWindowInput, { container }) => {
    const service: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    const serviceWindow = await service.updateServiceWindows(input)
    return new StepResponse(serviceWindow)
  }
)

export const updateServiceWindowWorkflow = createWorkflow(
  "update-table-reservation-service-window",
  (input: UpdateServiceWindowInput) => {
    return new WorkflowResponse(updateServiceWindowStep(input))
  }
)

const deleteServiceWindowStep = createStep(
  "delete-service-window",
  async (id: string, { container }) => {
    const service: TableReservationModuleService = container.resolve(
      TABLE_RESERVATION_MODULE
    )
    await service.deleteServiceWindows(id)
    return new StepResponse(id)
  }
)

export const deleteServiceWindowWorkflow = createWorkflow(
  "delete-table-reservation-service-window",
  (input: { id: string }) => {
    return new WorkflowResponse(deleteServiceWindowStep(input.id))
  }
)
