import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import { render } from "@react-email/render"
import * as React from "react"
import { Resend } from "resend"
import OrderConfirmationEmail from "./templates/order-confirmation"
import type { OrderConfirmationEmailProps } from "./templates/order-confirmation"

type Options = {
  apiKey: string
  from: string
}

type NotificationData = {
  to: string
  template: string
  channel: string
  data?: Record<string, unknown>
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

  async send(notification: NotificationData) {
    const { subject, html } = await this.renderTemplate(
      notification.template,
      notification.data ?? {}
    )

    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: notification.to,
      subject,
      html,
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
      default:
        return {
          subject: "Notification",
          html: "<p>Vous avez une nouvelle notification.</p>",
        }
    }
  }
}
