"use server"

import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import {
  formatFormuleSelection,
  hasFormuleSelection,
  FormuleSelectionEntry,
} from "@lib/util/formule-selection"

import { getAuthHeaders, getCacheOptions } from "./cookies"

// Mirrors the store route's contract (apps/backend/src/api/store/formules).
// `calculated_price` travels through untyped: the storefront never displays
// a curated Variante's own price (the Formule's price is fixed, ADR 0001) —
// it is only here because the route contract requires it.
// One Option/value pair a curated Variante was built from (e.g. "Viande 1" →
// "Porc") — what lets a grouped Variante picker offer one select per Option
// instead of one row per Variante combination (see
// lib/util/formule-variant-group.ts).
export type FormuleComposantVariantOption = {
  option_id: string
  option_title: string
  value: string
}

export type FormuleComposantVariant = {
  id: string
  title: string
  // Raw Variante title ("Porc / Tofu"), undecorated by the Produit name —
  // what a grouped Variante picker shows once `product_title` already
  // carries the dish name (see formule-composer-modal.tsx's grouping).
  variant_title: string
  product_id: string
  product_title: string
  thumbnail: string | null
  calculated_price: Record<string, unknown> | null
  options: FormuleComposantVariantOption[]
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

// Resolves every cart line's Sélection to something readable — Composant
// `label` → chosen Variante `title` (User Story 13), never the raw
// `formule_<key>_variant_id` keys the client wrote. One Curation lookup per
// distinct Formule product in the cart, not per line, so two identical
// Formules with different Sélections cost the same single request as one.
export const getCartFormuleSelections = async (
  cart: HttpTypes.StoreCart
): Promise<Record<string, FormuleSelectionEntry[]>> => {
  const regionId = cart.region_id
  const items = cart.items ?? []

  if (!regionId) {
    return {}
  }

  const formuleProductIds = Array.from(
    new Set(
      items
        .filter((item) => hasFormuleSelection(item.metadata))
        .map((item) => item.product_id)
        .filter((productId): productId is string => !!productId)
    )
  )

  const curations = await Promise.all(
    formuleProductIds.map((productId) => getFormule(productId, regionId))
  )
  const curationByProductId = new Map(
    formuleProductIds.map((productId, index) => [productId, curations[index]])
  )

  const selections: Record<string, FormuleSelectionEntry[]> = {}

  for (const item of items) {
    const curation = item.product_id
      ? curationByProductId.get(item.product_id)
      : undefined

    if (!curation) {
      continue
    }

    const entries = formatFormuleSelection(item.metadata, curation.composants)

    if (entries.length > 0) {
      selections[item.id] = entries
    }
  }

  return selections
}
