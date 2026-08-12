"use server"

import { revalidateTag } from "next/cache"
import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions, getCacheTag } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        // +metadata: the default store retrieve-order fields omit top-level
        // metadata (unlike the list endpoint's defaults), so without this the
        // confirmation page's pickup slot silently reads undefined.
        fields:
          "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.variant.options,*items.variant.options.option,*items.product,*items.tax_lines,+metadata",
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, unknown>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields:
          "*items,+items.metadata,*items.variant,*items.variant.options,*items.variant.options.option,*items.product",
        ...filters,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

// The native accept/decline transfer workflows throw raw, untranslated
// MedusaError messages (see acceptOrderTransferValidationStep /
// requestOrderTransferValidationStep in @medusajs/core-flows) — this page
// is customer-facing (reached from an email link, no login required), so
// the handful of cases a customer can actually hit get a French message;
// anything unrecognized falls back to a generic one rather than leaking
// English.
function translateTransferError(message: string): string {
  if (message.includes("Invalid token")) {
    return "Ce lien n'est plus valide."
  }
  if (message.includes("does not have an order transfer request")) {
    return "Cette demande de rattachement n'existe plus ou a déjà été traitée."
  }
  if (message.includes("has been canceled")) {
    return "Cette commande a été annulée."
  }
  return "Une erreur est survenue. Réessayez ou contactez-nous."
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  const { order, error } = await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ order, error: null }))
    .catch((err) => ({ order: null, error: translateTransferError(err.message) }))

  if (order) {
    // The order now belongs to the accepting customer, but the "orders"
    // fetches are force-cached (see listOrders/retrieveOrder) — without
    // this, their order history keeps showing the pre-transfer, empty
    // state until something unrelated happens to revalidate the tag.
    revalidateTag(await getCacheTag("orders"))
  }

  return { success: !!order, error, order }
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({
      success: false,
      error: translateTransferError(err.message),
      order: null,
    }))
}
