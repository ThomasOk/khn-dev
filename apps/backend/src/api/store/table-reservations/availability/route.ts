import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getAvailability } from "../../../../lib/reservation/get-availability"

const YMD = /^\d{4}-\d{2}-\d{2}$/

// GET /store/table-reservations/availability?date=&party_size= — the public
// contract that tells the storefront which Heures de réservation are
// offerable for a date and a party size. Nothing is stored: availability is
// derived on demand, the same posture as pickup slots.
//
// `open: false` (not an empty `times` alone) is what lets the storefront say
// *why* there is nothing to book — no Service that day, or past the horizon —
// rather than showing a bare empty list. A party_size above the plafond is
// never an error: it is a 200 with `times: []` and the téléphone.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const date = req.query.date
  const partySizeRaw = req.query.party_size

  if (typeof date !== "string" || !YMD.test(date)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "date is required and must be YYYY-MM-DD"
    )
  }

  const party_size = Number(partySizeRaw)
  if (!Number.isInteger(party_size) || party_size <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "party_size is required and must be a positive integer"
    )
  }

  // The route is the ONLY clock read; deriveAvailability itself stays a pure
  // function with an injected `now` so the daylight-saving behaviour stays
  // testable.
  const result = await getAvailability(req.scope, { date, party_size }, new Date())

  res.json({
    date,
    party_size,
    times: result.times,
    open: result.open,
    max_party_size: result.max_party_size,
    large_party_phone: result.large_party_phone,
  })
}
