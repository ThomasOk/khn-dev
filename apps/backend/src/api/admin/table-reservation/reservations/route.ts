import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../../../../modules/table-reservation"
import TableReservationModuleService from "../../../../modules/table-reservation/service"
import { YMD } from "../middlewares"

// GET /admin/table-reservation/reservations?date=YYYY-MM-DD — the Feuille de
// service: one day's Réservations, by ascending Heure (ticket 07). Only
// `confirmed` ones are returned — a cancelled Réservation never belongs on
// the sheet the restaurateur reads standing up before service.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const date = req.query.date

  if (typeof date !== "string" || !YMD.test(date)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "date is required and must be YYYY-MM-DD"
    )
  }

  const service: TableReservationModuleService = req.scope.resolve(
    TABLE_RESERVATION_MODULE
  )

  const reservations = await service.listTableReservations(
    { date, status: "confirmed" },
    { order: { time: "ASC" } }
  )

  res.json({ reservations })
}
