import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ChangeActionType, ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { buildOrderTransferLink } from "../lib/customer/order-transfer-link"

type OrderTransferRequestedEventData = {
  id: string
  order_change_id: string
}

// requestOrderTransferWorkflow (native, @medusajs/core-flows) emits
// order.transfer_requested with only `{ id, order_change_id }` — the token
// itself never travels on the event, it's buried in the pending OrderChange's
// TRANSFER_CUSTOMER action (order_change.actions[].details.token). This
// subscriber is what reads it back out and turns it into the one thing the
// spec calls "the only proof of inbox ownership in this system" (ADR 0011):
// an email sent to the order's own address, never to whoever requested the
// transfer.
export default async function sendOrderTransferNotification({
  event: { data },
  container,
}: SubscriberArgs<OrderTransferRequestedEventData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "display_id", "email"],
      filters: { id: data.id },
    })
    const order = orders[0]
    if (!order) {
      logger.error(`Commande ${data.id} introuvable, email de rattachement non envoyé`)
      return
    }

    const { data: orderChanges } = await query.graph({
      entity: "order_change",
      fields: ["id", "actions.action", "actions.details"],
      filters: { id: data.order_change_id },
    })
    const transferAction = orderChanges[0]?.actions?.find(
      (action: any) => action.action === ChangeActionType.TRANSFER_CUSTOMER
    )
    const token = (transferAction?.details as Record<string, unknown> | undefined)
      ?.token as string | undefined

    if (!token) {
      logger.error(
        `Jeton de rattachement introuvable pour la commande ${data.id}, email non envoyé`
      )
      return
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: order.email!,
      channel: "email",
      template: "order-transfer-notification",
      // Each request produces its own single-use token (uuid, see
      // requestOrderTransferWorkflow), so keying idempotency on it — rather
      // than on the order — dedupes only a true event replay, never two
      // distinct requests for the same order.
      idempotency_key: `order-transfer:${token}`,
      data: {
        order_id: order.display_id,
        transfer_url: buildOrderTransferLink(order.id, token),
      },
    })

    logger.info(`Email de rattachement envoyé pour la commande #${order.display_id}`)
  } catch (error) {
    logger.error(`Échec envoi email de rattachement pour la commande ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.transfer_requested",
}
