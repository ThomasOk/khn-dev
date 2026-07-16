import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

export const CreateFormuleSchema = z.object({
  product_id: z.string().trim().min(1),
})
export type CreateFormuleSchema = z.infer<typeof CreateFormuleSchema>

export const CreateComposantSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1),
  rank: z.number().int().min(0),
})
export type CreateComposantSchema = z.infer<typeof CreateComposantSchema>

// No `key` here on purpose: it is immutable once a Composant is created (ADR
// 0005) — there is no route that accepts it for an update.
export const UpdateComposantSchema = z.object({
  label: z.string().trim().min(1).optional(),
  rank: z.number().int().min(0).optional(),
})
export type UpdateComposantSchema = z.infer<typeof UpdateComposantSchema>

export const SetComposantVariantsSchema = z.object({
  variant_ids: z.array(z.string().trim().min(1)),
})
export type SetComposantVariantsSchema = z.infer<
  typeof SetComposantVariantsSchema
>

export const formuleAdminMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/formules",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateFormuleSchema)],
  },
  {
    matcher: "/admin/formules/:product_id/composants",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateComposantSchema)],
  },
  {
    matcher: "/admin/formules/:product_id/composants/:composant_id",
    method: "POST",
    middlewares: [validateAndTransformBody(UpdateComposantSchema)],
  },
  {
    matcher: "/admin/formules/:product_id/composants/:composant_id/variants",
    method: "POST",
    middlewares: [validateAndTransformBody(SetComposantVariantsSchema)],
  },
]
