// Money is rounded to 2 decimals only here, at aggregation — the boundary
// where floating-point sums (0.1 + 0.2, …) would otherwise leak into a
// printed amount.
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export type InvoiceLineForTaxBreakdown = {
  tax_rate: number
  subtotal_excl_tax: number
  tax_amount: number
}

export type TaxBreakdownRow = {
  rate: number
  subtotal_excl_tax: number
  tax_amount: number
  subtotal_incl_tax: number
}

// Ventilation TVA par taux (spec §"frozen_data"): groups lines by their
// already-computed tax rate and sums the HT/TVA amounts Medusa's tax_lines
// produced. Never recomputes a rate or a tax amount — only aggregates them.
export function computeTaxBreakdown(
  lines: InvoiceLineForTaxBreakdown[]
): TaxBreakdownRow[] {
  const totalsByRate = new Map<number, { subtotal_excl_tax: number; tax_amount: number }>()

  for (const line of lines) {
    const existing = totalsByRate.get(line.tax_rate) ?? {
      subtotal_excl_tax: 0,
      tax_amount: 0,
    }
    totalsByRate.set(line.tax_rate, {
      subtotal_excl_tax: existing.subtotal_excl_tax + line.subtotal_excl_tax,
      tax_amount: existing.tax_amount + line.tax_amount,
    })
  }

  return Array.from(totalsByRate.entries())
    .sort(([rateA], [rateB]) => rateA - rateB)
    .map(([rate, totals]) => {
      const subtotal_excl_tax = round2(totals.subtotal_excl_tax)
      const tax_amount = round2(totals.tax_amount)
      return {
        rate,
        subtotal_excl_tax,
        tax_amount,
        subtotal_incl_tax: round2(subtotal_excl_tax + tax_amount),
      }
    })
}
