import { deriveInvoiceFrozenData, InvoiceIssuer, OrderForInvoice } from "../frozen-data"

// Seam 3 of the spec: a Commande fixture (+ config émetteur) -> frozen_data,
// asserted directly — no DB, no network. Mirrors
// src/lib/pdf/__tests__/kitchen-ticket.unit.spec.ts.

const issuer: InvoiceIssuer = {
  legal_name: "Kim-Hi Noodle SASU",
  address: "12 rue de la Paix, 75002 Paris",
  siren: "123456789",
  siret: "12345678900012",
  vat_number: "FR12123456789",
  legal_form: "SASU",
  share_capital: "10 000 €",
  rcs_city: "Paris",
}

// Three lines at three distinct restaurant tax rates (spec §"Configuration
// TVA": 10 % conso immédiate / 5,5 % conso différée / 20 % alcool). Each
// line's tax_lines carries a rate and total already computed by Medusa — the
// values this function must read, never recompute. No `unit_price` field:
// this store's prices are tax-inclusive (order-confirmation.ts's "Prices are
// tax-inclusive" note), so the PU HT column must come from `subtotal` (HT),
// never from a TTC unit_price — the type doesn't even offer that field.
const order: OrderForInvoice = {
  created_at: "2026-07-16T10:00:00.000Z",
  shipping_address: {
    first_name: "Marie",
    last_name: "Dupont",
    company: null,
    address_1: "3 rue des Lilas",
    address_2: null,
    postal_code: "75011",
    city: "Paris",
    country_code: "fr",
  },
  items: [
    {
      title: "Nouilles sautées",
      quantity: 2,
      subtotal: 24,
      tax_lines: [{ rate: 10, total: 2.4 }],
    },
    {
      title: "Nouilles à emporter",
      quantity: 1,
      subtotal: 10,
      tax_lines: [{ rate: 5.5, total: 0.55 }],
    },
    {
      title: "Vin rouge",
      quantity: 1,
      subtotal: 8,
      tax_lines: [{ rate: 20, total: 1.6 }],
    },
  ],
}

describe("deriveInvoiceFrozenData", () => {
  it("ventilates HT/TVA/TTC by rate and totals correctly across several lines and rates", () => {
    const frozenData = deriveInvoiceFrozenData({
      order,
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.tax_breakdown).toEqual([
      { rate: 5.5, subtotal_excl_tax: 10, tax_amount: 0.55, subtotal_incl_tax: 10.55 },
      { rate: 10, subtotal_excl_tax: 24, tax_amount: 2.4, subtotal_incl_tax: 26.4 },
      { rate: 20, subtotal_excl_tax: 8, tax_amount: 1.6, subtotal_incl_tax: 9.6 },
    ])
    expect(frozenData.totals).toEqual({
      total_excl_tax: 42,
      total_tax: 4.55,
      total_incl_tax: 46.55,
    })
  })

  it("reads each line's rate and tax amount from tax_lines, never recalculating them", () => {
    const frozenData = deriveInvoiceFrozenData({
      order,
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.lines).toEqual([
      {
        title: "Nouilles sautées",
        quantity: 2,
        unit_price_excl_tax: 12,
        tax_rate: 10,
        tax_amount: 2.4,
      },
      {
        title: "Nouilles à emporter",
        quantity: 1,
        unit_price_excl_tax: 10,
        tax_rate: 5.5,
        tax_amount: 0.55,
      },
      {
        title: "Vin rouge",
        quantity: 1,
        unit_price_excl_tax: 8,
        tax_rate: 20,
        tax_amount: 1.6,
      },
    ])
  })

  it("derives PU HT from the line's HT subtotal divided by quantity, for a multi-unit line", () => {
    const frozenData = deriveInvoiceFrozenData({
      order: {
        ...order,
        items: [
          {
            title: "Samoussas",
            quantity: 3,
            subtotal: 15,
            tax_lines: [{ rate: 5.5, total: 0.825 }],
          },
        ],
      },
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.lines[0].unit_price_excl_tax).toEqual(5)
  })

  it("makes the total TTC equal the amount meant to be captured for the order", () => {
    const capturedAmount = order.items.reduce(
      (sum, item) => sum + Number(item.subtotal) + Number(item.tax_lines![0].total),
      0
    )

    const frozenData = deriveInvoiceFrozenData({
      order,
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.totals.total_incl_tax).toBeCloseTo(capturedAmount, 2)
  })

  it("uses the shipping_address as the billing address — never a delivery address", () => {
    const frozenData = deriveInvoiceFrozenData({
      order,
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.customer).toEqual({
      name: "Marie Dupont",
      billing_address: {
        company: null,
        address_1: "3 rue des Lilas",
        address_2: null,
        postal_code: "75011",
        city: "Paris",
        country_code: "fr",
      },
    })
  })

  it("carries the issuer config values through untouched", () => {
    const frozenData = deriveInvoiceFrozenData({
      order,
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.issuer).toEqual(issuer)
  })

  it("sets the issuance date from the injected clock and the sale date from the order", () => {
    const frozenData = deriveInvoiceFrozenData({
      order,
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.document.issued_at).toEqual("2026-07-16T12:30:00.000Z")
    expect(frozenData.document.sale_date).toEqual("2026-07-16T10:00:00.000Z")
  })

  it("falls back to 'Client' when the billing address carries no name", () => {
    const frozenData = deriveInvoiceFrozenData({
      order: {
        ...order,
        shipping_address: { ...order.shipping_address, first_name: null, last_name: null },
      },
      issuer,
      issuedAt: new Date("2026-07-16T12:30:00.000Z"),
    })

    expect(frozenData.customer.name).toEqual("Client")
  })
})
