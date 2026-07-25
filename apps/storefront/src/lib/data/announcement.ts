"use server"

import { sdk } from "@lib/config"

export type AnnouncementResponse = {
  announcement: {
    headline: string
    body: string | null
    link_label: string | null
    link_url: string | null
  } | null
}

// Reads the current Annonce through the SDK, which sends the publishable key
// — a raw fetch() would be rejected by the store middleware (AGENTS.md).
//
// Cached for 60s — a deliberate divergence from listPickupSlots' "no-store":
// slots depend on the current instant and a preparation delay, where a cache
// would offer expired slots; an Annonce has civil-day granularity and is read
// on every render of every (main) page, so a round trip per render buys
// nothing a minute of staleness doesn't already cost less.
export const retrieveAnnouncement = async (): Promise<AnnouncementResponse> => {
  return sdk.client.fetch<AnnouncementResponse>("/store/announcement", {
    method: "GET",
    next: { revalidate: 60 },
  })
}
