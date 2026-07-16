import { model } from "@medusajs/framework/utils"
import Formule from "./formule"

// Composant — one slot inside a Formule the customer must fill ("Entrée", "Plat").
// The Curation itself — the Variantes allowed in this Composant — is a Module
// Link to ProductVariant (src/links/formule-composant-variant.ts), never a
// column here: no price, no amount, no adjustment on this model, ever.
const FormuleComposant = model.define("formule_composant", {
  id: model.id({ prefix: "fcomp" }).primaryKey(),
  // Stable, English identifier written into line_item.metadata as
  // `formule_<key>_variant_id`. Immutable after creation — a placed order
  // references it, and orders are frozen (ADR 0005).
  key: model.text(),
  // Displayed name, in the language of the Carte ("Entrée"). Not immutable.
  label: model.text(),
  rank: model.number(),
  formule: model.belongsTo(() => Formule, {
    mappedBy: "composants",
  }),
})

export default FormuleComposant
