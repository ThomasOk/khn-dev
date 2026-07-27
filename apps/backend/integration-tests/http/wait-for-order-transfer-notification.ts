import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// order.transfer_requested is emitted from inside requestOrderTransferWorkflow
// (a native Medusa workflow, not one of ours) — same asynchronous-relative-
// to-the-HTTP-response shape as order.placed and auth.password_reset. Poll
// the persisted notification rows past "pending" instead of guessing at
// timing (same discipline as wait-for-password-reset-notification.ts).
export async function waitForOrderTransferNotifications(
  container: MedusaContainer,
  options: { timeoutMs?: number } = {}
) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const deadline = Date.now() + (options.timeoutMs ?? 10_000)
  let notifications: any[] = []

  while (Date.now() < deadline) {
    notifications = await notificationService.listNotifications({
      template: "order-transfer-notification",
    })

    const settled =
      notifications.length > 0 &&
      notifications.every((n: any) => n.status !== "pending")
    if (settled) break

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return notifications
}
