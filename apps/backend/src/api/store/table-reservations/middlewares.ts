import { MiddlewareRoute, validateAndTransformBody } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// The route is public — every value here is a field the client controls, and
// the workflow revalidates all of them again (including date/time/party_size
// against the current Services, closures and capacity). This schema only
// rejects malformed shapes, never business rules.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const YMD = /^\d{4}-\d{2}-\d{2}$/

export const CreateTableReservationSchema = z.object({
  date: z.string().regex(YMD),
  time: z.string().regex(HHMM),
  party_size: z.number().int().min(1),
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.string().trim().min(1),
  note: z.string().trim().min(1).nullish(),
})
export type CreateTableReservationSchema = z.infer<
  typeof CreateTableReservationSchema
>

export const CancelTableReservationSchema = z.object({
  token: z.string().trim().min(1),
})
export type CancelTableReservationSchema = z.infer<
  typeof CancelTableReservationSchema
>

export const tableReservationStoreMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/store/table-reservations",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateTableReservationSchema)],
  },
  {
    matcher: "/store/table-reservations/:id/cancel",
    method: "POST",
    middlewares: [validateAndTransformBody(CancelTableReservationSchema)],
  },
]
