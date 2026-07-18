import { RESTAURANT_TIMEZONE } from "../slots/timezone"

const yearFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESTAURANT_TIMEZONE,
  year: "numeric",
})

// The InvoiceCounter is keyed by the issuing year in restaurant (Paris)
// wall-clock time (spec §"Attribution atomique du numéro": "l'année
// d'émission (encaissement)") — never the server process's own timezone.
export function invoiceIssuanceYear(issuedAt: Date): number {
  return Number(yearFormatter.format(issuedAt))
}
