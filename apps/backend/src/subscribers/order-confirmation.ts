import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { toNum } from "../lib/order/to-num"
import { lineItemQuantity } from "../lib/order/line-item-quantity"
import { computeTaxBreakdown } from "../lib/invoice/tax-breakdown"

export default async function sendOrderConfirmationEmail({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "created_at",
        "shipping_total",
        // "tax_total" isn't read directly below — its presence in this list
        // is what makes the Order module compute and attach totals at all
        // (OrderModuleService.shouldIncludeTotals matches literal top-level
        // total field names). Without it, items end up unmerged with their
        // LineItem side and items.subtotal / items.tax_lines.total silently
        // come back as 0 or wrong — same gotcha as issueInvoiceWorkflow.
        // "items.*" (not cherry-picked fields) is required for the same
        // reason: cherry-picking left items.subtotal unpopulated, which
        // made the TVA ventilation below fall back to a flat, wrong number
        // (verified live: 2,88 € shown instead of the correct 2,55 €,
        // treating tax-inclusive prices as tax-exclusive).
        "tax_total",
        "items.*",
        "items.detail.quantity",
        "items.tax_lines.*",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.postal_code",
        "shipping_address.country_code",
        "shipping_address.phone",
      ],
      filters: { id: data.id },
    })

    const order = orders[0]
    if (!order?.email) {
      logger.error(`Commande ${data.id} introuvable ou sans email`)
      return
    }

    const items = (order.items ?? []).map((item: any) => {
      const qty = toNum(lineItemQuantity(item))
      const unitPrice = toNum(item.unit_price)
      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        variant_title: item.variant_title,
        quantity: qty,
        unit_price: unitPrice,
        total: unitPrice * qty,
        thumbnail: item.thumbnail,
      }
    })

    // Prices are tax-inclusive (TTC): unit_price already contains VAT.
    // taxBreakdown is the extracted VAT, ventilated by rate (informational
    // only, do not add again) — an order can mix rates (10 % food, 20 %
    // Alcool), so a single flat "dont TVA (X %)" line would either hide a
    // rate or mislabel the sum. Read off each item's own tax_lines, exactly
    // like the invoice's frozen_data (deriveInvoiceFrozenData) — never
    // recomputed, only aggregated.
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const shippingTotal = toNum(order.shipping_total)
    const taxBreakdown = computeTaxBreakdown(
      (order.items ?? []).map((item: any) => ({
        tax_rate: item.tax_lines?.[0]?.rate ?? 0,
        subtotal_excl_tax: toNum(item.subtotal),
        tax_amount: (item.tax_lines ?? []).reduce(
          (sum: number, taxLine: any) => sum + toNum(taxLine.total),
          0
        ),
      }))
    ).map((row) => ({ rate: row.rate, amount: row.tax_amount }))
    const discountTotal = toNum(order.discount_total)
    const grandTotal = subtotal + shippingTotal - discountTotal

    await notificationService.createNotifications({
      to: order.email,
      template: "order-confirmation",
      channel: "email",
      // order.placed can be replayed; the Notification module dedupes
      // natively on idempotency_key, so a replay never sends a second copy.
      idempotency_key: `order-confirmation:${order.id}`,
      data: {
        order_id: order.display_id,
        created_at: String(order.created_at),
        total: grandTotal,
        subtotal,
        shipping_total: shippingTotal,
        tax_breakdown: taxBreakdown,
        discount_total: discountTotal,
        currency: order.currency_code,
        items,
        shipping_address: order.shipping_address ? {
          first_name: (order.shipping_address as any).first_name,
          last_name: (order.shipping_address as any).last_name,
          address_1: (order.shipping_address as any).address_1,
          address_2: (order.shipping_address as any).address_2,
          city: (order.shipping_address as any).city,
          postal_code: (order.shipping_address as any).postal_code,
          country_code: (order.shipping_address as any).country_code,
          phone: (order.shipping_address as any).phone,
        } : undefined,
      },
    })

    logger.info(`Email de confirmation envoyé pour la commande #${order.display_id}`)
  } catch (error) {
    logger.error(`Échec envoi email commande ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
