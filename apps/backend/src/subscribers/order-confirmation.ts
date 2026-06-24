import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// Medusa v2 BigNumber objects serialize to {value, numeric} through JSON.
// This helper extracts a plain number from any representation.
function toNum(val: unknown): number {
  if (val == null) return 0
  if (typeof val === "object" && val !== null) {
    if ("numeric" in val && typeof (val as any).numeric === "number") return (val as any).numeric
    if ("value" in val) return Number((val as any).value)
  }
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

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
        "tax_total",
        "discount_total",
        "currency_code",
        "items.id",
        "items.title",
        "items.subtitle",
        "items.variant_title",
        "items.quantity",
        "items.detail.quantity",
        "items.unit_price",
        "items.thumbnail",
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
      const qty = toNum(item.detail?.quantity ?? item.quantity)
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
    // tax_total is the extracted VAT amount (informational only, do not add again).
    const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const shippingTotal = toNum(order.shipping_total)
    const taxTotal = toNum(order.tax_total)
    const discountTotal = toNum(order.discount_total)
    const grandTotal = subtotal + shippingTotal - discountTotal

    await notificationService.createNotifications({
      to: order.email,
      template: "order-confirmation",
      channel: "email",
      data: {
        order_id: order.display_id,
        created_at: String(order.created_at),
        total: grandTotal,
        subtotal,
        shipping_total: shippingTotal,
        tax_total: taxTotal,
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
