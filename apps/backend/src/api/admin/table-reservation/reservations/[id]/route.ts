import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateReservationWorkflow } from "../../../../../workflows/table-reservation/update-reservation"
import { UpdateTableReservationSchema } from "../../middlewares"

// POST /admin/table-reservation/reservations/:id — correct a Réservation
// from the admin: "le restaurateur peut consulter et corriger une
// Réservation depuis l'admin — le client a appelé" (ticket 07).
export async function POST(
  req: MedusaRequest<UpdateTableReservationSchema>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await updateReservationWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  })

  res.json({ reservation: result })
}
