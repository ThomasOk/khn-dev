import { defineRouteConfig } from "@medusajs/admin-sdk"
import { StopCircleSolid } from "@medusajs/icons"
import { ShowcaseSection } from "../../../components/showcase/showcase-section"

// The Mode vitrine settings screen: the restaurateur's emergency switch,
// reachable without a curl command. Deliberately the only place that can
// turn the mode ON — the order-list widget can only turn it off (spec,
// "le coût connu de cette décision").
const ShowcaseSettingsPage = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <ShowcaseSection />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Showcase mode",
  icon: StopCircleSolid,
})

export default ShowcaseSettingsPage
