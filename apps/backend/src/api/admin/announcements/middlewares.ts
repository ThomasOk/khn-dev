import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"

// Civil day "YYYY-MM-DD" — same shape pickup_closure validates against.
const YMD = /^\d{4}-\d{2}-\d{2}$/

export const CreateAnnouncementSchema = z
  .object({
    headline: z.string().trim().min(1).max(90),
    start_date: z.string().regex(YMD),
    end_date: z.string().regex(YMD),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "end_date must be on or after start_date",
    path: ["end_date"],
  })
export type CreateAnnouncementSchema = z.infer<typeof CreateAnnouncementSchema>

export const UpdateAnnouncementSchema = z
  .object({
    headline: z.string().trim().min(1).max(90).optional(),
    start_date: z.string().regex(YMD).optional(),
    end_date: z.string().regex(YMD).optional(),
  })
  .refine(
    (d) =>
      d.start_date === undefined ||
      d.end_date === undefined ||
      d.end_date >= d.start_date,
    { message: "end_date must be on or after start_date", path: ["end_date"] }
  )
export type UpdateAnnouncementSchema = z.infer<typeof UpdateAnnouncementSchema>

export const announcementAdminMiddlewares: MiddlewareRoute[] = [
  {
    matcher: "/admin/announcements",
    method: "POST",
    middlewares: [validateAndTransformBody(CreateAnnouncementSchema)],
  },
  {
    matcher: "/admin/announcements/:id",
    method: "POST",
    middlewares: [validateAndTransformBody(UpdateAnnouncementSchema)],
  },
]
