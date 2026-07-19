import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import cancelReservationWorkflow from "../../../../../workflows/table-reservation/cancel-reservation"
import { CancelTableReservationSchema } from "../../middlewares"

// POST /store/table-reservations/:id/cancel — the customer releases their
// own Réservation from the link in their confirmation email, at any moment
// up to the Heure de réservation: no cutoff (ADR 0008). Idempotent, and an
// unknown id gets the exact same 404 as a wrong token so nothing is revealed
// to whoever is probing either one.
export async function POST(
  req: MedusaRequest<CancelTableReservationSchema>,
  res: MedusaResponse
) {
  const { id } = req.params
  const { token } = req.validatedBody

  const { result } = await cancelReservationWorkflow(req.scope).run({
    input: { id, token, now_ms: Date.now() },
  })

  res.status(200).json({ id: result.id, status: result.status })
}
