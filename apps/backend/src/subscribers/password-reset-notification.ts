import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import type { ICustomerModuleService } from "@medusajs/framework/types"
import { buildResetPasswordLink } from "../lib/customer/reset-password-link"

type PasswordResetEventData = {
  entity_id: string
  actor_type: string
  token: string
}

// generateResetPasswordTokenWorkflow (native, @medusajs/core-flows) issues a
// token and emits auth.password_reset unconditionally — even for an email
// with no Client — which is exactly what keeps the native reset-password
// route's HTTP response indistinguishable whether or not the account exists
// (spec §"Aucune énumération"). This subscriber runs after that response
// already went out, so silently skipping the notification for an unknown
// address (not an error) is what makes the no-enumeration guarantee hold
// end-to-end.
export default async function sendPasswordResetEmail({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetEventData>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  // auth.password_reset fires for every actor type (customer, user/admin,
  // ...); this email is for the Client only (spec §"Destinataires").
  if (data.actor_type !== "customer") {
    return
  }

  try {
    const customerModuleService: ICustomerModuleService = container.resolve(
      Modules.CUSTOMER
    )
    const [customer] = await customerModuleService.listCustomers({
      email: data.entity_id,
      has_account: true,
    })

    if (!customer) {
      return
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)
    await notificationService.createNotifications({
      to: customer.email,
      channel: "email",
      template: "password-reset-notification",
      // Each request issues its own single-use token (native auth module),
      // so keying idempotency on it — rather than on the customer — dedupes
      // only a true event replay, never two distinct requests.
      idempotency_key: `password-reset:${data.token}`,
      data: {
        reset_url: buildResetPasswordLink(data.token),
      },
    })

    logger.info(`Email de réinitialisation envoyé à ${customer.email}`)
  } catch (error) {
    logger.error(`Échec envoi email de réinitialisation: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
