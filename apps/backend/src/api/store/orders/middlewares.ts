import {
  authenticate,
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// Mirrors Medusa's native POST /store/orders/:id/transfer/request body
// shape (its own StoreRequestOrderTransfer validator) — same request, just
// keyed by the customer-facing display_id instead of the order's internal
// id, which the storefront never shows the customer anywhere (order
// details page and confirmation email both only render display_id).
export const RequestOrderTransferByDisplayIdSchema = z.object({
  description: z.string().optional(),
  update_order_email: z.boolean().optional(),
})
export type RequestOrderTransferByDisplayIdSchema = z.infer<
  typeof RequestOrderTransferByDisplayIdSchema
>

export const orderTransferStoreMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/orders/display/:display_id/transfer/request",
    method: "POST",
    middlewares: [
      // Not covered by any of Medusa's native middleware matchers (those
      // only match "/store/orders/:id/..." — one path segment, not this
      // route's "/store/orders/display/:display_id/transfer/request") —
      // must be declared explicitly, same guard the native transfer/request
      // route carries.
      authenticate("customer", ["session", "bearer"]),
      validateAndTransformBody(RequestOrderTransferByDisplayIdSchema),
    ],
  },
]
