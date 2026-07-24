import { MedusaContainer } from "@medusajs/framework"
import { TABLE_RESERVATION_MODULE } from "../../modules/table-reservation"
import TableReservationModuleService from "../../modules/table-reservation/service"
import { addDays, civilDayAt, civilDayKey } from "../time/restaurant-time"
import { deriveOpenDays, ExistingReservationInput } from "./derive-availability"

// Shared by GET /store/table-reservations/open-days — resolves the same
// admin configuration getAvailability does, but fetches every `confirmed`
// Réservation in the horizon with ONE ranged query (dates sort
// lexicographically, see civilDayKey) instead of one query per day, then
// hands deriveOpenDays the whole horizon to walk in memory.
export type OpenDaysQuery = {
  party_size: number
}

export type OpenDaysResult = {
  open_dates: string[]
}

export async function getOpenDays(
  container: MedusaContainer,
  query: OpenDaysQuery,
  now: Date
): Promise<OpenDaysResult> {
  const service: TableReservationModuleService = container.resolve(
    TABLE_RESERVATION_MODULE
  )
  const [services, configs, closures] = await Promise.all([
    service.listServiceWindows(),
    service.listTableReservationConfigs(),
    service.listReservationClosures(),
  ])
  const config = configs[0]

  // No Configuration row means there is nothing to derive a horizon from —
  // same posture as getAvailability's empty-config outcome.
  if (!config) {
    return { open_dates: [] }
  }

  const today = civilDayAt(now.getTime())
  const todayKey = civilDayKey(today)
  const horizonEndKey = civilDayKey(addDays(today, config.horizon_days))

  const reservations = await service.listTableReservations({
    status: "confirmed",
    date: { $gte: todayKey, $lte: horizonEndKey },
  })

  const reservationsByDate = new Map<string, ExistingReservationInput[]>()
  for (const r of reservations) {
    const forDate = reservationsByDate.get(r.date) ?? []
    forDate.push({
      time: r.time,
      party_size: r.party_size,
      duration_minutes: r.duration_minutes,
    })
    reservationsByDate.set(r.date, forDate)
  }

  const open_dates = deriveOpenDays({
    party_size: query.party_size,
    services,
    reservationsByDate,
    closures,
    config,
    now,
  })

  return { open_dates }
}
