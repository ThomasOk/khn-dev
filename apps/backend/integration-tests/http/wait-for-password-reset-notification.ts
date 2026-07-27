import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// auth.password_reset is emitted from inside generateResetPasswordTokenWorkflow
// (a native Medusa workflow, not one of ours) — same asynchronous-relative-
// to-the-HTTP-response shape as order.placed and table_reservation.reserved.
// Poll the persisted notification rows past "pending" instead of guessing at
// timing (same discipline as wait-for-reservation-notifications.ts).
export async function waitForPasswordResetNotifications(
  container: MedusaContainer,
  options: { timeoutMs?: number } = {}
) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const deadline = Date.now() + (options.timeoutMs ?? 10_000)
  let notifications: any[] = []

  while (Date.now() < deadline) {
    notifications = await notificationService.listNotifications({
      template: "password-reset-notification",
    })

    const settled =
      notifications.length > 0 &&
      notifications.every((n: any) => n.status !== "pending")
    if (settled) break

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return notifications
}
