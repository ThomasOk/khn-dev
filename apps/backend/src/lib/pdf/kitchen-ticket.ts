import { RESTAURANT_TIMEZONE } from "../slots/timezone"
import { ResolvedFormuleCuration } from "../formule/get-curation-for-variant"
import { resolveFormuleSelectionEntries } from "../formule/resolve-selection-entries"
import { PdfMakeDocDefinition } from "./render"

// 80mm in points (72pt/inch, 25.4mm/inch) — the printer roll's width, not a
// convention we're free to round. Verified against pdfmake's own /MediaBox
// output at 226.771654pt (research §6.3), so the test asserts this exact
// constant rather than a re-derivation of it.
const PAGE_WIDTH_80MM_PT = (80 * 72) / 25.4

export interface KitchenTicketLineItem {
  title: string
  variant_title?: string | null
  quantity: number
  // Raw line item metadata (ADR 0005's flat `formule_<key>_variant_id`
  // keys) and the Curation it resolves against, fetched server-side via
  // getFormuleCurationForVariant (ticket 02) — never present for an
  // ordinary, non-Formule line. resolveFormuleSelectionEntries turns the
  // two into the Sélection this template renders; kept as separate fields
  // rather than pre-resolved entries so this stays the one call site (spec
  // §"La Sélection de Formule sur le ticket": "pas de duplication de cette
  // résolution").
  metadata?: Record<string, unknown> | null
  curation?: ResolvedFormuleCuration | null
}

export interface KitchenTicketOrder {
  customer_name: string
  customer_phone: string
  // ISO 8601 with offset — order.metadata.creneau_debut / creneau_fin (ADR 0004).
  pickup_slot_start: string
  pickup_slot_end: string
  items: KitchenTicketLineItem[]
}

const slotDayFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
})
const slotTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: RESTAURANT_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
})

// e.g. "jeu. 04/07 · 12:15–12:30", always read in restaurant (Paris)
// wall-clock time — the reader is the kitchen counter, never a browser's
// own timezone.
function formatPickupSlot(start: string, end: string): string {
  const day = slotDayFormatter.format(new Date(start))
  const range = `${slotTimeFormatter.format(new Date(start))}–${slotTimeFormatter.format(
    new Date(end)
  )}`
  return `${day} · ${range}`
}

// Medusa's native `variant_title` already carries a Variante's flattened
// option values (e.g. "Bœuf, Saté (contient arachide)" — research §6.2c) —
// exactly the seasoning/allergen text `orecap.pdf` lets a page break
// separate from its plat. Concatenating it into the same text run, rather
// than a sibling content block, is what keeps the two on one page-break-proof
// block (User Stories 6, 13).
function lineItemLabel(item: KitchenTicketLineItem): string {
  const detail = item.variant_title ? ` — ${item.variant_title}` : ""
  return `${item.quantity}× ${item.title}${detail}`
}

// "label — variant name", the same phrasing as the admin order widget
// (admin/widgets/order-formule-selection.tsx) so a Sélection reads the same
// wherever a restaurateur sees it. resolveFormuleSelectionEntries already
// carries the id-based fallback (User Story 17, ticket 02) when a Composant
// or Variante no longer resolves in the current Curation.
function selectionLines(item: KitchenTicketLineItem) {
  return resolveFormuleSelectionEntries(item.metadata, item.curation).map(
    (entry) => ({
      text: `${entry.label} — ${entry.variantLabel}`,
      margin: [12, 2, 0, 0] as [number, number, number, number],
    })
  )
}

// Pure: no database, no network, no container — an order-shaped object in,
// a pdfmake docDefinition out (spec's Seam 1, User Story 19). Content order
// is fixed by the spec, not incidental: the Créneau leads, bold and
// oversized, because it's what orders the kitchen's work (User Stories 4,
// 14) — orecap.pdf buried it as a 4th line in body-weight text. Explicitly
// absent: email, unit price, total — those belong to the Facture, not here.
export function buildKitchenTicketDocDefinition(
  order: KitchenTicketOrder
): PdfMakeDocDefinition {
  return {
    pageSize: { width: PAGE_WIDTH_80MM_PT, height: "auto" },
    pageMargins: [12, 12, 12, 12],
    defaultStyle: { font: "Roboto", fontSize: 9, alignment: "left" },
    content: [
      {
        text: formatPickupSlot(order.pickup_slot_start, order.pickup_slot_end),
        bold: true,
        fontSize: 14,
      },
      { text: order.customer_name, margin: [0, 8, 0, 0] },
      { text: order.customer_phone },
      ...order.items.map((item, index) => ({
        // A Formule's Sélection is grouped in the same stack as its line,
        // indented, in Composant rank order (spec §"La Sélection de Formule
        // sur le ticket") — never the ordre technique of metadata's own
        // keys. Empty for an ordinary line: selectionLines then contributes
        // nothing beyond the line itself.
        stack: [{ text: lineItemLabel(item) }, ...selectionLines(item)],
        margin: [0, index === 0 ? 8 : 4, 0, 0] as [number, number, number, number],
      })),
    ],
  }
}
