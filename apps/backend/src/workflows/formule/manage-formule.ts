import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { FORMULE_MODULE } from "../../modules/formule"
import FormuleModuleService from "../../modules/formule/service"

// Marking a Produit as a Formule (ADR 0005, spec §"Un modèle Formule
// explicite") is a single insert with nothing to compensate.

export type CreateFormuleInput = {
  product_id: string
}

const createFormuleStep = createStep(
  "create-formule",
  async (input: CreateFormuleInput, { container }) => {
    const service: FormuleModuleService = container.resolve(FORMULE_MODULE)

    const existing = await service.listFormules({
      product_id: input.product_id,
    })
    if (existing.length > 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Product ${input.product_id} is already a Formule.`
      )
    }

    const formule = await service.createFormules(input)
    return new StepResponse(formule, formule.id)
  },
  async (formuleId, { container }) => {
    if (!formuleId) {
      return
    }
    const service: FormuleModuleService = container.resolve(FORMULE_MODULE)
    await service.deleteFormules(formuleId)
  }
)

export const createFormuleWorkflow = createWorkflow(
  "create-formule",
  function (input: CreateFormuleInput) {
    return new WorkflowResponse(createFormuleStep(input))
  }
)
