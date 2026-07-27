import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "@medusajs/medusa/core-flows"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { IAuthModuleService } from "@medusajs/framework/types"

export type ChangeCustomerPasswordWorkflowInput = {
  customer_id: string
  old_password: string
  new_password: string
}

type VerifyCustomerPasswordStepInput = {
  email: string
  password: string
}

// The native `/auth/customer/emailpass/update` route only accepts a
// reset-purpose token (Medusa 2.16.0, `validate-token.js`) — a plain session
// bearer token gets a flat 401, and the only native way to mint a
// reset-purpose token delivers it exclusively by email (never back to the
// caller). That's why this is a custom workflow calling the Auth module
// directly instead of the native route: there's no native path left for an
// authenticated, session-based, silent password change.
//
// Because we bypass that route, its old-password check disappears with it —
// the emailpass provider's own `update()` never verifies one (see
// `emailpass.js`: it hashes and overwrites unconditionally). This step
// re-implements that check the only way the provider exposes: attempting an
// authenticate() with the old password.
const verifyCustomerPasswordStep = createStep(
  "verify-customer-password",
  async (input: VerifyCustomerPasswordStepInput, { container }) => {
    const authModuleService: IAuthModuleService = container.resolve(
      Modules.AUTH
    )

    const { success } = await authModuleService.authenticate("emailpass", {
      body: { email: input.email, password: input.password },
    })

    if (!success) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Old password is incorrect"
      )
    }

    return new StepResponse({ verified: true })
  }
)

type UpdateCustomerPasswordStepInput = {
  email: string
  password: string
}

const updateCustomerPasswordStep = createStep(
  "update-customer-password",
  async (input: UpdateCustomerPasswordStepInput, { container }) => {
    const authModuleService: IAuthModuleService = container.resolve(
      Modules.AUTH
    )

    const { success, error } = await authModuleService.updateProvider(
      "emailpass",
      { password: input.password, entity_id: input.email }
    )

    if (!success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        error || "Failed to update password"
      )
    }

    return new StepResponse({ success: true })
  }
)

export const changeCustomerPasswordWorkflow = createWorkflow(
  "change-customer-password",
  function (input: ChangeCustomerPasswordWorkflowInput) {
    const { data: customers } = useQueryGraphStep({
      entity: "customer",
      fields: ["id", "email"],
      filters: { id: input.customer_id },
    })

    const email = transform(
      { customers },
      ({ customers }) => customers[0].email as string
    )

    // `verified` is threaded into updateInput below purely to create a data
    // dependency: without it, the workflow engine has no reason to run
    // updateCustomerPasswordStep after verifyCustomerPasswordStep, and a
    // wrong old password could lose the race against the update.
    const verified = verifyCustomerPasswordStep(
      transform({ email, input }, ({ email, input }) => ({
        email,
        password: input.old_password,
      }))
    )

    const updateInput = transform(
      { email, input, verified },
      ({ email, input, verified: _verified }) => ({
        email,
        password: input.new_password,
      })
    )

    const result = updateCustomerPasswordStep(updateInput)

    return new WorkflowResponse(result)
  }
)

export default changeCustomerPasswordWorkflow
