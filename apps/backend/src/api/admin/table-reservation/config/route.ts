import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TABLE_RESERVATION_MODULE } from "../../../../modules/table-reservation"
import TableReservationModuleService from "../../../../modules/table-reservation/service"
import { upsertTableReservationConfigWorkflow } from "../../../../workflows/table-reservation/upsert-config"
import { UpsertConfigSchema } from "../middlewares"

// GET /admin/table-reservation/config — the single Configuration row (horizon,
// délai minimum, pas, taille de groupe maximale, marge de dernier départ,
// téléphone des grands groupes, email de notification), or null before it has
// ever been set.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: TableReservationModuleService = req.scope.resolve(
    TABLE_RESERVATION_MODULE
  )

  const [config] = await service.listTableReservationConfigs()

  res.json({ config: config ?? null })
}

// POST /admin/table-reservation/config — set the Configuration. The first
// value installed will be wrong; this is what lets the restaurant fix it
// without a deploy. It is an upsert: there is only ever one row.
export async function POST(
  req: MedusaRequest<UpsertConfigSchema>,
  res: MedusaResponse
) {
  const { result } = await upsertTableReservationConfigWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ config: result })
}
