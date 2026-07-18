import { MedusaService } from "@medusajs/framework/utils"
import ServiceWindow from "./models/service-window"
import TableReservationConfig from "./models/table-reservation-config"
import ReservationClosure from "./models/closure"
import TableReservation from "./models/table-reservation"

// The table-reservation module owns the *configuration* of the dining room —
// its Services, its Configuration, and its own Fermetures de réservation — and
// now the Réservations themselves. It references no Medusa entity (no Order,
// no Customer, no Product) and shares nothing with `pickup` (ADR 0007): a
// Réservation is not a Commande.
class TableReservationModuleService extends MedusaService({
  ServiceWindow,
  TableReservationConfig,
  ReservationClosure,
  TableReservation,
}) {}

export default TableReservationModuleService
