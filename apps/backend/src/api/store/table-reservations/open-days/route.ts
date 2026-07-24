import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { getOpenDays } from "../../../../lib/reservation/get-open-days"

// GET /store/table-reservations/open-days?party_size= — which civil days in
// the horizon have at least one offerable Heure for this party_size. Lets
// the storefront's date picker skip closed and fully-booked days entirely
// instead of only discovering the gap after a day is already selected.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const partySizeRaw = req.query.party_size

  const party_size = Number(partySizeRaw)
  if (!Number.isInteger(party_size) || party_size <= 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "party_size is required and must be a positive integer"
    )
  }

  const result = await getOpenDays(req.scope, { party_size }, new Date())

  res.json({ party_size, open_dates: result.open_dates })
}
