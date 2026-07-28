import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import detachCartCustomerWorkflow from "../../../../../../../workflows/cart/detach-cart-customer"

// DELETE /store/customers/me/carts/:id/customer — mirrors the native
// POST /store/carts/:id/customer (transferCartCustomerWorkflow) in reverse.
// Called by the storefront's signout(), while the customer's own token is
// still valid, to retire the identity a login pinned onto the cart before
// the cart survives past logout (ticket 09, "la déconnexion garde le
// panier"). See detach-cart-customer.ts for why this can't be left to the
// native transfer route or skipped altogether.
export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await detachCartCustomerWorkflow(req.scope).run({
    input: {
      cart_id: req.params.id,
      customer_id: req.auth_context.actor_id,
    },
  })

  res.status(200).json({ success: true })
}
