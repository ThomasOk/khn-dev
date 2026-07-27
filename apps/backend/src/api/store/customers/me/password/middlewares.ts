import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// Authentication is already covered by the native
// `authenticate("customer", ["session", "bearer"])` middleware Medusa
// registers for the `/store/customers/me*` wildcard — this schema only
// guards the request shape.
export const ChangeCustomerPasswordSchema = z.object({
  old_password: z.string().min(1),
  new_password: z.string().min(1),
})
export type ChangeCustomerPasswordSchema = z.infer<
  typeof ChangeCustomerPasswordSchema
>

export const customerPasswordStoreMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/customers/me/password",
    method: "POST",
    middlewares: [validateAndTransformBody(ChangeCustomerPasswordSchema)],
  },
]
