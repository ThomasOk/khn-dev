import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// payment.captured triggers issueInvoiceWorkflow asynchronously, exactly
// like order.placed triggers the notification subscribers polled by
// wait-for-order-placed.ts — same reasoning applies: poll the concrete
// persisted side effect (an Invoice linked to the order, its file_id set,
// and the client notification past "pending") instead of trusting
// utils.waitWorkflowExecutions() for a chain kicked off by a subscriber.
export async function waitForInvoiceIssued(
  container: MedusaContainer,
  orderId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const deadline = Date.now() + 10_000
  let invoice: any = null
  let notifications: any[] = []

  while (Date.now() < deadline) {
    const [{ data: orders }, currentNotifications] = await Promise.all([
      query.graph({
        entity: "order",
        fields: [
          "id",
          "invoice.id",
          "invoice.formatted_number",
          "invoice.file_id",
          "invoice.frozen_data",
        ],
        filters: { id: orderId },
      }),
      notificationService.listNotifications({}),
    ])
    invoice = (orders[0] as any)?.invoice ?? null
    notifications = currentNotifications

    const invoiceNotification = notifications.find(
      (n: any) => n.template === "invoice-notification"
    )
    const settled =
      !!invoiceNotification && invoiceNotification.status !== "pending"
    if (invoice?.file_id && settled) break

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { invoice, notifications }
}
