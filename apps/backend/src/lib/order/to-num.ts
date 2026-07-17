// Medusa v2 BigNumber objects serialize to {value, numeric} through JSON.
// This helper extracts a plain number from any representation. Shared by the
// order.placed subscribers (order-confirmation, kitchen-ticket-notification),
// which both read line item quantities off the same order shape.
export function toNum(val: unknown): number {
  if (val == null) return 0
  if (typeof val === "object" && val !== null) {
    if ("numeric" in val && typeof (val as any).numeric === "number") return (val as any).numeric
    if ("value" in val) return Number((val as any).value)
  }
  const n = Number(val)
  return isNaN(n) ? 0 : n
}
