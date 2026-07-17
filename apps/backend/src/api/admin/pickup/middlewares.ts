import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// Local wall-clock "HH:MM" (24h) and a civil day "YYYY-MM-DD" — the same shapes
// the pickup models and deriveSlots expect. Validated here so the module never
// stores a malformed time or date.
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const YMD = /^\d{4}-\d{2}-\d{2}$/

export const CreateScheduleSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().regex(HHMM),
    end_time: z.string().regex(HHMM),
    active: z.boolean().optional().default(true),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: "end_time must be after start_time",
    path: ["end_time"],
  })
export type CreateScheduleSchema = z.infer<typeof CreateScheduleSchema>

export const UpdateScheduleSchema = z
  .object({
    day_of_week: z.number().int().min(0).max(6).optional(),
    start_time: z.string().regex(HHMM).optional(),
    end_time: z.string().regex(HHMM).optional(),
    active: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.start_time === undefined ||
      d.end_time === undefined ||
      d.start_time < d.end_time,
    { message: "end_time must be after start_time", path: ["end_time"] }
  )
export type UpdateScheduleSchema = z.infer<typeof UpdateScheduleSchema>

export const CreateClosureSchema = z
  .object({
    start_date: z.string().regex(YMD),
    end_date: z.string().regex(YMD),
    reason: z.string().trim().min(1).nullish(),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "end_date must be on or after start_date",
    path: ["end_date"],
  })
export type CreateClosureSchema = z.infer<typeof CreateClosureSchema>

export const UpsertConfigSchema = z.object({
  prep_delay_minutes: z.number().int().min(0),
  slot_duration_minutes: z.number().int().min(1),
  restaurant_notification_email: z.string().trim().email().nullish(),
})
export type UpsertConfigSchema = z.infer<typeof UpsertConfigSchema>

export const pickupAdminMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/pickup/schedules",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateScheduleSchema)],
  },
  {
    matcher: "/admin/pickup/schedules/:id",
    method: "POST",
    middlewares: [validateAndTransformBody(UpdateScheduleSchema)],
  },
  {
    matcher: "/admin/pickup/closures",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateClosureSchema)],
  },
  {
    matcher: "/admin/pickup/config",
    method: "POST",
    middlewares: [validateAndTransformBody(UpsertConfigSchema)],
  },
]
