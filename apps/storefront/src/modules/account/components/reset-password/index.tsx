"use client"

import { useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { resetPassword } from "@lib/data/customer"
import { Button } from "@modules/common/components/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Reads the token straight from the URL rather than from a cookie or
// session — this is what lets the page work logged out, on a different
// device than the one that requested the reset (spec §"Storefront — le mot
// de passe").
const ResetPassword = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [message, formAction] = useActionState(resetPassword, null)

  if (!token) {
    return (
      <div
        className="max-w-sm w-full flex flex-col items-center text-center gap-y-4"
        data-testid="reset-password-page"
      >
        <h1 className="text-large-semi uppercase">Lien invalide</h1>
        <p className="text-base-regular text-ui-fg-base">
          Ce lien de réinitialisation est incomplet. Demandez-en un nouveau.
        </p>
        <LocalizedClientLink href="/forgot-password">
          <Button variant="secondary">Demander un nouveau lien</Button>
        </LocalizedClientLink>
      </div>
    )
  }

  if (message?.state === "success") {
    return (
      <div
        className="max-w-sm w-full flex flex-col items-center text-center gap-y-4"
        data-testid="reset-password-page"
      >
        <h1 className="text-large-semi uppercase">Mot de passe mis à jour</h1>
        <p className="text-base-regular text-ui-fg-base">
          Votre mot de passe a été changé. Vous pouvez maintenant vous
          connecter.
        </p>
        <LocalizedClientLink href="/account">
          <Button variant="primary">Se connecter</Button>
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div
      className="max-w-sm w-full flex flex-col items-center"
      data-testid="reset-password-page"
    >
      <h1 className="text-large-semi uppercase mb-6">Nouveau mot de passe</h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-8">
        Choisissez un nouveau mot de passe pour votre compte.
      </p>
      <form className="w-full" action={formAction}>
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Nouveau mot de passe"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="reset-password-error-message"
        />
        <SubmitButton
          className="w-full mt-6"
          data-testid="reset-password-button"
        >
          Réinitialiser mon mot de passe
        </SubmitButton>
      </form>
    </div>
  )
}

export default ResetPassword
