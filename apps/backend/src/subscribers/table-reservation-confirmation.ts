import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { TABLE_RESERVATION_MODULE } from "../modules/table-reservation"
import TableReservationModuleService from "../modules/table-reservation/service"
import { TableReservationEvents } from "../modules/table-reservation/events"
import { buildCancellationLink } from "../lib/reservation/cancellation-link"

// The client's copy of the Réservation (ticket 06) — contractual, unlike the
// restaurant's own notifications: it carries the cancellation link, so a
// failure here must never be masked by the restaurant email's own outcome.
// Deliberately its own subscriber, same discipline as order-confirmation.ts
// vs kitchen-ticket-notification.ts: try/catch + logger.error, never throw.
export default async function sendTableReservationConfirmationEmail({
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
      logger.error(`Réservation ${data.id} introuvable, confirmation non envoyée`)
      return
    }

    const [config] = await tableReservation.listTableReservationConfigs()

    await notificationService.createNotifications({
      to: reservation.customer_email,
      channel: "email",
      template: "table-reservation-confirmation",
      // table_reservation.reserved is only ever emitted once per Réservation
      // (ticket 06), but idempotency_key still dedupes any accidental replay.
      idempotency_key: `table-reservation-confirmation:${reservation.id}`,
      data: {
        customer_name: reservation.customer_name,
        date: reservation.date,
        time: reservation.time,
        party_size: reservation.party_size,
        restaurant_phone: config?.large_party_phone ?? "",
        cancellation_url: buildCancellationLink(
          reservation.id,
          reservation.cancellation_token
        ),
      },
    })

    logger.info(`Email de confirmation envoyé pour la Réservation ${reservation.id}`)
  } catch (error) {
    logger.error(`Échec envoi confirmation Réservation ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: TableReservationEvents.RESERVED,
}
