import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PICKUP_MODULE } from "../../../modules/pickup"
import PickupModuleService from "../../../modules/pickup/service"
import { deriveSlots } from "../../../lib/slots/derive-slots"
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
  const pickupService: PickupModuleService = req.scope.resolve(PICKUP_MODULE)

  const [schedules, closures, configs] = await Promise.all([
    pickupService.listPickupSchedules(),
    pickupService.listClosures(),
    pickupService.listPickupConfigs(),
  ])

  const config = configs[0]
  // No configuration means there is no slot duration to slice a window with:
  // serve the closed state rather than crashing the public route.
  if (!config) {
    res.json({ slots: [], orders_open: false })
    return
  }

  // The route is the ONLY clock read; deriveSlots itself stays a pure function
  // with an injected `now` so the daylight-saving behaviour stays testable.
  const slots = deriveSlots({
    schedules,
    closures,
    config,
    now: new Date(),
  })

  res.json({
    slots: slots.map((slot) => ({
      start: toRestaurantIso(slot.start),
      end: toRestaurantIso(slot.end),
    })),
    orders_open: slots.length > 0,
  })
}
