import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  deleteAnnouncementWorkflow,
  respondToOverlap,
  updateAnnouncementWorkflow,
} from "../../../../workflows/announcement/manage-announcements"
import { UpdateAnnouncementSchema } from "../middlewares"

// POST /admin/announcements/:id — edit an Annonce (headline and/or period).
// Refused with 409 if the new period overlaps another Annonce's, naming the
// conflicting period — the Annonce being edited excludes itself from that
// check.
export async function POST(
  req: MedusaRequest<UpdateAnnouncementSchema>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await updateAnnouncementWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  })

  if (result.outcome === "overlap") {
    return respondToOverlap(result, res)
  }

  res.json({ announcement: result.announcement })
}

// DELETE /admin/announcements/:id — retract an Annonce. It stops being
// served by the store route immediately.
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  await deleteAnnouncementWorkflow(req.scope).run({ input: { id } })

  res.json({ id, object: "announcement", deleted: true })
}
