import { MedusaService } from "@medusajs/framework/utils"
import PickupSchedule from "./models/pickup-schedule"
import Closure from "./models/closure"
import PickupConfig from "./models/pickup-config"

// The pickup module owns the *configuration* of pickup only — never the slots
// themselves, which are never stored (ADR 0003). Slots are derived on demand by
// deriveSlots (src/slots/derive-slots.ts) from what this service persists.
class PickupModuleService extends MedusaService({
  PickupSchedule,
  Closure,
  PickupConfig,
}) {}

export default PickupModuleService
