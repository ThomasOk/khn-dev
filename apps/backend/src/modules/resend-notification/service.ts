import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type { NotificationTypes } from "@medusajs/framework/types"
import { render } from "@react-email/render"
import * as React from "react"
import { Resend } from "resend"
import { mapAttachmentsForResend } from "../../lib/resend/map-attachments-for-resend"
import OrderConfirmationEmail from "./templates/order-confirmation"
import type { OrderConfirmationEmailProps } from "./templates/order-confirmation"
import KitchenTicketNotificationEmail from "./templates/kitchen-ticket-notification"
import type { KitchenTicketNotificationEmailProps } from "./templates/kitchen-ticket-notification"

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
      default:
        return {
          subject: "Notification",
          html: "<p>Vous avez une nouvelle notification.</p>",
        }
    }
  }
}
