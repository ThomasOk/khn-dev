import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type { NotificationTypes } from "@medusajs/framework/types"
import { render } from "@react-email/render"
import * as React from "react"
import { Resend } from "resend"
import { mapAttachmentsForResend } from "../../lib/resend/map-attachments-for-resend"
import { formatReservationSubject } from "../../lib/reservation/format-reservation"
import OrderConfirmationEmail from "./templates/order-confirmation"
import type { OrderConfirmationEmailProps } from "./templates/order-confirmation"
import KitchenTicketNotificationEmail from "./templates/kitchen-ticket-notification"
import type { KitchenTicketNotificationEmailProps } from "./templates/kitchen-ticket-notification"
import InvoiceNotificationEmail from "./templates/invoice-notification"
import type { InvoiceNotificationEmailProps } from "./templates/invoice-notification"
import TableReservationConfirmationEmail from "./templates/table-reservation-confirmation"
import type { TableReservationConfirmationEmailProps } from "./templates/table-reservation-confirmation"
import TableReservationNotificationEmail from "./templates/table-reservation-notification"
import type { TableReservationNotificationEmailProps } from "./templates/table-reservation-notification"
import TableReservationCancellationNotificationEmail from "./templates/table-reservation-cancellation-notification"
import type { TableReservationCancellationNotificationEmailProps } from "./templates/table-reservation-cancellation-notification"

type Options = {
  apiKey: string
  from: string
}

export class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "resend"

  private resend: Resend
  private from: string

  constructor(_: unknown, options: Options) {
    super()
    this.resend = new Resend(options.apiKey)
    this.from = options.from
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const { subject, html } = await this.renderTemplate(
      notification.template,
      notification.data ?? {}
    )

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: notification.to,
      subject,
      html,
      attachments: notification.attachments
        ? mapAttachmentsForResend(notification.attachments)
        : undefined,
    })

    if (error) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, error.message)

    return { id: data?.id ?? "" }
  }

  private async renderTemplate(
    template: string,
    data: Record<string, unknown>
  ): Promise<{ subject: string; html: string }> {
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
        const html = await render(
          React.createElement(TableReservationConfirmationEmail, props)
        )
        return {
          subject: "Votre réservation chez Kim-Hi Noodle est confirmée",
          html,
        }
      }
      case "table-reservation-notification": {
        const props = data as unknown as TableReservationNotificationEmailProps
        const html = await render(
          React.createElement(TableReservationNotificationEmail, props)
        )
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
        return {
          subject: "Notification",
          html: "<p>Vous avez une nouvelle notification.</p>",
        }
    }
  }
}
