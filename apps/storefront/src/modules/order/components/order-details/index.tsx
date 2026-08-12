import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import { pickupSlotFromMetadata } from "@lib/util/pickup-slot"
import { formatOrderDate, formatSlotLabel } from "@lib/util/timezone"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
}

const OrderDetails = ({ order }: OrderDetailsProps) => {
  const pickupSlot = pickupSlotFromMetadata(order.metadata)

  return (
    <div>
      <Text>
        Nous avons envoyé la confirmation de votre commande à{" "}
        <span
          className="text-ui-fg-medium-plus font-semibold"
          data-testid="order-email"
        >
          {order.email}
        </span>
        .
      </Text>
      <Text className="mt-2">
        Date de la commande :{" "}
        <span data-testid="order-date">
          {formatOrderDate(order.created_at)}
        </span>
      </Text>
      <Text className="mt-2 text-ui-fg-interactive">
        Numéro de commande :{" "}
        <span data-testid="order-id">{order.display_id}</span>
      </Text>
      {pickupSlot && (
        <Text className="mt-2">
          Créneau de retrait :{" "}
          <span data-testid="order-pickup-slot">
            {formatSlotLabel(pickupSlot.start, pickupSlot.end)}
          </span>
        </Text>
      )}
    </div>
  )
}

export default OrderDetails
