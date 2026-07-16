import { model } from "@medusajs/framework/utils"
import FormuleComposant from "./formule-composant"

// Formule — one row per Produit marked as a Formule. Existence of this row,
// not the existence of Composants, is what "is a Formule" means (ADR 0005,
// spec §"Un modèle Formule explicite").
const Formule = model.define("formule", {
  id: model.id({ prefix: "formule" }).primaryKey(),
  product_id: model.text().unique(),
  composants: model.hasMany(() => FormuleComposant, {
    mappedBy: "formule",
  }),
})

export default Formule
