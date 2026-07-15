import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getOfferableSlots } from "../../../lib/slots/get-offerable-slots"
import { toRestaurantIso } from "../../../lib/slots/format"

// GET /store/pickup-slots — the public contract that tells the storefront which
// pickup slots are offerable right now. Slots are never stored (ADR 0003): they
// are derived on demand from the admin-configured schedule.
//
// `orders_open` is NOT redundant with `slots.length > 0` for the API client: an
// empty list WITH the flag means "no slot left today" (the closed-orders state,
// which deserves a frank message); an empty list without it would be
// indistinguishable from a network error. It is information, not an absence.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // The route is the ONLY clock read; deriveSlots itself stays a pure function
  // with an injected `now` so the daylight-saving behaviour stays testable.
  const slots = await getOfferableSlots(req.scope, new Date())

  res.json({
    slots: slots.map((slot) => ({
      start: toRestaurantIso(slot.start),
      end: toRestaurantIso(slot.end),
    })),
    orders_open: slots.length > 0,
  })
}
