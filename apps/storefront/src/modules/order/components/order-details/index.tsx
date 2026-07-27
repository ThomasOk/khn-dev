import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"
import { pickupSlotFromMetadata } from "@lib/util/pickup-slot"
import { formatSlotLabel } from "@lib/util/timezone"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const pickupSlot = pickupSlotFromMetadata(order.metadata)

  const formatStatus = (str: string) => {
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

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
          {new Date(order.created_at).toDateString()}
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

      <div className="flex items-center text-compact-small gap-x-4 mt-4">
        {showStatus && (
          <>
            <Text>
              Statut de la commande :{" "}
              <span className="text-ui-fg-subtle " data-testid="order-status">
                {formatStatus(order.fulfillment_status)}
              </span>
            </Text>
            <Text>
              Statut du paiement :{" "}
              <span
                className="text-ui-fg-subtle "
                sata-testid="order-payment-status"
              >
                {formatStatus(order.payment_status)}
              </span>
            </Text>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
