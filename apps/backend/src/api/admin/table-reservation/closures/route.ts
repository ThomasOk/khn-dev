import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TABLE_RESERVATION_MODULE } from "../../../../modules/table-reservation"
import TableReservationModuleService from "../../../../modules/table-reservation/service"
import { createReservationClosureWorkflow } from "../../../../workflows/table-reservation/manage-closures"
import { CreateReservationClosureSchema } from "../middlewares"

// GET /admin/table-reservation/closures — the Fermetures de réservation,
// soonest first.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: TableReservationModuleService = req.scope.resolve(
    TABLE_RESERVATION_MODULE
  )

  const closures = await service.listReservationClosures(
    {},
    { order: { start_date: "ASC" } }
  )

  res.json({ closures })
}

// POST /admin/table-reservation/closures — declare a closure over a
// civil-day period, with an optional reason (a privatised evening, a bank
// holiday). A single closed day is the degenerate case start_date ===
// end_date. It wipes that period's Services entirely — click & collect is
// untouched (ADR 0007).
export async function POST(
  req: MedusaRequest<CreateReservationClosureSchema>,
  res: MedusaResponse
) {
  const { result } = await createReservationClosureWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ closure: result })
}
