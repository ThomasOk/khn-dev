import { MedusaContainer } from "@medusajs/framework"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"
import { Availability, deriveAvailability } from "./derive-availability"

// Shared by GET /store/table-reservations/availability — resolves the admin
// configuration and calls the pure deriveAvailability with it. Loads the
// day's `confirmed` Réservations (same query the reserve workflow's locked
// job runs, src/workflows/table-reservation/reserve-table.ts) so a booked
// Heure is actually shown as consumed, and a cancelled one — excluded by the
// `status: "confirmed"` filter itself — frees its Couverts immediately
// (ticket 05).
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
  const [services, configs, closures, reservations] = await Promise.all([
    service.listServiceWindows(),
    service.listTableReservationConfigs(),
    service.listReservationClosures(),
    service.listTableReservations({ date: query.date, status: "confirmed" }),
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
    reservations: reservations.map((r) => ({
      time: r.time,
      party_size: r.party_size,
      duration_minutes: r.duration_minutes,
    })),
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
