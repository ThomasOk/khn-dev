import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PICKUP_MODULE } from "../modules/pickup"
import PickupModuleService from "../modules/pickup/service"
import {
  getFormuleCurationForVariant,
  ResolvedFormuleCuration,
} from "../lib/formule/get-curation-for-variant"
import { buildKitchenTicketDocDefinition, KitchenTicketLineItem } from "../lib/pdf/kitchen-ticket"
import { renderPdfDocDefinitionToBase64 } from "../lib/pdf/render"
import { toNum } from "../lib/order/to-num"
import { lineItemQuantity } from "../lib/order/line-item-quantity"

// Second subscriber on order.placed, deliberately never merged with
// sendOrderConfirmationEmail (spec §"Un second subscriber, indépendant du
// premier") — a Formule Curation lookup or a PDF render failing here must
// never keep the client's own confirmation from going out. Same discipline
// as that subscriber: catch + logger.error, no throw, no order-state
// dependency on this email arriving.
export default async function sendKitchenTicketNotification({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const notificationService = container.resolve(Modules.NOTIFICATION)
  const pickupService: PickupModuleService = container.resolve(PICKUP_MODULE)

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "metadata",
        "items.id",
        "items.title",
        "items.variant_id",
        "items.variant_title",
        "items.quantity",
        "items.detail.quantity",
        "items.metadata",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.phone",
      ],
      filters: { id: data.id },
    })

    const order = orders[0]
    if (!order) {
      logger.error(`Commande ${data.id} introuvable, ticket cuisine non envoyé`)
      return
    }

    // The restaurant's own property (ticket 03, Configuration du retrait),
    // never an env var — resolved fresh on every send so a change of
    // recipient never needs a deploy.
    const [config] = await pickupService.listPickupConfigs()
    const restaurantEmail = config?.restaurant_notification_email
    if (!restaurantEmail) {
      logger.error(
        `Aucune adresse de notification restaurant configurée, ticket cuisine non envoyé pour la commande #${order.display_id}`
      )
      return
    }

    const metadata = (order.metadata ?? {}) as Record<string, unknown>
    const slotStart = metadata.creneau_debut as string | undefined
    const slotEnd = metadata.creneau_fin as string | undefined
    if (!slotStart || !slotEnd) {
      logger.error(`Commande #${order.display_id} sans Créneau, ticket cuisine non envoyé`)
      return
    }

    // Resolved once per distinct Variante on the order, not per line — a
    // Formule ordered twice must not trigger the resolution twice.
    const curationByVariantId = new Map<string, ResolvedFormuleCuration | null>()
    const items: KitchenTicketLineItem[] = []
    for (const item of order.items ?? []) {
      const variantId = (item as any)?.variant_id as string | undefined
      if (variantId && !curationByVariantId.has(variantId)) {
        curationByVariantId.set(
          variantId,
          await getFormuleCurationForVariant(container, variantId)
        )
      }

      items.push({
        title: item!.title,
        variant_title: item!.variant_title,
        quantity: toNum(lineItemQuantity(item!)),
        metadata: item!.metadata as Record<string, unknown> | null,
        curation: variantId ? curationByVariantId.get(variantId) ?? null : null,
      })
    }

    const shippingAddress = order.shipping_address as any
    const customerName =
      [shippingAddress?.first_name, shippingAddress?.last_name].filter(Boolean).join(" ") ||
      "Client"
    const customerPhone = shippingAddress?.phone ?? ""

    const docDefinition = buildKitchenTicketDocDefinition({
      customer_name: customerName,
      customer_phone: customerPhone,
      pickup_slot_start: slotStart,
      pickup_slot_end: slotEnd,
      items,
    })
    const pdfBase64 = await renderPdfDocDefinitionToBase64(docDefinition)

    await notificationService.createNotifications({
      to: restaurantEmail,
      channel: "email",
      template: "kitchen-ticket-notification",
      // order.placed can be replayed; the Notification module dedupes
      // natively on idempotency_key, so a replay never sends a second ticket.
      idempotency_key: `kitchen-ticket:${order.id}`,
      data: {
        order_id: order.display_id,
        customer_name: customerName,
        pickup_slot_start: slotStart,
        pickup_slot_end: slotEnd,
      },
      attachments: [
        {
          filename: `ticket-cuisine-commande-${order.display_id}.pdf`,
          content: pdfBase64,
          content_type: "application/pdf",
          disposition: "attachment",
        },
      ],
    })

    logger.info(`Ticket cuisine envoyé pour la commande #${order.display_id}`)
  } catch (error) {
    logger.error(`Échec envoi ticket cuisine commande ${data.id}: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
