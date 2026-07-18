import { MedusaService } from "@medusajs/framework/utils"
import ServiceWindow from "./models/service-window"
import TableReservationConfig from "./models/table-reservation-config"

// The table-reservation module owns the *configuration* of the dining room —
// its Services and its Configuration. It references no Medusa entity (no
// Order, no Customer, no Product) and shares nothing with `pickup` (ADR
// 0007): a Réservation is not a Commande.
class TableReservationModuleService extends MedusaService({
  ServiceWindow,
  TableReservationConfig,
}) {}

export default TableReservationModuleService
