// F-2026-000123 : the year, then the sequential number zero-padded to 6
// digits (ADR 0002 — numbering format and yearly series).
export function formatInvoiceNumber(year: number, number: number): string {
  return `F-${year}-${String(number).padStart(6, "0")}`
}
