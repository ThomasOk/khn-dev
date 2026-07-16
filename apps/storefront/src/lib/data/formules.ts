"use server"

import { sdk } from "@lib/config"

import { getAuthHeaders, getCacheOptions } from "./cookies"

// Mirrors the store route's contract (apps/backend/src/api/store/formules).
// `calculated_price` travels through untyped: the storefront never displays
// a curated Variante's own price (the Formule's price is fixed, ADR 0001) —
// it is only here because the route contract requires it.
export type FormuleComposantVariant = {
  id: string
  title: string
  calculated_price: Record<string, unknown> | null
}

export type FormuleComposant = {
  id: string
  key: string
  label: string
  rank: number
  variants: FormuleComposantVariant[]
}

export type FormuleCuration = {
  id: string
  product_id: string
  composants: FormuleComposant[]
}

// Reads the Curation of a Formule Produit through the SDK, which sends the
// publishable key — a raw fetch() would be rejected by the store middleware
// (AGENTS.md). `null` both when the Produit isn't a Formule (the route's own
// contract) and on any fetch error, so callers can treat both as "render the
// ordinary product actions" without a separate error branch.
export const getFormule = async (
  productId: string,
  regionId: string
): Promise<FormuleCuration | null> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("formules")),
  }

  return sdk.client
    .fetch<{ formule: FormuleCuration | null }>(
      `/store/formules/${productId}`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ formule }) => formule)
    .catch(() => null)
}
