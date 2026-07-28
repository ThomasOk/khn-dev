import {
  createStep,
  createWorkflow,
  StepResponse,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { ICartModuleService } from "@medusajs/framework/types"

export type DetachCartCustomerWorkflowInput = {
  cart_id: string
  customer_id: string
}

type CartAddressSnapshot = Record<string, unknown> | null

type DetachCartCustomerStepCompensationInput = {
  cart_id: string
  customer_id: string | null
  email: string | null
  shipping_address: CartAddressSnapshot
  billing_address: CartAddressSnapshot
}

// Strips relation identifiers so the snapshot can be replayed as a create
// payload on compensation (same discipline as complete-cart.js, which
// deletes `shippingAddress.id` before copying a cart's address onto the
// order it creates) — restoring the exact field values, even though the
// restored address is a new row rather than the original one.
function toAddressSnapshot(address: CartAddressSnapshot): CartAddressSnapshot {
  if (!address) {
    return null
  }

  const { id: _id, ...fields } = address as Record<string, unknown>
  return fields
}

// Reverses the native transferCartCustomerWorkflow (@medusajs/core-flows,
// cart/workflows/transfer-cart-customer.js): that workflow pins
// customer_id/email onto the cart record itself when a customer logs in, and
// nothing native ever clears it back. Ticket 09 ("la déconnexion garde le
// panier") keeps the same cart alive past logout, so without this, a guest
// checkout completed later on that same cart still carries the departed
// customer's customer_id straight onto the order (complete-cart.js:
// `customer_id: cart.customer?.id`) — which then makes
// sync-customer-billing-address-from-order silently overwrite that
// customer's saved billing address with whatever the next, unauthenticated
// person typed in. Clearing customer_id/email/addresses here is what makes
// the cart an actual guest cart again, not just an unauthenticated session
// pointed at someone else's identity.
const detachCartCustomerStep = createStep(
  "detach-cart-customer",
  async (
    input: DetachCartCustomerWorkflowInput,
    { container }
  ) => {
    const cartModuleService: ICartModuleService = container.resolve(
      Modules.CART
    )

    const cart = await cartModuleService.retrieveCart(input.cart_id, {
      select: ["id", "customer_id", "email"],
      relations: ["shipping_address", "billing_address"],
    })

    const previous: DetachCartCustomerStepCompensationInput = {
      cart_id: input.cart_id,
      customer_id: cart.customer_id ?? null,
      email: cart.email ?? null,
      shipping_address: toAddressSnapshot(
        (cart.shipping_address as Record<string, unknown> | undefined) ?? null
      ),
      billing_address: toAddressSnapshot(
        (cart.billing_address as Record<string, unknown> | undefined) ?? null
      ),
    }

    // Idempotent: a cart that was never attached, or already detached
    // (retried call, double logout), is a no-op rather than an error.
    if (!cart.customer_id) {
      return new StepResponse({ detached: false }, previous)
    }

    // A cart attached to someone ELSE is refused, never silently detached —
    // this route is reached with the caller's own actor_id, so a mismatch
    // means the cart belongs to a different customer entirely.
    if (cart.customer_id !== input.customer_id) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "This cart is not attached to the requesting customer."
      )
    }

    await cartModuleService.updateCarts(input.cart_id, {
      customer_id: null,
      email: null,
      shipping_address: null,
      billing_address: null,
    })

    return new StepResponse({ detached: true }, previous)
  },
  async (previous, { container }) => {
    if (!previous?.customer_id) {
      return
    }

    const cartModuleService: ICartModuleService = container.resolve(
      Modules.CART
    )

    await cartModuleService.updateCarts(previous.cart_id, {
      customer_id: previous.customer_id,
      email: previous.email,
      shipping_address: previous.shipping_address,
      billing_address: previous.billing_address,
    })
  }
)

export const detachCartCustomerWorkflow = createWorkflow(
  "detach-cart-customer",
  function (input: DetachCartCustomerWorkflowInput) {
    const result = detachCartCustomerStep(input)

    // Same discipline as transferCartCustomerWorkflow: prices/promotions can
    // be customer-group-scoped, so actually dropping the customer must
    // refresh the cart's items back to guest pricing. Skipped on the
    // idempotent no-op path (nothing was attached to begin with).
    when(result, (result) => result.detached).then(() => {
      refreshCartItemsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          force_refresh: true,
        },
      })
    })

    return new WorkflowResponse(result)
  }
)

export default detachCartCustomerWorkflow
