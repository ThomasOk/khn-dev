import { toNum } from "../order/to-num"
import { computeTaxBreakdown, round2, TaxBreakdownRow } from "./tax-breakdown"

// Medusa v2 amounts arrive either as a plain number or as a BigNumberValue
// ({numeric}/{value}) — toNum normalizes either. This alias just names the
// shape so every field that needs it says so, instead of re-explaining it at
// each call site.
type BigNumberLike = unknown

// The restaurant's legal identity, resolved at issuance from IssuerConfig
// (src/modules/invoice/models/issuer-config.ts) — never a hard-coded env var
// (spec §"frozen_data").
export type InvoiceIssuer = {
  legal_name: string
  address: string
  siren: string
  siret: string
  vat_number: string
  legal_form: string
  share_capital: string
  rcs_city: string
}

export type OrderLineItemTaxLineForInvoice = {
  rate: number
  total: BigNumberLike
}

export type OrderLineItemForInvoice = {
  title: string
  quantity: BigNumberLike
  // The line's pre-tax subtotal for its full quantity (Medusa's own
  // `item.subtotal`). This store's prices are tax-inclusive (`unit_price` is
  // TTC, per order-confirmation.ts's "Prices are tax-inclusive" note) — the
  // line's HT unit price is derived from this field, never from
  // `item.unit_price` directly.
  subtotal: BigNumberLike
  tax_lines?: OrderLineItemTaxLineForInvoice[] | null
}

export type OrderAddressForInvoice = {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  postal_code?: string | null
  city?: string | null
  country_code?: string | null
}

export type OrderForInvoice = {
  items: OrderLineItemForInvoice[]
  // Medusa's shipping_address — the Adresse de facturation in this domain,
  // never a delivery address (CONTEXT.md).
  shipping_address?: OrderAddressForInvoice | null
  created_at: string | Date
}

export type InvoiceLine = {
  title: string
  quantity: number
  unit_price_excl_tax: number
  tax_rate: number
  tax_amount: number
}

// frozen_data (spec §"frozen_data" checklist) minus the formatted invoice
// number: the number is attributed inside issueInvoice (ticket 01), in the
// same atomic call this data is passed to as an argument — it cannot exist
// yet when this function runs. The workflow (ticket 03) pairs the resulting
// Invoice.formatted_number with this data when it calls
// buildInvoiceDocDefinition.
export type InvoiceFrozenData = {
  issuer: InvoiceIssuer
  customer: {
    name: string
    billing_address: {
      company: string | null
      address_1: string | null
      address_2: string | null
      postal_code: string | null
      city: string | null
      country_code: string | null
    }
  }
  document: {
    issued_at: string
    sale_date: string
  }
  lines: InvoiceLine[]
  tax_breakdown: TaxBreakdownRow[]
  totals: {
    total_excl_tax: number
    total_tax: number
    total_incl_tax: number
  }
}

function customerName(address: OrderAddressForInvoice | null | undefined): string {
  return [address?.first_name, address?.last_name].filter(Boolean).join(" ") || "Client"
}

// A line's tax amount sums every tax_line's total — the rate itself is
// assumed single-valued per line, which matches this restaurant's tax
// configuration (one rate per product: 10 / 5,5 / 20, spec §"Configuration
// TVA").
function lineTaxAmount(taxLines: OrderLineItemTaxLineForInvoice[] | null | undefined): number {
  return (taxLines ?? []).reduce((sum, taxLine) => sum + toNum(taxLine.total), 0)
}

function lineTaxRate(taxLines: OrderLineItemTaxLineForInvoice[] | null | undefined): number {
  return taxLines?.[0]?.rate ?? 0
}

// Pure: Commande (+ config émetteur) -> frozen_data (spec §"frozen_data").
// Every price and tax figure is read off the order's own tax_lines, never
// recalculated — this function only shapes and aggregates what Medusa
// already computed. `issuedAt` is an injected clock, not a system-clock
// read, following the derive-slots convention (src/lib/slots/derive-slots.ts).
export function deriveInvoiceFrozenData(input: {
  order: OrderForInvoice
  issuer: InvoiceIssuer
  issuedAt: Date
}): InvoiceFrozenData {
  const { order, issuer, issuedAt } = input
  const billingAddress = order.shipping_address ?? null

  // One pass over the order's items: each line's quantity, HT subtotal and
  // tax figures are computed once and reused both for the printed line and
  // for the ventilation's input, instead of re-reading tax_lines twice.
  const itemTotals = order.items.map((item) => ({
    title: item.title,
    quantity: toNum(item.quantity),
    subtotal_excl_tax: toNum(item.subtotal),
    tax_rate: lineTaxRate(item.tax_lines),
    tax_amount: round2(lineTaxAmount(item.tax_lines)),
  }))

  const lines: InvoiceLine[] = itemTotals.map((item) => ({
    title: item.title,
    quantity: item.quantity,
    // Derived from the line's own HT subtotal, not item.unit_price (TTC) —
    // see OrderLineItemForInvoice.subtotal.
    unit_price_excl_tax:
      item.quantity > 0 ? round2(item.subtotal_excl_tax / item.quantity) : 0,
    tax_rate: item.tax_rate,
    tax_amount: item.tax_amount,
  }))

  const taxBreakdown = computeTaxBreakdown(itemTotals)

  const totalExclTax = round2(
    taxBreakdown.reduce((sum, row) => sum + row.subtotal_excl_tax, 0)
  )
  const totalTax = round2(taxBreakdown.reduce((sum, row) => sum + row.tax_amount, 0))

  return {
    issuer,
    customer: {
      name: customerName(billingAddress),
      billing_address: {
        company: billingAddress?.company ?? null,
        address_1: billingAddress?.address_1 ?? null,
        address_2: billingAddress?.address_2 ?? null,
        postal_code: billingAddress?.postal_code ?? null,
        city: billingAddress?.city ?? null,
        country_code: billingAddress?.country_code ?? null,
      },
    },
    document: {
      issued_at: issuedAt.toISOString(),
      sale_date: new Date(order.created_at).toISOString(),
    },
    lines,
    tax_breakdown: taxBreakdown,
    totals: {
      total_excl_tax: totalExclTax,
      total_tax: totalTax,
      total_incl_tax: round2(totalExclTax + totalTax),
    },
  }
}
