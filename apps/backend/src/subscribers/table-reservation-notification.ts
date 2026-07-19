import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../modules/table-reservation"
import TableReservationModuleService from "../modules/table-reservation/service"
import { TableReservationEvents } from "../modules/table-reservation/events"

// The restaurant's copy at creation — a commodity next to the client's own
// confirmation (ticket 06: the admin reservation list stays the source of
// truth). Its own subscriber, so a failure here never blocks the client's
// contractual email — same discipline as order-confirmation.ts vs
// kitchen-ticket-notification.ts.
export default async function sendTableReservationNotification({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const tableReservation: TableReservationModuleService = container.resolve(
    TABLE_RESERVATION_MODULE
  )

  try {
    const [reservation] = await tableReservation.listTableReservations({ id: data.id })
    if (!reservation) {
      logger.error(`Réservation ${data.id} introuvable, notification restaurant non envoyée`)
      return
    }

    // The module's OWN notification address (ADR 0007) — never
    // pickup_config's, which is a different module for a different feature.
    const [config] = await tableReservation.listTableReservationConfigs()
    const restaurantEmail = config?.restaurant_notification_email
    if (!restaurantEmail) {
      logger.error(
        `Aucune adresse de notification configurée, notification restaurant non envoyée pour la Réservation ${reservation.id}`
      )
      return
    }

    await notificationService.createNotifications({
      to: restaurantEmail,
      channel: "email",
      template: "table-reservation-notification",
      idempotency_key: `table-reservation-notification:${reservation.id}`,
      data: {
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone,
        date: reservation.date,
        time: reservation.time,
        party_size: reservation.party_size,
        note: reservation.note,
      },
    })

    logger.info(`Notification restaurant envoyée pour la Réservation ${reservation.id}`)
  } catch (error) {
    logger.error(
      `Échec envoi notification restaurant Réservation ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: TableReservationEvents.RESERVED,
}
