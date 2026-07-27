"use client"

import { useActionState } from "react"
import { requestPasswordReset } from "@lib/data/customer"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const ForgotPassword = () => {
  const [message, formAction] = useActionState(requestPasswordReset, null)

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="forgot-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">Mot de passe oublié</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        Indiquez votre adresse email : si un compte y est associé, vous
        recevrez un lien pour choisir un nouveau mot de passe.
      </p>

      {message?.state === "success" ? (
        <div
          className="w-full mb-6 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="forgot-password-success-message"
        >
          Si un compte existe pour cette adresse, un email vient de vous être
          envoyé.
        </div>
      ) : (
        <form className="w-full" action={formAction}>
          <div className="flex flex-col w-full gap-y-2">
            <Input
              label="Email"
              name="email"
              type="email"
              title="Saisissez une adresse email valide."
              autoComplete="email"
              required
              data-testid="email-input"
            />
          </div>
          <ErrorMessage
            error={message?.state === "error" ? message.error : null}
            data-testid="forgot-password-error-message"
          />
          <SubmitButton
            className="w-full mt-6"
            data-testid="request-reset-button"
          >
            Envoyer le lien de réinitialisation
          </SubmitButton>
        </form>
      )}

      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        <LocalizedClientLink href="/account" className="underline">
          Retour à la connexion
        </LocalizedClientLink>
      </span>
    </div>
  )
}

export default ForgotPassword
