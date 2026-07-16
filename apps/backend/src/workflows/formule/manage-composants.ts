import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { FORMULE_MODULE } from "../../modules/formule"
import FormuleModuleService from "../../modules/formule/service"

// Composants (Formule slots) are edited from the widget on the Formule
// Produit's admin page. `key` is deliberately absent from the update input:
// it is immutable once created, because it ends up in `line_item.metadata`
// and a placed order references it (ADR 0005). There is no route to change it.

export type CreateComposantInput = {
  product_id: string
  key: string
  label: string
  rank: number
}

const createComposantStep = createStep(
  "create-composant",
  async (input: CreateComposantInput, { container }) => {
    const service: FormuleModuleService = container.resolve(FORMULE_MODULE)

    const [formule] = await service.listFormules({
      product_id: input.product_id,
    })
    if (!formule) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product ${input.product_id} is not a Formule.`
      )
    }

    // Check-then-insert, not a database constraint: the admin is
    // single-operator (same tradeoff as the pickup module's closure-overlap
    // check, manage-closures.ts), so the race window is not a real risk here.
    const siblings = await service.listFormuleComposants({
      formule_id: formule.id,
    })
    const duplicateKey = siblings.find((c) => c.key === input.key)
    if (duplicateKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `This Formule already has a Composant with key "${input.key}".`
      )
    }

    const composant = await service.createFormuleComposants({
      formule_id: formule.id,
      key: input.key,
      label: input.label,
      rank: input.rank,
    })
    return new StepResponse(composant, composant.id)
  },
  async (composantId, { container }) => {
    if (!composantId) {
      return
    }
    const service: FormuleModuleService = container.resolve(FORMULE_MODULE)
    await service.deleteFormuleComposants(composantId)
  }
)

export const createFormuleComposantWorkflow = createWorkflow(
  "create-formule-composant",
  function (input: CreateComposantInput) {
    return new WorkflowResponse(createComposantStep(input))
  }
)

export type UpdateComposantInput = {
  id: string
  label?: string
  rank?: number
}

const updateComposantStep = createStep(
  "update-composant",
  async (input: UpdateComposantInput, { container }) => {
    const service: FormuleModuleService = container.resolve(FORMULE_MODULE)
    const composant = await service.updateFormuleComposants(input)
    return new StepResponse(composant)
  }
)

export const updateFormuleComposantWorkflow = createWorkflow(
  "update-formule-composant",
  function (input: UpdateComposantInput) {
    return new WorkflowResponse(updateComposantStep(input))
  }
)
