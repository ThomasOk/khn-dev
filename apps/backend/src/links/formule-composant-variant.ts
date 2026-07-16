import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import FormuleModule from "../modules/formule"

// La Curation : les Variantes explicitement autorisées dans ce Composant.
// Many-to-many, isList on both sides — a Variante can be curated into several
// Composants, a Composant can curate several Variantes. No extra columns:
// the Curation never carries a price (ADR 0001, ADR 0005).
export default defineLink(
  { linkable: FormuleModule.linkable.formuleComposant, isList: true },
  { linkable: ProductModule.linkable.productVariant, isList: true }
)
