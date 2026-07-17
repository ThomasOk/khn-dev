import { PDFParse } from "pdf-parse"
import { renderPdfDocDefinitionToBase64 } from "../render"
import { buildInvoiceDocDefinition } from "../invoice"
import { InvoiceFrozenData } from "../../invoice/frozen-data"

// Seam 3 of the spec: buildInvoiceDocDefinition -> pdfmake -> a buffer,
// asserted on directly (no DB, no network). Mirrors
// src/lib/pdf/__tests__/kitchen-ticket.unit.spec.ts.

async function extractText(
  frozenData: InvoiceFrozenData,
  formattedNumber: string
): Promise<string> {
  const base64 = await renderPdfDocDefinitionToBase64(
    buildInvoiceDocDefinition(frozenData, formattedNumber)
  )
  const buffer = Buffer.from(base64, "base64")
  const parser = new PDFParse({ data: buffer })
  const { text } = await parser.getText()
  await parser.destroy()

  // pdfmake word-wraps and pdf-parse turns wrapped lines into "\n" — layout
  // noise, not paragraph structure (same rationale as the kitchen ticket
  // test). Collapsing whitespace tests content adjacency, not wrap points.
  return text.replace(/\s+/g, " ").trim()
}

const frozenData: InvoiceFrozenData = {
  issuer: {
    legal_name: "Kim-Hi Noodle SASU",
    address: "12 rue de la Paix, 75002 Paris",
    siren: "123456789",
    siret: "12345678900012",
    vat_number: "FR12123456789",
    legal_form: "SASU",
    share_capital: "10 000 €",
    rcs_city: "Paris",
  },
  customer: {
    name: "Marie Dupont",
    billing_address: {
      company: null,
      address_1: "3 rue des Lilas",
      address_2: null,
      postal_code: "75011",
      city: "Paris",
      country_code: "fr",
    },
  },
  document: {
    issued_at: "2026-07-16T12:30:00.000Z",
    sale_date: "2026-07-16T10:00:00.000Z",
  },
  lines: [
    {
      title: "Nouilles sautées",
      quantity: 2,
      unit_price_excl_tax: 12,
      tax_rate: 10,
      tax_amount: 2.4,
    },
    { title: "Vin rouge", quantity: 1, unit_price_excl_tax: 8, tax_rate: 20, tax_amount: 1.6 },
  ],
  tax_breakdown: [
    { rate: 10, subtotal_excl_tax: 24, tax_amount: 2.4, subtotal_incl_tax: 26.4 },
    { rate: 20, subtotal_excl_tax: 8, tax_amount: 1.6, subtotal_incl_tax: 9.6 },
  ],
  totals: { total_excl_tax: 32, total_tax: 4, total_incl_tax: 36 },
}

describe("buildInvoiceDocDefinition", () => {
  it("renders to a single-page PDF without error", async () => {
    const text = await extractText(frozenData, "F-2026-000123")
    expect(text.length).toBeGreaterThan(0)
  })

  it("shows the formatted invoice number", async () => {
    const text = await extractText(frozenData, "F-2026-000123")
    expect(text).toContain("F-2026-000123")
  })

  it("shows the issuer's legal mentions", async () => {
    const text = await extractText(frozenData, "F-2026-000123")

    expect(text).toContain("Kim-Hi Noodle SASU")
    expect(text).toContain("12 rue de la Paix, 75002 Paris")
    expect(text).toContain("123456789") // SIREN
    expect(text).toContain("12345678900012") // SIRET
    expect(text).toContain("FR12123456789") // TVA intracommunautaire
    expect(text).toContain("SASU")
    expect(text).toContain("10 000 €") // capital social
    expect(text).toContain("RCS Paris")
  })

  it("shows the client's billing address (never a delivery address)", async () => {
    const text = await extractText(frozenData, "F-2026-000123")

    expect(text).toContain("Marie Dupont")
    expect(text).toContain("3 rue des Lilas")
    expect(text).toContain("75011")
  })

  it("shows the TVA ventilation by rate and the HT/TVA/TTC totals", async () => {
    const text = await extractText(frozenData, "F-2026-000123")

    expect(text).toContain("10 %")
    expect(text).toContain("20 %")
    expect(text).toContain("26,40")
    expect(text).toContain("9,60")
    expect(text).toContain("32,00")
    expect(text).toContain("4,00")
    expect(text).toContain("36,00")
  })

  it("shows each line's designation, quantity, unit price HT, tax rate and tax amount", async () => {
    const text = await extractText(frozenData, "F-2026-000123")

    expect(text).toContain("Nouilles sautées")
    expect(text).toContain("Vin rouge")
    expect(text).toContain("12,00")
    expect(text).toContain("8,00")
    expect(text).toContain("2,40")
    expect(text).toContain("1,60")
  })
})
