import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TABLE_RESERVATION_MODULE } from "../../../../modules/table-reservation"
import TableReservationModuleService from "../../../../modules/table-reservation/service"
import { createServiceWindowWorkflow } from "../../../../workflows/table-reservation/manage-service-windows"
import { CreateServiceWindowSchema } from "../middlewares"

// GET /admin/table-reservation/service-windows — the Services the admin
// settings page renders. Sorted by weekday then start time so several windows
// on the same day (lunch, dinner) read in order.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: TableReservationModuleService = req.scope.resolve(
    TABLE_RESERVATION_MODULE
  )

  const service_windows = await service.listServiceWindows(
    {},
    { order: { day_of_week: "ASC", start_time: "ASC" } }
  )

  res.json({ service_windows })
}

// POST /admin/table-reservation/service-windows — add a Service. Several may
// target the same weekday, which is what separates a lunch service from a
// dinner service.
export async function POST(
  req: MedusaRequest<CreateServiceWindowSchema>,
  res: MedusaResponse
) {
  const { result } = await createServiceWindowWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.status(201).json({ service_window: result })
}
