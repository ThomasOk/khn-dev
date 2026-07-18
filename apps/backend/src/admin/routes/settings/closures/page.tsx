import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Calendar } from "@medusajs/icons"
import { ClosuresOverviewSection } from "../../../components/closures/closures-overview-section"

// The cross-check ADR 0007 asks for: pickup's Fermeture exceptionnelle and
// table-reservation's Fermeture de réservation are two calendars owned by two
// modules that share nothing — this page is the only place they are read
// together, so a period closed on one side and forgotten on the other gets
// caught by a human before a customer finds a shuttered restaurant.
const ClosuresOverviewPage = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <ClosuresOverviewSection />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Closures",
  icon: Calendar,
})

export default ClosuresOverviewPage
