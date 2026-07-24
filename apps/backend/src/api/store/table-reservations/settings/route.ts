import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { TABLE_RESERVATION_MODULE } from "../../../../modules/table-reservation"
import TableReservationModuleService from "../../../../modules/table-reservation/service"

// GET /store/table-reservations/settings — the subset of the admin
// Configuration safe to expose publicly. Unlike .../availability, this needs
// no date/party_size query, so the storefront can render a couverts picker
// or the large-party phone line before either is known.
// restaurant_notification_email is deliberately never returned here.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: TableReservationModuleService = req.scope.resolve(
    TABLE_RESERVATION_MODULE
  )
  const [config] = await service.listTableReservationConfigs()

  res.json({
    max_party_size: config?.max_party_size ?? null,
    large_party_phone: config?.large_party_phone ?? null,
  })
}
