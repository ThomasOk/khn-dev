import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { HttpTypes } from "@medusajs/types"
import { Container, Text } from "@medusajs/ui"
import { pickupSlotFromMetadata } from "../lib/pickup"
import { formatSlotLabel } from "../lib/timezone"

type Props = {
  data: HttpTypes.AdminOrder
}

// Reads order.metadata straight from props — no network call. Without this
// widget the créneau is written and validated but nobody sees it (spec: "L'admin").
const OrderPickupSlotWidget = ({ data: order }: Props) => {
  const slot = pickupSlotFromMetadata(order.metadata)

  if (!slot) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center gap-x-2 px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Pickup — {formatSlotLabel(slot.start, slot.end)}
        </Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderPickupSlotWidget
