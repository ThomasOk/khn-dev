import { MedusaError } from "@medusajs/framework/utils"
import TableReservationModuleService from "../../modules/table-reservation/service"

// Shared by the cancellation workflow step and the read-only lookup route:
// both need the exact same "does this id+token pair resolve to a
// Réservation" check, with the identical 404 for an unknown id and for a
// wrong token, so neither can be used to probe one apart from the other.
export async function findReservationByToken(
  tableReservation: TableReservationModuleService,
  id: string,
  token: string
) {
  const [reservation] = await tableReservation.listTableReservations({ id })

  if (!reservation || reservation.cancellation_token !== token) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No Réservation found for this id and token."
    )
  }

  return reservation
}
