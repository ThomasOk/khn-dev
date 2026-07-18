import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CalendarMini } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { ConfigSection } from "../../../components/table-reservation/config-section"
import { ServiceWindowsSection } from "../../../components/table-reservation/service-windows-section"

// The table-reservation settings page: Services, and the horizon/délai
// minimum/pas/taille de groupe maximale/téléphone/email configuration.
// Nothing is cached — the storefront re-derives availability from these
// values on every request, so an edit takes effect immediately.
const TableReservationSettingsPage = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <Container className="p-0">
        <div className="flex flex-col px-6 py-4">
          <Heading level="h1">Table reservation</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Services and configuration for the dining room. Changes take
            effect immediately on the storefront.
          </Text>
        </div>
      </Container>

      <ConfigSection />
      <ServiceWindowsSection />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Table reservation",
  icon: CalendarMini,
})

export default TableReservationSettingsPage
