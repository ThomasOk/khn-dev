import { RESTAURANT_TIMEZONE } from "../slots/timezone"
import { ResolvedFormuleCuration } from "../formule/get-curation-for-variant"
import { resolveFormuleSelectionEntries } from "../formule/resolve-selection-entries"
import { PdfMakeDocDefinition } from "./render"

// 80mm in points (72pt/inch, 25.4mm/inch) — the printer roll's width, not a
// convention we're free to round. Verified against pdfmake's own /MediaBox
// output at 226.771654pt (research §6.3), so the test asserts this exact
// constant rather than a re-derivation of it.
const PAGE_WIDTH_80MM_PT = (80 * 72) / 25.4

const amountFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })

function formatAmount(value: number): string {
  return amountFormatter.format(value)
}

export interface KitchenTicketLineItem {
  title: string
  variant_title?: string | null
  quantity: number
  // Tax-inclusive line total (Medusa's `item.total`) — what this line cost,
  // the same figure a restaurateur would recognise from the till, not the
  // HT breakdown the Facture derives (frozen-data.ts's unit_price_excl_tax).
  line_total: number
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
  // Medusa's display_id, formatted by the caller (e.g. "42") — the same
  // number staff see in the admin order list, for cross-referencing.
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email: string
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

// Medusa auto-names the sole Variante of a Produit with no real Options
// "Default variant" (every Formule, per ADR 0001's "exactly one Variante
// carrying the fixed price") — a label with no meaning to the kitchen, so
// it's suppressed rather than printed as if it distinguished anything.
const DEFAULT_VARIANT_TITLE = "Default variant"

// Medusa's native `variant_title` already carries a Variante's flattened
// option values (e.g. "Bœuf, Saté (contient arachide)" — research §6.2c) —
// exactly the seasoning/allergen text `orecap.pdf` lets a page break
// separate from its plat. Concatenating it into the same text run, rather
// than a sibling content block, is what keeps the two on one page-break-proof
// block (User Stories 6, 13). Quantity lives in its own table column, not in
// this label, now that the ticket is a Produit/Qté/Total table.
function lineItemLabel(item: KitchenTicketLineItem): string {
  const hasMeaningfulVariant =
    item.variant_title && item.variant_title !== DEFAULT_VARIANT_TITLE
  const detail = hasMeaningfulVariant ? ` — ${item.variant_title}` : ""
  return `${item.title}${detail}`
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

// "Label : value", the label bold and the value in the default weight — the
// same phrasing as orecap.pdf's "Client:"/"Téléphone:"/"Email:" lines.
function labeledLine(label: string, value: string) {
  return { text: [{ text: `${label} : `, bold: true }, { text: value }] }
}

function orderTotal(order: KitchenTicketOrder): number {
  return order.items.reduce((sum, item) => sum + item.line_total, 0)
}

function itemRow(item: KitchenTicketLineItem) {
  return [
    { stack: [{ text: lineItemLabel(item) }, ...selectionLines(item)] },
    { text: String(item.quantity), alignment: "right" as const },
    { text: formatAmount(item.line_total), alignment: "right" as const },
  ]
}

// Compact table borders tuned for the 80mm roll: the built-in
// `lightHorizontalLines` layout pads 8pt either side of every column, which
// on a ~200pt content width leaves too little room for the Produit column.
// A rule under the header and between every row is the separation a busy
// ticket needs (feedback: order lines blurred together without one).
const ticketTableLayout = {
  hLineWidth: (i: number, node: { table: { body: unknown[]; headerRows: number } }) =>
    i === 0 || i === node.table.body.length ? 0 : i === node.table.headerRows ? 1 : 0.5,
  vLineWidth: () => 0,
  hLineColor: (i: number, node: { table: { headerRows: number } }) =>
    i === node.table.headerRows ? "#000000" : "#bbbbbb",
  paddingLeft: () => 0,
  paddingRight: (i: number, node: { table: { widths: unknown[] } }) =>
    i === node.table.widths.length - 1 ? 0 : 6,
  paddingTop: () => 3,
  paddingBottom: () => 3,
}

// Pure: no database, no network, no container — an order-shaped object in,
// a pdfmake docDefinition out (spec's Seam 1, User Story 19). Content order
// is fixed by the spec, not incidental: the order number sits above the
// Créneau as a small reference line, but the Créneau itself stays the
// biggest, boldest text on the ticket — it's what orders the kitchen's
// work (User Stories 4, 14), and orecap.pdf's mistake was burying it below
// a same-weight order title. Explicitly absent: everything specific to the
// Facture (billing address, TVA breakdown, invoice numbering) — the
// Produit/Qté/Total table, the grand total, and the Client/Téléphone/Email
// block deliberately mirror orecap.pdf's content, by request.
export function buildKitchenTicketDocDefinition(
  order: KitchenTicketOrder
): PdfMakeDocDefinition {
  return {
    pageSize: { width: PAGE_WIDTH_80MM_PT, height: "auto" },
    pageMargins: [12, 12, 12, 12],
    defaultStyle: { font: "Roboto", fontSize: 9, alignment: "left" },
    content: [
      { text: `Commande #${order.order_number}`, fontSize: 9 },
      {
        text: formatPickupSlot(order.pickup_slot_start, order.pickup_slot_end),
        bold: true,
        fontSize: 14,
        margin: [0, 2, 0, 0],
      },
      { ...labeledLine("Client", order.customer_name), margin: [0, 8, 0, 0] },
      labeledLine("Téléphone", order.customer_phone),
      labeledLine("Email", order.customer_email),
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto"],
          body: [
            [
              { text: "Produit", bold: true },
              { text: "Qté", bold: true, alignment: "right" },
              { text: "Total", bold: true, alignment: "right" },
            ],
            ...order.items.map(itemRow),
          ],
        },
        layout: ticketTableLayout,
        margin: [0, 10, 0, 0],
      },
      {
        text: `Total payé : ${formatAmount(orderTotal(order))}`,
        bold: true,
        alignment: "right",
        margin: [0, 6, 0, 0],
      },
    ],
  }
}
