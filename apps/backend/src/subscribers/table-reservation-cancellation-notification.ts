import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../modules/table-reservation"
import TableReservationModuleService from "../modules/table-reservation/service"
import { TableReservationEvents } from "../modules/table-reservation/events"

// The most useful of the two restaurant emails (ticket 06's framing): it
// changes a Feuille de service that may already be printed, so it's treated
// as the main case, not an afterthought bolted onto the creation subscriber.
// cancelReservationWorkflow only emits table_reservation.cancelled on a REAL
// confirmed -> cancelled transition, so a customer double-clicking their
// cancellation link never produces a second alert here.
export default async function sendTableReservationCancellationNotification({
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
      logger.error(
        `Réservation ${data.id} introuvable, notification d'annulation non envoyée`
      )
      return
    }

    const [config] = await tableReservation.listTableReservationConfigs()
    const restaurantEmail = config?.restaurant_notification_email
    if (!restaurantEmail) {
      logger.error(
        `Aucune adresse de notification configurée, notification d'annulation non envoyée pour la Réservation ${reservation.id}`
      )
      return
    }

    await notificationService.createNotifications({
      to: restaurantEmail,
      channel: "email",
      template: "table-reservation-cancellation-notification",
      idempotency_key: `table-reservation-cancellation:${reservation.id}`,
      data: {
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone,
        date: reservation.date,
        time: reservation.time,
        party_size: reservation.party_size,
      },
    })

    logger.info(`Notification d'annulation envoyée pour la Réservation ${reservation.id}`)
  } catch (error) {
    logger.error(
      `Échec envoi notification d'annulation Réservation ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: TableReservationEvents.CANCELLED,
}
