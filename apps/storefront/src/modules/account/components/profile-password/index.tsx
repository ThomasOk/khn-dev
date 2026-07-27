"use client"

import React, { useEffect, useActionState, useRef } from "react"
import Input from "@modules/common/components/input"
import AccountInfo from "../account-info"
import { HttpTypes } from "@medusajs/types"
import { updateCustomerPassword } from "@lib/data/customer"

type MyInformationProps = {
  customer: HttpTypes.StoreCustomer
}

const ProfilePassword: React.FC<MyInformationProps> = ({ customer: _customer }) => {
  const [successState, setSuccessState] = React.useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const [state, formAction] = useActionState(updateCustomerPassword, {
    error: null as string | null,
    success: false,
  })

  const clearState = () => {
    setSuccessState(false)
  }

  useEffect(() => {
    setSuccessState(state.success)

    if (state.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="w-full">
      {/* No onReset here: formRef.current.reset() below fires a native
          `reset` event on success, and an onReset={clearState} handler
          would immediately clobber the success state it just set. The
          "Annuler" cancel button clears state itself, in AccountInfo's
          handleToggle — it doesn't rely on this form's reset event. */}
      <AccountInfo
        label="Mot de passe"
        currentInfo={
          <span>Le mot de passe n&apos;est pas affiché pour des raisons de sécurité</span>
        }
        isSuccess={successState}
        isError={!!state.error}
        errorMessage={state.error || undefined}
        clearState={clearState}
        data-testid="account-password-editor"
      >
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Ancien mot de passe"
            name="old_password"
            required
            type="password"
            autoComplete="current-password"
            data-testid="old-password-input"
          />
          <Input
            label="Nouveau mot de passe"
            type="password"
            name="new_password"
            autoComplete="new-password"
            required
            data-testid="new-password-input"
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            name="confirm_password"
            autoComplete="new-password"
            required
            data-testid="confirm-password-input"
          />
        </div>
      </AccountInfo>
    </form>
  )
}

export default ProfilePassword
