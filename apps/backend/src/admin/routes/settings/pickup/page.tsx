import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Clock } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { ConfigSection } from "../../../components/pickup/config-section"
import { SchedulesSection } from "../../../components/pickup/schedules-section"
import { ClosuresSection } from "../../../components/pickup/closures-section"

// The pickup settings page: the one surface that makes the pickup configuration
// editable without a deploy. Hours, exceptional closures, and the slot/prep-delay
// configuration all live here. Nothing is cached — the storefront re-derives slots
// from these values on every request, so an edit takes effect immediately.
const PickupSettingsPage = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <Container className="p-0">
        <div className="flex flex-col px-6 py-4">
          <Heading level="h1">Pickup</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Pickup hours, exceptional closures, and slot configuration. Changes
            take effect immediately on the storefront.
          </Text>
        </div>
      </Container>

      <ConfigSection />
      <SchedulesSection />
      <ClosuresSection />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Pickup",
  icon: Clock,
})

export default PickupSettingsPage
