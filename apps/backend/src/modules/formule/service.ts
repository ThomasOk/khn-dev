import { MedusaService } from "@medusajs/framework/utils"
import Formule from "./models/formule"
import FormuleComposant from "./models/formule-composant"

// Owns Formule identity and Composant slots only. The Curation — which
// Variantes are allowed in a Composant — lives in the module link to
// ProductVariant (src/links/formule-composant-variant.ts), not here.
class FormuleModuleService extends MedusaService({
  Formule,
  FormuleComposant,
}) {}

export default FormuleModuleService
