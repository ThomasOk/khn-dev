import { MedusaContainer } from "@medusajs/framework"
import { PICKUP_MODULE } from "../../modules/pickup"
import PickupModuleService from "../../modules/pickup/service"
import { deriveSlots, Slot } from "./derive-slots"

// Shared by GET /store/pickup-slots and the completeCartWorkflow `validate`
// hook — both need "what is offerable right now", and must derive it the same
// way or the two can silently drift apart.
export async function getOfferableSlots(
  container: MedusaContainer,
  now: Date
): Promise<Slot[]> {
  const pickupService: PickupModuleService = container.resolve(PICKUP_MODULE)
  const [schedules, closures, configs] = await Promise.all([
    pickupService.listPickupSchedules(),
    pickupService.listClosures(),
    pickupService.listPickupConfigs(),
  ])
  const config = configs[0]

  // No configuration row means there is no slot duration to derive anything
  // with — nothing is offerable, same as any other empty-derivation outcome.
  if (!config) {
    return []
  }

  return deriveSlots({ schedules, closures, config, now })
}
