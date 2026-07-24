import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../../../modules/table-reservation"
import TableReservationModuleService from "../../../../modules/table-reservation/service"
import { findReservationByToken } from "../../../../lib/reservation/find-reservation-by-token"

// GET /store/table-reservations/:id?token= — read-only lookup, so the
// cancellation page can show WHAT it's about to cancel and wait for an
// explicit click, instead of cancelling the moment the link is merely
// loaded (which an email client's link-scanning security can trigger on its
// own, before the customer ever sees the page). Nothing here mutates —
// POST .../cancel is still the only route that does.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const token = req.query.token

  if (typeof token !== "string" || !token) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "token is required"
    )
  }

  const service: TableReservationModuleService = req.scope.resolve(
    TABLE_RESERVATION_MODULE
  )
  const reservation = await findReservationByToken(service, id, token)

  res.json({
    id: reservation.id,
    date: reservation.date,
    time: reservation.time,
    party_size: reservation.party_size,
    status: reservation.status,
  })
}
