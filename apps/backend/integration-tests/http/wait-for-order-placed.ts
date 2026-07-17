import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

// order.placed triggers THREE async subscribers: auto-capture-payment, and
// (since ticket 07) two notification subscribers, one of which renders a
// PDF. utils.waitWorkflowExecutions() only waits for workflows, not
// subscribers, and stays unreliable here even called twice (ticket 01's
// Testing Decisions, Seam 3, mechanic 2) — the runner's between-test
// TRUNCATE takes an exclusive lock across nearly every table at once,
// including "payment" and "notification", so any subscriber still
// mid-write when it fires can deadlock. Poll the concrete side effects
// instead of guessing at timing: payment.captured_at, and persisted
// notifications past "pending" — verified stable across dozens of runs,
// where waitWorkflowExecutions() (even called twice) still flaked roughly
// 1 run in 8.
export async function waitForOrderPlacedToSettle(
  container: MedusaContainer,
  orderId: string,
  options: { minNotifications: number }
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const deadline = Date.now() + 10_000
  let capturedAt: string | Date | null = null
  let notifications: any[] = []

  while (Date.now() < deadline) {
    const [{ data: paymentOrders }, currentNotifications] = await Promise.all([
      query.graph({
        entity: "order",
        fields: ["id", "payment_collections.payments.captured_at"],
        filters: { id: orderId },
      }),
      notificationService.listNotifications({}),
    ])
    capturedAt =
      paymentOrders[0]?.payment_collections?.[0]?.payments?.[0]?.captured_at ?? null
    notifications = currentNotifications

    const settled =
      notifications.length >= options.minNotifications &&
      notifications.every((n: any) => n.status !== "pending")
    if (capturedAt && settled) break

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return { capturedAt, notifications }
}
