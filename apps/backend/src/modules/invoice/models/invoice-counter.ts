import { model } from "@medusajs/framework/utils"

// One row per year, `id = "facture-<year>"`, incremented atomically by
// issueInvoice (service.ts). Never a Postgres SEQUENCE/SERIAL: `nextval` is
// not rolled back, which is exactly the gap ADR 0002 forbids.
const InvoiceCounter = model.define("invoice_counter", {
  id: model.id().primaryKey(),
  value: model.number(),
})

export default InvoiceCounter
