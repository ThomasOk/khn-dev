import { model } from "@medusajs/framework/utils"

// Mode vitrine — a SINGLE row carrying whether online ordering is suspended
// and the Note de vitrine shown to the client while it is. Modeled on
// PickupConfig: no date, no period, no toggle timestamp — the mode has no
// duration (ADR 0010). It is decided, never derived, and this module reads
// nothing from pickup, closures, announcements or products.
const ShowcaseConfig = model.define("showcase_config", {
  id: model.id().primaryKey(),
  enabled: model.boolean().default(false),
  note: model.text().nullable(),
})

export default ShowcaseConfig
