import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

// Dev-only preview: sends the order-confirmation email through the real
// notification module (same provider, same template rendering as a genuine
// order.placed) so the layout can be checked in an actual inbox rather than
// only in a render assertion.
//
// The line items deliberately mirror real order data — Medusa fills BOTH
// `subtitle` and `variant_title` with "Default variant" for any single-
// Variante Produit and every Formule — so this exercises the exact case the
// template has to suppress.
//
// Run with: TEST_EMAIL_TO="you@example.com" npx medusa exec ./src/scripts/send-test-order-confirmation.ts
const IMAGE_BASE = "https://pub-024f0165a0d54f99940f7d64a01bc4a6.r2.dev"

export default async function sendTestOrderConfirmation({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const to = process.env.TEST_EMAIL_TO

  if (!to) {
    logger.error("TEST_EMAIL_TO is required, e.g. TEST_EMAIL_TO=\"you@example.com\"")
    return
  }

  const notificationService = container.resolve(Modules.NOTIFICATION)

  const items = [
    {
      id: "item_test_1",
      title: "Bière Asahi",
      subtitle: "Default variant",
      variant_title: "Default variant",
      quantity: 1,
      unit_price: 4.9,
      total: 4.9,
      thumbnail: `${IMAGE_BASE}/1784586440320-biere_asahi-01KZ9A2QWPZG5PYCMP480MD64G.webp`,
      is_formule: false,
    },
    {
      id: "item_test_2",
      title: "Formule Expérience",
      subtitle: "Default variant",
      variant_title: "Default variant",
      quantity: 1,
      unit_price: 22.9,
      total: 22.9,
      is_formule: true,
    },
    {
      id: "item_test_3",
      title: "Raviolits frits",
      subtitle: "Default variant",
      variant_title: "Default variant",
      quantity: 1,
      unit_price: 6.5,
      total: 6.5,
      thumbnail: `${IMAGE_BASE}/1785094635919-raviolis_frits-01KZ9A2V9RKEBMW8JXA0K9Y2QV.webp`,
      is_formule: false,
    },
  ]

  await notificationService.createNotifications({
    to,
    template: "order-confirmation",
    channel: "email",
    // Unique per run, otherwise the Notification module's native dedupe
    // would swallow every send after the first.
    idempotency_key: `order-confirmation-test:${Date.now()}`,
    data: {
      order_id: 11,
      created_at: new Date().toISOString(),
      currency: "eur",
      total: 34.3,
      subtotal: 34.3,
      shipping_total: 0,
      tax_breakdown: [
        { rate: 10, amount: 2.67 },
        { rate: 20, amount: 0.98 },
      ],
      items,
      customer_name: "Thomas",
      pickup_slot_start: "2026-08-15T19:15:00+02:00",
      pickup_slot_end: "2026-08-15T19:30:00+02:00",
    },
  })

  logger.info(`Test order confirmation sent to ${to}`)
}
