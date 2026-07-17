import { model } from "@medusajs/framework/utils"

// The Facture — frozen at issuance, never re-read from the Commande
// afterwards (ADR 0002, spec §"frozen_data"). `order_id` unique gives
// idempotence on issueInvoice; `(year, number)` unique is the gapless
// numbering guarantee (spec §"Attribution atomique du numéro").
const Invoice = model.define("invoice", {
  id: model.id({ prefix: "inv" }).primaryKey(),
  order_id: model.text().unique(),
  year: model.number(),
  number: model.number(),
  formatted_number: model.text(),
  frozen_data: model.json(),
  file_id: model.text().nullable(),
}).indexes([
  { on: ["year", "number"], unique: true },
])

export default Invoice
