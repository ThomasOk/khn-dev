import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import changeCustomerPasswordWorkflow from "../../../../../workflows/customer/change-password"
import { ChangeCustomerPasswordSchema } from "./middlewares"

// POST /store/customers/me/password — changes the logged-in customer's
// password, authenticated by their session. See change-password.ts for why
// this route exists at all: the native `/auth/customer/emailpass/update`
// route only accepts reset-purpose tokens, which only ever reach the client
// by email, so there's no native way to do a silent, session-based change.
export async function POST(
  req: AuthenticatedMedusaRequest<ChangeCustomerPasswordSchema>,
  res: MedusaResponse
) {
  const { old_password, new_password } = req.validatedBody

  await changeCustomerPasswordWorkflow(req.scope).run({
    input: {
      customer_id: req.auth_context.actor_id,
      old_password,
      new_password,
    },
  })

  res.status(200).json({ success: true })
}
