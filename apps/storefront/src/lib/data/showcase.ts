"use server"

import { sdk } from "@lib/config"

export type ShowcaseState = {
  showcase_mode: boolean
  note: string | null
}

// Public pages (Carte, fiche produit, accueil) can tolerate up to a minute
// of staleness — same policy as retrieveAnnouncement. The backend refuses
// payment regardless of what this read serves (ticket 01), so a stale
// "orders open" here can never let a payment through, only leave an
// add-to-cart button visible a little longer than it should be.
export const retrieveShowcase = async (): Promise<ShowcaseState> => {
  return sdk.client.fetch<ShowcaseState>("/store/showcase", {
    method: "GET",
    next: { revalidate: 60 },
  })
}

// Cart and checkout are already uncached — they depend on the customer's
// own cart — so freshness here is free. Used at the point closest to
// payment, where a minute of staleness is not an acceptable cost.
export const retrieveShowcaseFresh = async (): Promise<ShowcaseState> => {
  return sdk.client.fetch<ShowcaseState>("/store/showcase", {
    method: "GET",
    cache: "no-store",
  })
}
