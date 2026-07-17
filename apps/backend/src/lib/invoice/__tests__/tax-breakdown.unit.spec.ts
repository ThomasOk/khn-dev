import { computeTaxBreakdown } from "../tax-breakdown"

// Seam 3 of the spec: "le calcul de ventilation TVA par taux (lignes ->
// sous-totaux par taux, totaux HT/TVA/TTC)". Pure aggregation over
// already-computed per-line amounts — never a tax recalculation.

describe("computeTaxBreakdown", () => {
  it("groups several lines at the same rate into one HT/TVA/TTC row", () => {
    const rows = computeTaxBreakdown([
      { tax_rate: 10, subtotal_excl_tax: 24, tax_amount: 2.4 },
      { tax_rate: 10, subtotal_excl_tax: 6, tax_amount: 0.6 },
    ])

    expect(rows).toEqual([
      { rate: 10, subtotal_excl_tax: 30, tax_amount: 3, subtotal_incl_tax: 33 },
    ])
  })

  it("keeps distinct rates as separate rows, sorted ascending regardless of input order", () => {
    const rows = computeTaxBreakdown([
      { tax_rate: 20, subtotal_excl_tax: 8, tax_amount: 1.6 },
      { tax_rate: 5.5, subtotal_excl_tax: 10, tax_amount: 0.55 },
      { tax_rate: 10, subtotal_excl_tax: 24, tax_amount: 2.4 },
    ])

    expect(rows).toEqual([
      { rate: 5.5, subtotal_excl_tax: 10, tax_amount: 0.55, subtotal_incl_tax: 10.55 },
      { rate: 10, subtotal_excl_tax: 24, tax_amount: 2.4, subtotal_incl_tax: 26.4 },
      { rate: 20, subtotal_excl_tax: 8, tax_amount: 1.6, subtotal_incl_tax: 9.6 },
    ])
  })

  it("rounds each subtotal to 2 decimals, absorbing floating-point drift", () => {
    const rows = computeTaxBreakdown([
      { tax_rate: 10, subtotal_excl_tax: 0.1, tax_amount: 0.01 },
      { tax_rate: 10, subtotal_excl_tax: 0.2, tax_amount: 0.02 },
    ])

    expect(rows).toEqual([
      { rate: 10, subtotal_excl_tax: 0.3, tax_amount: 0.03, subtotal_incl_tax: 0.33 },
    ])
  })

  it("returns an empty ventilation for no lines", () => {
    expect(computeTaxBreakdown([])).toEqual([])
  })
})
