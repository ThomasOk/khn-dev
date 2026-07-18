import { invoiceIssuanceYear } from "../issuance-year"

describe("invoiceIssuanceYear", () => {
  it("reads the year from restaurant (Paris) wall-clock time, not UTC", () => {
    // 23:30 UTC on Dec 31 is already Jan 1st in Paris (UTC+1 in winter) —
    // the exact edge this function exists to get right.
    const issuedAt = new Date("2026-12-31T23:30:00.000Z")
    expect(invoiceIssuanceYear(issuedAt)).toEqual(2027)
  })

  it("reads a mid-year date straightforwardly", () => {
    const issuedAt = new Date("2026-07-16T12:30:00.000Z")
    expect(invoiceIssuanceYear(issuedAt)).toEqual(2026)
  })
})
