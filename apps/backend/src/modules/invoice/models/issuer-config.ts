import { model } from "@medusajs/framework/utils"

// The Facture's legal issuer identity — a restaurant property, not a
// hard-coded env var (spec §"frozen_data", same spirit as pickup's
// restaurant_notification_email): a change of SIREN/SIRET/RCS/capital must
// never need a redeploy. Single row, resolved fresh at issuance, like
// PickupConfig.
const IssuerConfig = model.define("issuer_config", {
  id: model.id().primaryKey(),
  legal_name: model.text(),
  address: model.text(),
  siren: model.text(),
  siret: model.text(),
  vat_number: model.text(),
  legal_form: model.text(),
  share_capital: model.text(),
  rcs_city: model.text(),
})

export default IssuerConfig
