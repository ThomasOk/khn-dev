import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { issueInvoiceWorkflow } from "../workflows/invoice/issue-invoice"

// payment.captured, downstream of auto-capture-payment.ts (ADR 0002, spec
// §"Point d'insertion payment.captured") — not order.placed, because the
// encaissement isn't confirmed yet there. Same discipline as
// kitchen-ticket-notification.ts: try/catch + logger.error, never throw —
// no order state, client confirmation, or Ticket cuisine may ever depend on
// whether the Facture succeeds.
//
// capturePaymentWorkflow emits only { id: payment.id } (PaymentEvents.CAPTURED),
// never the order id, so the order is resolved from the payment via the
// order_payment_collection Module Link — the same hop capturePaymentWorkflow
// itself makes internally to record the order transaction.
export default async function issueInvoiceOnPaymentCaptured({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    const { data: payments } = await query.graph({
      entity: "payment",
      fields: ["id", "payment_collection.id"],
      filters: { id: data.id },
    })

    const paymentCollectionId = (payments[0] as any)?.payment_collection?.id
    if (!paymentCollectionId) {
      logger.error(
        `Paiement ${data.id} introuvable ou sans Payment Collection, Facture non émise`
      )
      return
    }

    const { data: orderPaymentCollections } = await query.graph({
      entity: "order_payment_collection",
      fields: ["order.id"],
      filters: { payment_collection_id: paymentCollectionId },
    })

    const orderId = (orderPaymentCollections[0] as any)?.order?.id
    if (!orderId) {
      logger.error(
        `Payment Collection ${paymentCollectionId} sans Commande, Facture non émise`
      )
      return
    }

    await issueInvoiceWorkflow(container).run({
      input: { order_id: orderId },
    })

    logger.info(`Facture émise pour la commande ${orderId}`)
  } catch (error) {
    logger.error(`Échec émission Facture pour le paiement ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
