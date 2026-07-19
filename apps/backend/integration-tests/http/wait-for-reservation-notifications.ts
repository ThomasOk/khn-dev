import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// table_reservation.reserved / .cancelled are emitted from inside a workflow
// step via emitEventStep, so the subscriber that actually sends the
// notification runs asynchronously, AFTER the HTTP response already
// returned — same shape as order.placed (see wait-for-order-placed.ts).
// Poll the persisted notification rows past "pending" instead of guessing
// at timing.
export async function waitForReservationNotifications(
  container: MedusaContainer,
  options: { minNotifications: number }
) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const deadline = Date.now() + 10_000
  let notifications: any[] = []

  while (Date.now() < deadline) {
    notifications = await notificationService.listNotifications({})

    const settled =
      notifications.length >= options.minNotifications &&
      notifications.every((n: any) => n.status !== "pending")
    if (settled) break

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return notifications
}
