import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ANNOUNCEMENT_MODULE } from "../../../modules/announcement"
import AnnouncementModuleService from "../../../modules/announcement/service"
import { civilDayAt, civilDayKey } from "../../../lib/time/restaurant-time"

// GET /store/announcement — the Annonce whose Période d'annonce covers today,
// or null (the common case). The ONLY clock read for this module: it computes
// the current Paris civil day, then makes a request. No derivation function is
// introduced — `start_date <= today <= end_date` is a database filter, not a
// pure calculation to isolate.
//
// Only `headline` crosses the wire (ADR: the storefront has no use for `id` or
// dates — there is nothing to dismiss, so nothing to key by).
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: AnnouncementModuleService = req.scope.resolve(
    ANNOUNCEMENT_MODULE
  )

  const today = civilDayKey(civilDayAt(Date.now()))

  const announcements = await service.listAnnouncements(
    {
      start_date: { $lte: today },
      end_date: { $gte: today },
    },
    // If two Annonces covered today (data seeded outside the API — the create
    // route accepts one at a time), pick the most recently started one. `id`
    // is a tie-break for equal start_date, so the pick stays deterministic
    // across requests rather than depending on Postgres' unspecified order
    // for ties. Never fails on the ambiguity.
    { order: { start_date: "DESC", id: "ASC" } }
  )

  const current = announcements[0]

  res.json({
    announcement: current ? { headline: current.headline } : null,
  })
}
