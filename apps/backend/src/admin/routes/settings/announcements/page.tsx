import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import { AnnouncementsSection } from "../../../components/announcements/announcements-section"

// The Annonce settings screen: the restaurateur writes, edits and retracts
// the storefront banner from here, no curl and no deploy. Deliberately reads
// nothing from Fermetures exceptionnelles, Créneaux or Produits (ADR 0009) —
// this page has no link to `closures` at all.
const AnnouncementsSettingsPage = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <AnnouncementsSection />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Announcements",
  icon: ChatBubbleLeftRight,
})

export default AnnouncementsSettingsPage
