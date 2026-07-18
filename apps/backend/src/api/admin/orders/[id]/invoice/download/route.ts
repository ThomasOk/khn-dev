import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

// GET /admin/orders/:id/invoice/download — serves the exact bytes stored at
// issuance (ADR 0002, spec §"Le téléchargement sert le PDF stocké"). Reads
// file_id off the Invoice linked to this Commande and hands the File
// Module's getAsBuffer() straight to the response — no rendering, no
// docDefinition, no regeneration.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "invoice.file_id", "invoice.formatted_number"],
    filters: { id },
  })

  const invoice = (orders[0] as any)?.invoice
  if (!invoice?.file_id) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No Facture is available for this Commande."
    )
  }

  const fileModuleService = req.scope.resolve(Modules.FILE)
  const pdf = await fileModuleService.getAsBuffer(invoice.file_id)

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="facture-${invoice.formatted_number}.pdf"`
  )
  res.send(pdf)
}
