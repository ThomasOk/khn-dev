import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANNOUNCEMENT_MODULE } from "../../../modules/announcement"
import AnnouncementModuleService from "../../../modules/announcement/service"
import { createAnnouncementWorkflow } from "../../../workflows/announcement/create-announcement"
import { CreateAnnouncementSchema } from "./middlewares"

// GET /admin/announcements — every Annonce, période la plus proche d'abord.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: AnnouncementModuleService = req.scope.resolve(
    ANNOUNCEMENT_MODULE
  )

  const announcements = await service.listAnnouncements(
    {},
    { order: { start_date: "ASC" } }
  )

  res.json({ announcements })
}

// POST /admin/announcements — write a new Annonce. Reduced scope for this
// ticket: no overlap refusal yet.
export async function POST(
  req: MedusaRequest<CreateAnnouncementSchema>,
  res: MedusaResponse
) {
  const { result } = await createAnnouncementWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ announcement: result })
}
