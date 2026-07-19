"use server"

import { sdk } from "@lib/config"

// Réservation is a fully separate flow from the Cart/Commande — no cart id,
// no checkout, nothing shared (see CONTEXT.md's Réservation entry). Every
// call here goes through the SDK, never a raw fetch (AGENTS.md), and none of
// it is cached: availability depends on the current instant and on rows
// other customers may create between two calls.

export type ReservationAvailability = {
  date: string
  party_size: number
  times: string[]
  // `open: false` is what lets the page say *why* nothing is offerable
  // (closed day, no Service, beyond the horizon) instead of showing a bare
  // empty list — see apps/backend's availability route contract.
  open: boolean
  max_party_size: number | null
  large_party_phone: string | null
}

export const getReservationAvailability = async (params: {
  date: string
  party_size: number
}): Promise<ReservationAvailability> => {
  return sdk.client.fetch<ReservationAvailability>(
    "/store/table-reservations/availability",
    {
      method: "GET",
      query: params,
      cache: "no-store",
    }
  )
}

export type CreateTableReservationInput = {
  date: string
  time: string
  party_size: number
  name: string
  email: string
  phone: string
  note?: string
}

export type TableReservationConfirmation = {
  id: string
  date: string
  time: string
  party_size: number
  cancellation_token: string
}

export const createTableReservation = async (
  input: CreateTableReservationInput
): Promise<TableReservationConfirmation> => {
  return sdk.client.fetch<TableReservationConfirmation>(
    "/store/table-reservations",
    {
      method: "POST",
      body: input,
    }
  )
}

export type CancelTableReservationResult = {
  id: string
  status: "confirmed" | "cancelled"
}

export const cancelTableReservation = async (params: {
  id: string
  token: string
}): Promise<CancelTableReservationResult> => {
  return sdk.client.fetch<CancelTableReservationResult>(
    `/store/table-reservations/${params.id}/cancel`,
    {
      method: "POST",
      body: { token: params.token },
    }
  )
}
