import { useQuery } from "@tanstack/react-query"
import { sdk } from "./sdk"

// Shared shapes and helpers for the Showcase mode settings screen and its
// order-list widget. The wire contract is in English (see AGENTS.md); the
// French domain vocabulary (Mode vitrine, Note de vitrine) lives in the docs.

export type ShowcaseConfig = {
  enabled: boolean
  note: string | null
}

// Matches the backend's zod schema (UpsertShowcaseConfigSchema in
// api/admin/showcase/middlewares.ts) — duplicated rather than imported,
// since this file ships in the admin dashboard's browser bundle.
export const NOTE_MAX_LENGTH = 280

// A form default only, exactly like the +14-days end date on the Annonce
// form: shown when the saved note is empty, kept/edited/erased freely, and
// never written back by anything other than an explicit save. It never
// reaches the storefront — /store/showcase only ever serves what is in the
// database.
export const SUGGESTED_NOTE =
  "La commande en ligne est momentanément suspendue."

// Both the settings screen and the order-list widget read and invalidate
// this same cache entry, so turning the mode off from the widget is
// reflected on the settings screen too (and vice versa) without a manual
// reload.
export const SHOWCASE_QUERY_KEY = ["showcase-config"]

export const useShowcaseConfig = () =>
  useQuery({
    queryKey: SHOWCASE_QUERY_KEY,
    queryFn: () => sdk.client.fetch<ShowcaseConfig>("/admin/showcase"),
  })
