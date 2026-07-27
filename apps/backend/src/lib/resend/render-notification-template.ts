import { MedusaError } from "@medusajs/framework/utils"
import { render } from "@react-email/render"
import * as React from "react"
import { formatReservationSubject } from "../reservation/format-reservation"
import OrderConfirmationEmail from "../../modules/resend-notification/templates/order-confirmation"
import type { OrderConfirmationEmailProps } from "../../modules/resend-notification/templates/order-confirmation"
import KitchenTicketNotificationEmail from "../../modules/resend-notification/templates/kitchen-ticket-notification"
import type { KitchenTicketNotificationEmailProps } from "../../modules/resend-notification/templates/kitchen-ticket-notification"
import InvoiceNotificationEmail from "../../modules/resend-notification/templates/invoice-notification"
import type { InvoiceNotificationEmailProps } from "../../modules/resend-notification/templates/invoice-notification"
import TableReservationConfirmationEmail from "../../modules/resend-notification/templates/table-reservation-confirmation"
import type { TableReservationConfirmationEmailProps } from "../../modules/resend-notification/templates/table-reservation-confirmation"
import TableReservationNotificationEmail from "../../modules/resend-notification/templates/table-reservation-notification"
import type { TableReservationNotificationEmailProps } from "../../modules/resend-notification/templates/table-reservation-notification"
import TableReservationCancellationNotificationEmail from "../../modules/resend-notification/templates/table-reservation-cancellation-notification"
import type { TableReservationCancellationNotificationEmailProps } from "../../modules/resend-notification/templates/table-reservation-cancellation-notification"

export type RenderedNotificationTemplate = { subject: string; html: string }

// An unknown `template` used to fall through to a generic "Notification" /
// "Vous avez une nouvelle notification." email — a misspelled template name
// sent silently instead of failing, indistinguishable from a real email for
// every template whose only value is the link it carries (ticket 01).
// Throwing here is what lets the notification module's own error handling
// (createNotifications_) mark the persisted row as NotificationStatus.FAILURE.
export async function renderNotificationTemplate(
  template: string,
  data: Record<string, unknown>
): Promise<RenderedNotificationTemplate> {
  switch (template) {
    case "order-confirmation": {
      const props = data as unknown as OrderConfirmationEmailProps
      const html = await render(React.createElement(OrderConfirmationEmail, props))
      return {
        subject: `Confirmation de commande #${props.order_id}`,
        html,
      }
    }
    case "kitchen-ticket-notification": {
      const props = data as unknown as KitchenTicketNotificationEmailProps
      const html = await render(React.createElement(KitchenTicketNotificationEmail, props))
      return {
        subject: `Nouvelle commande #${props.order_id}`,
        html,
      }
    }
    case "invoice-notification": {
      const props = data as unknown as InvoiceNotificationEmailProps
      const html = await render(React.createElement(InvoiceNotificationEmail, props))
      return {
        subject: `Votre facture ${props.formatted_number} — commande #${props.order_id}`,
        html,
      }
    }
    case "table-reservation-confirmation": {
      const props = data as unknown as TableReservationConfirmationEmailProps
      const html = await render(React.createElement(TableReservationConfirmationEmail, props))
      return {
        subject: "Votre réservation chez Kim-Hi Noodle est confirmée",
        html,
      }
    }
    case "table-reservation-notification": {
      const props = data as unknown as TableReservationNotificationEmailProps
      const html = await render(React.createElement(TableReservationNotificationEmail, props))
      return {
        subject: formatReservationSubject("reservation", props),
        html,
      }
    }
    case "table-reservation-cancellation-notification": {
      const props = data as unknown as TableReservationCancellationNotificationEmailProps
      const html = await render(
        React.createElement(TableReservationCancellationNotificationEmail, props)
      )
      return {
        subject: formatReservationSubject("cancellation", props),
        html,
      }
    }
    default:
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Unknown notification template: "${template}"`
      )
  }
}
