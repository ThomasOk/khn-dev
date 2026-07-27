import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type { NotificationTypes } from "@medusajs/framework/types"
import { Resend } from "resend"
import { mapAttachmentsForResend } from "../../lib/resend/map-attachments-for-resend"
import { renderNotificationTemplate } from "../../lib/resend/render-notification-template"

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
    const { subject, html } = await renderNotificationTemplate(
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
}
