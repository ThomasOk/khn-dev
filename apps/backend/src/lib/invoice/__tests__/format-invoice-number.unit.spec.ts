import { formatInvoiceNumber } from "../format-invoice-number"

describe("formatInvoiceNumber", () => {
  it("formats a year and sequence into F-YYYY-NNNNNN, zero-padded to 6 digits", () => {
    expect(formatInvoiceNumber(2026, 123)).toEqual("F-2026-000123")
  })

  it("zero-pads a single-digit sequence", () => {
    expect(formatInvoiceNumber(2026, 1)).toEqual("F-2026-000001")
  })

  it("does not truncate a sequence wider than 6 digits", () => {
    expect(formatInvoiceNumber(2026, 1234567)).toEqual("F-2026-1234567")
  })
})
