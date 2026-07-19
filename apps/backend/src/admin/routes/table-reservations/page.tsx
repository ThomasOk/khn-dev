import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Container, Heading, Text } from "@medusajs/ui"
import { ServiceSheetSection } from "../../components/table-reservation/service-sheet"

// The Feuille de service (ticket 07) — a daily operational page, not a
// settings page: the restaurateur opens this every service, not once when
// configuring the dining room (that page is Settings > Table reservation).
const TableReservationsPage = () => {
  return (
    <div className="flex flex-col gap-y-3 print:gap-y-0">
      <Container className="p-0 print:hidden">
        <div className="flex flex-col px-6 py-4">
          <Heading level="h1">Table reservations</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The Feuille de service — today's Réservations, ready to print
            before the coup de feu.
          </Text>
        </div>
      </Container>

      <ServiceSheetSection />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Table reservations",
  icon: DocumentText,
})

export default TableReservationsPage
