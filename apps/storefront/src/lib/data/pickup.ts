"use server"

import { sdk } from "@lib/config"

// A pickup slot as the backend transports it: ISO 8601 WITH the restaurant-
// timezone offset (e.g. "2026-07-14T12:15:00+02:00"). Every renderer must pass
// timeZone: "Europe/Paris" to its formatter — the offset alone does not stop a
// phone set to another timezone from displaying the wrong wall-clock.
export type PickupSlot = {
  start: string
  end: string
}

export type PickupSlotsResponse = {
  slots: PickupSlot[]
  // Distinguishes "no slot left today" (orders closed) from a network error: an
  // empty list is ambiguous without it. See the route's contract.
  orders_open: boolean
}

// Reads the offerable pickup slots from the backend through the SDK, which sends
// the publishable key — a raw fetch() would be rejected by the store middleware
// (AGENTS.md). Never cached: the slots depend on the current instant and the
// prep delay, so a cached list would offer expired slots.
export const listPickupSlots = async (): Promise<PickupSlotsResponse> => {
  return sdk.client.fetch<PickupSlotsResponse>("/store/pickup-slots", {
    method: "GET",
    cache: "no-store",
  })
}
