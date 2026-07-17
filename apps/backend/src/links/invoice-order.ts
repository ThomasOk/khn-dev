import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import InvoiceModule from "../modules/invoice"

// One Facture per Commande, one Commande has at most one Facture — no
// isList on either side (spec §"Le lien Facture ↔ Commande").
export default defineLink(
  InvoiceModule.linkable.invoice,
  OrderModule.linkable.order
)
