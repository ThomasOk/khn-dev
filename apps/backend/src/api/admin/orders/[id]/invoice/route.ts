import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

// GET /admin/orders/:id/invoice — the OrderInvoiceWidget's display query
// (spec User Story 15). `null` when the Commande has no Facture yet (not
// every order is paid through the tested flow, and issuance can lag payment
// capture) — a normal state for the widget, not an error, same convention as
// GET /admin/formules/:product_id.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "invoice.id", "invoice.formatted_number"],
    filters: { id },
  })

  const invoice = (orders[0] as any)?.invoice ?? null

  res.json({ invoice })
}
