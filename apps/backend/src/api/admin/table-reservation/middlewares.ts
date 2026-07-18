import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// Local wall-clock "HH:MM" (24h) — the same shape the ServiceWindow model and
// deriveAvailability expect. Validated here so the module never stores a
// malformed time.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const YMD = /^\d{4}-\d{2}-\d{2}$/

export const CreateServiceWindowSchema = z
  .object({
    name: z.string().trim().min(1),
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(HHMM),
    end_time: z.string().regex(HHMM),
    capacity: z.number().int().min(1),
    duration_minutes: z.number().int().min(1),
    active: z.boolean().optional().default(true),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: "end_time must be after start_time",
    path: ["end_time"],
  })
export type CreateServiceWindowSchema = z.infer<typeof CreateServiceWindowSchema>

export const UpdateServiceWindowSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: z.string().regex(HHMM).optional(),
    end_time: z.string().regex(HHMM).optional(),
    capacity: z.number().int().min(1).optional(),
    duration_minutes: z.number().int().min(1).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.start_time === undefined ||
      d.end_time === undefined ||
      d.start_time < d.end_time,
    { message: "end_time must be after start_time", path: ["end_time"] }
  )
export type UpdateServiceWindowSchema = z.infer<typeof UpdateServiceWindowSchema>

export const CreateReservationClosureSchema = z
  .object({
    start_date: z.string().regex(YMD),
    end_date: z.string().regex(YMD),
    reason: z.string().trim().min(1).nullish(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "end_date must be on or after start_date",
    path: ["end_date"],
  })
export type CreateReservationClosureSchema = z.infer<
  typeof CreateReservationClosureSchema
>

export const UpsertConfigSchema = z.object({
  min_lead_minutes: z.number().int().min(0),
  horizon_days: z.number().int().min(0),
  slot_step_minutes: z.number().int().min(1),
  max_party_size: z.number().int().min(1),
  last_seating_margin_minutes: z.number().int().min(0),
  large_party_phone: z.string().trim().min(1),
  restaurant_notification_email: z.string().trim().email().nullish(),
})
export type UpsertConfigSchema = z.infer<typeof UpsertConfigSchema>

export const tableReservationAdminMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/table-reservation/service-windows",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateServiceWindowSchema)],
  },
  {
    matcher: "/admin/table-reservation/service-windows/:id",
    method: "POST",
    middlewares: [validateAndTransformBody(UpdateServiceWindowSchema)],
  },
  {
    matcher: "/admin/table-reservation/config",
    method: "POST",
    middlewares: [validateAndTransformBody(UpsertConfigSchema)],
  },
  {
    matcher: "/admin/table-reservation/closures",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateReservationClosureSchema)],
  },
]
