import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import reserveTableWorkflow from "../../../workflows/table-reservation/reserve-table"
import { CreateTableReservationSchema } from "./middlewares"

// POST /store/table-reservations — creates a Réservation, CONFIRMED
// immediately and unconditionally (ADR 0008). Every client-supplied value,
// including the Heure, is revalidated server-side inside the workflow: this
// route is public, so nothing the client sends can be trusted on its own.
//
// The route is the ONLY clock read here (same convention as the availability
// route) — the workflow's step receives `now_ms` and stays free of an
// implicit system-clock read.
export async function POST(
  req: MedusaRequest<CreateTableReservationSchema>,
  res: MedusaResponse
) {
  const { date, time, party_size, name, email, phone, note } = req.validatedBody

  const { result } = await reserveTableWorkflow(req.scope).run({
    input: {
      date,
      time,
      party_size,
      name,
      email,
      phone,
      note,
      now_ms: Date.now(),
    },
  })

  if (result.outcome === "party_size_too_large") {
    // Not a MedusaError: the global error handler strips everything but
    // { code, type, message }, and the storefront needs the téléphone
    // alongside the refusal, not in a second round-trip.
    return res.status(400).json({
      type: "invalid_data",
      message:
        "This party size can't be booked online. Please call the restaurant.",
      large_party_phone: result.large_party_phone,
    })
  }

  res.status(201).json({
    id: result.reservation.id,
    date: result.reservation.date,
    time: result.reservation.time,
    party_size: result.reservation.party_size,
    cancellation_token: result.reservation.cancellation_token,
  })
}
