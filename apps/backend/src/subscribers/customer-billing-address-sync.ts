import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { syncCustomerBillingAddressFromOrderWorkflow } from "../workflows/customer/sync-billing-address-from-order"

// Fourth subscriber on order.placed, distinct from order-confirmation,
// kitchen-ticket-notification and auto-capture-payment (spec §"Backend —
// l'adresse suit la Commande") — one responsibility, one file. All the logic
// lives in the Workflow (AGENTS.md); this subscriber only calls it. Same
// discipline as the other three: try/catch + logger.error, never throw — a
// failure here must never keep the client's own confirmation, the Ticket
// cuisine, or the payment capture from going through.
export default async function syncCustomerBillingAddressOnOrderPlaced({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  try {
    await syncCustomerBillingAddressFromOrderWorkflow(container).run({
      input: { order_id: data.id },
    })
  } catch (error) {
    logger.error(
      `Échec synchronisation adresse de facturation pour la commande ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
