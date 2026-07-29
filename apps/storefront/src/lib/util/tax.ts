type ItemWithTax = {
  tax_total?: number | null
  tax_lines?: Array<{ rate: number }> | null
}

export type TaxBreakdownRow = {
  rate: number
  amount: number
}

// A restaurant order can mix multiple rates (10 % conso immédiate, 20 %
// alcool, …), so "dont TVA" must be broken down per rate rather than shown
// as a single assumed percentage. Groups by each item's own rate (single
// rate per line item, per spec "Configuration TVA") and sums the item's own
// tax_total — never `tax_lines[].total`/`.subtotal`, which Medusa computes
// only in-memory for internal total calculations and never persists or
// returns via the Store API (the cart_line_item_tax_line / order line item
// tax line tables only have rate/code/tax_rate_id/provider_id columns).
export function getTaxBreakdown(items?: ItemWithTax[] | null): TaxBreakdownRow[] {
  if (!items?.length) {
    return []
  }

  const amountsByRate = new Map<number, number>()
  for (const item of items) {
    const rate = item.tax_lines?.[0]?.rate
    if (rate === undefined) {
      continue
    }
    amountsByRate.set(rate, (amountsByRate.get(rate) ?? 0) + (item.tax_total ?? 0))
  }

  return Array.from(amountsByRate.entries())
    .sort(([rateA], [rateB]) => rateA - rateB)
    .map(([rate, amount]) => ({ rate, amount }))
}
