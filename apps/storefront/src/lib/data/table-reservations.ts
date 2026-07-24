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

export type ReservationSettings = {
  max_party_size: number | null
  large_party_phone: string | null
}

// Unlike getReservationAvailability, this needs no date/party_size — it's
// the admin Configuration's public subset, so the storefront can render a
// couverts picker or the large-party phone line before either is chosen.
export const getReservationSettings = async (): Promise<ReservationSettings> => {
  return sdk.client.fetch<ReservationSettings>(
    "/store/table-reservations/settings",
    {
      method: "GET",
      cache: "no-store",
    }
  )
}

export type ReservationOpenDays = {
  party_size: number
  // Civil days ("YYYY-MM-DD") within the horizon that have at least one
  // offerable Heure for this party_size — closed and fully-booked days are
  // already excluded server-side, never filtered here.
  open_dates: string[]
}

export const getReservationOpenDays = async (params: {
  party_size: number
}): Promise<ReservationOpenDays> => {
  return sdk.client.fetch<ReservationOpenDays>(
    "/store/table-reservations/open-days",
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

export type TableReservationLookup = {
  id: string
  date: string
  time: string
  party_size: number
  status: "confirmed" | "cancelled"
}

// Read-only — never cancels anything. Lets the cancellation page show WHAT
// it's about to cancel and wait for an explicit click, instead of the link
// itself being the trigger (which an email client's link-scanning security
// can follow on its own before the customer ever opens the page).
export const getTableReservation = async (params: {
  id: string
  token: string
}): Promise<TableReservationLookup> => {
  return sdk.client.fetch<TableReservationLookup>(
    `/store/table-reservations/${params.id}`,
    {
      method: "GET",
      query: { token: params.token },
      cache: "no-store",
    }
  )
}
