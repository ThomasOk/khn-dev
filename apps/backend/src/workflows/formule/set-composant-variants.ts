import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep, dismissRemoteLinkStep } from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { FORMULE_MODULE } from "../../modules/formule"

// The Curation of a Composant: the full, explicit list of Variantes allowed
// in it (ADR 0001, ADR 0005). The admin sends the desired list as a whole —
// this diffs it against what is currently linked and creates/dismisses only
// what changed. No price ever travels through here.

export type SetComposantVariantsInput = {
  composant_id: string
  variant_ids: string[]
}

type ComposantVariantsDiff = {
  composant_id: string
  added: string[]
  removed: string[]
}

const diffComposantVariantsStep = createStep(
  "diff-composant-variants",
  async (input: SetComposantVariantsInput, { container }) => {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data } = await query.graph({
      entity: "formule_composant",
      fields: ["id", "product_variants.id"],
      filters: { id: input.composant_id },
    })

    if (!data[0]) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Composant ${input.composant_id} does not exist.`
      )
    }

    // Curation must reference real Variantes of the Carte — this is what
    // keeps it a guarantee rather than a UI suggestion (ADR 0005).
    if (input.variant_ids.length > 0) {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id"],
        filters: { id: input.variant_ids },
      })
      const validIds = new Set(variants.map((v) => v.id))
      const unknown = input.variant_ids.filter((id) => !validIds.has(id))
      if (unknown.length > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Unknown Variante id(s): ${unknown.join(", ")}.`
        )
      }
    }

    const current: string[] = (data[0]?.product_variants ?? [])
      .map((variant) => variant?.id)
      .filter((id): id is string => !!id)
    const currentSet = new Set(current)
    const desiredSet = new Set(input.variant_ids)

    const diff: ComposantVariantsDiff = {
      composant_id: input.composant_id,
      added: input.variant_ids.filter((id) => !currentSet.has(id)),
      removed: current.filter((id) => !desiredSet.has(id)),
    }
    return new StepResponse(diff)
  }
)

export const setComposantVariantsWorkflow = createWorkflow(
  "set-composant-variants",
  function (input: SetComposantVariantsInput) {
    const diff = diffComposantVariantsStep(input)

    const linksToCreate = transform({ diff }, (data) =>
      data.diff.added.map((variant_id: string) => ({
        [FORMULE_MODULE]: { formule_composant_id: data.diff.composant_id },
        [Modules.PRODUCT]: { product_variant_id: variant_id },
      }))
    )
    createRemoteLinkStep(linksToCreate)

    const linksToDismiss = transform({ diff }, (data) =>
      data.diff.removed.map((variant_id: string) => ({
        [FORMULE_MODULE]: { formule_composant_id: data.diff.composant_id },
        [Modules.PRODUCT]: { product_variant_id: variant_id },
      }))
    )
    dismissRemoteLinkStep(linksToDismiss)

    return new WorkflowResponse(diff)
  }
)
