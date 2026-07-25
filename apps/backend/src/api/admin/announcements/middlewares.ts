import {
  MiddlewareRoute,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import {
  hasConsistentLink,
  LINK_URL_PATTERN,
} from "../../../workflows/announcement/manage-announcements"

// Civil day "YYYY-MM-DD" — same shape pickup_closure validates against.
const YMD = /^\d{4}-\d{2}-\d{2}$/

export const CreateAnnouncementSchema = z
  .object({
    headline: z.string().trim().min(1).max(90),
    body: z.string().trim().min(1).nullish(),
    link_label: z.string().trim().min(1).nullish(),
    link_url: z.string().trim().min(1).regex(LINK_URL_PATTERN).nullish(),
    start_date: z.string().regex(YMD),
    end_date: z.string().regex(YMD),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "end_date must be on or after start_date",
    path: ["end_date"],
  })
  // Every field is explicit on a create (there is no existing row to merge
  // onto), so `undefined` here means "absent" for real.
  .refine((d) => hasConsistentLink(d.link_label, d.link_url), {
    message: "link_label and link_url must both be present or both be absent",
    path: ["link_url"],
  })
export type CreateAnnouncementSchema = z.infer<typeof CreateAnnouncementSchema>

export const UpdateAnnouncementSchema = z
  .object({
    headline: z.string().trim().min(1).max(90).optional(),
    body: z.string().trim().min(1).nullish(),
    link_label: z.string().trim().min(1).nullish(),
    link_url: z.string().trim().min(1).regex(LINK_URL_PATTERN).nullish(),
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
  // Only refused here when BOTH fields are present on this request and
  // disagree — same asymmetry as the date check above. A request touching
  // just one of the two (the other left at its current value) can't be
  // judged from the request alone; the workflow re-checks it against the
  // row being merged onto, exactly like the end_date/start_date case.
  .refine(
    (d) =>
      d.link_label === undefined ||
      d.link_url === undefined ||
      hasConsistentLink(d.link_label, d.link_url),
    { message: "link_label and link_url must both be present or both be absent", path: ["link_url"] }
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
