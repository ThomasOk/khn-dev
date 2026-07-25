import { model } from "@medusajs/framework/utils"

// An Annonce — free text a human writes for the storefront visitor, over a
// civil-day period. Never derived from a Fermeture, a Créneau or a Produit
// (ADR 0009): the module reads nothing from `pickup` or `product`.
const Announcement = model.define("announcement", {
  id: model.id().primaryKey(),
  headline: model.text(),
  // The corps: free length, no cap — it is the headline that is capped, not
  // this. No address of its own (no page, no URL, no indexing): the client
  // reads it only inside the panel the banner opens.
  body: model.text().nullable(),
  // Both present or both absent, enforced in the zod schemas — a link
  // without a label isn't renderable, a label without a link is a dead
  // button.
  link_label: model.text().nullable(),
  link_url: model.text().nullable(),
  // Civil days "YYYY-MM-DD" in the restaurant timezone, stored as text on
  // purpose: same choice and same reason as pickup_closure — a publication
  // day is a civil day, not an instant.
  start_date: model.text(),
  end_date: model.text(),
})

export default Announcement
