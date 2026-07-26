import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// Note de vitrine: trimmed, nullable, capped at 280 characters. An empty
// string after trim is normalized to null — "pas de note" is a single state,
// not two. No cross-field constraint: enabling without a note is valid, and
// writing a note without enabling is valid too (spec, décision 6).
export const UpsertShowcaseConfigSchema = z.object({
  enabled: z.boolean(),
  note: z
    .string()
    .trim()
    .max(280)
    .nullish()
    .transform((value) => (value ? value : null)),
})
export type UpsertShowcaseConfigSchema = z.infer<
  typeof UpsertShowcaseConfigSchema
>

export const showcaseAdminMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/showcase",
    method: "POST",
    middlewares: [validateAndTransformBody(UpsertShowcaseConfigSchema)],
  },
]
