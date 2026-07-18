import { MedusaContainer } from "@medusajs/framework"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"
import { Availability, deriveAvailability } from "./derive-availability"

// Shared by GET /store/table-reservations/availability — resolves the admin
// configuration and calls the pure deriveAvailability with it. No
// TableReservation can be persisted yet (that model belongs to a later
// ticket): `reservations` is always empty here, so capacity is unconstrained
// by anything already booked, but the shape already matches what a later
// ticket will fill in with real rows.
export type AvailabilityQuery = {
  date: string
  party_size: number
}

export type AvailabilityResult = Availability & {
  max_party_size: number | null
  large_party_phone: string | null
}

export async function getAvailability(
  container: MedusaContainer,
  query: AvailabilityQuery,
  now: Date
): Promise<AvailabilityResult> {
  const service: TableReservationModuleService = container.resolve(
    TABLE_RESERVATION_MODULE
  )
  const [services, configs, closures] = await Promise.all([
    service.listServiceWindows(),
    service.listTableReservationConfigs(),
    service.listReservationClosures(),
  ])
  const config = configs[0]

  // No Configuration row means there is nothing to derive a horizon or a
  // délai minimum from — nothing is offerable, same as any other empty-config
  // outcome (see getOfferableSlots for the pickup equivalent).
  if (!config) {
    return { times: [], open: false, max_party_size: null, large_party_phone: null }
  }

  const availability = deriveAvailability({
    date: query.date,
    party_size: query.party_size,
    services,
    reservations: [],
    closures,
    config,
    now,
  })

  return {
    ...availability,
    max_party_size: config.max_party_size,
    large_party_phone: config.large_party_phone,
  }
}
