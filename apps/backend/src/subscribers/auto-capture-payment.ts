import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";

export default async function autoCapture({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data.id;

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "payment_collections.*", "payment_collections.payments.*"],
    filters: { id: orderId },
  });

  const order = orders[0];

  for (const paymentCollection of order.payment_collections ?? []) {
    if (!paymentCollection) continue;
    for (const payment of paymentCollection.payments ?? []) {
      if (!payment || payment.captured_at) continue;

      await capturePaymentWorkflow(container).run({
        input: { payment_id: payment.id },
      });
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
