"use client"

import { useActionState } from "react"
import { createAccountFromOrder } from "@lib/data/customer"
import Input from "@modules/common/components/input"
import { Container, Heading, Text } from "@modules/common/components/ui"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { HttpTypes } from "@medusajs/types"

type Props = {
  order: HttpTypes.StoreOrder
  alreadyLoggedIn: boolean
}

// Ticket 07: the only place in the whole tunnel where a Compte is proposed
// (ADR 0011). Hidden for a visitor who was already logged in when the page
// loaded — but that check must not exclude this component from the tree
// (see order-completed-template.tsx): once a submission has produced a
// state, the success/partial message takes priority over `alreadyLoggedIn`,
// since by then the visitor's session cookie is what made it true.
const CreateAccountFromOrder = ({ order, alreadyLoggedIn }: Props) => {
  const [state, formAction] = useActionState(
    createAccountFromOrder.bind(null, order),
    null
  )

  if (!state && alreadyLoggedIn) {
    return null
  }

  if (state?.state === "success" || state?.state === "partial") {
    return (
      <Container
        className="max-w-4xl h-full bg-ui-bg-subtle w-full"
        data-testid="create-account-success"
      >
        <div className="flex flex-col gap-y-2 p-4">
          <Text className="text-ui-fg-base txt-medium-plus">
            Votre compte est créé, vous êtes connecté.
          </Text>
          {state.state === "partial" ? (
            <Text className="text-ui-fg-subtle text-small-regular">
              {state.error}
            </Text>
          ) : (
            <Text className="text-ui-fg-subtle text-small-regular">
              La prochaine fois, votre adresse sera déjà remplie.
            </Text>
          )}
        </div>
      </Container>
    )
  }

  return (
    <Container
      className="max-w-4xl h-full bg-ui-bg-subtle w-full"
      data-testid="create-account-from-order"
    >
      <div className="flex flex-col gap-y-4 p-4">
        <div>
          <Heading level="h2" className="text-ui-fg-base txt-xlarge">
            Créer un compte
          </Heading>
          <Text className="text-ui-fg-subtle text-small-regular mt-1">
            Choisissez un mot de passe pour ne plus ressaisir votre adresse la
            prochaine fois. Votre email, votre nom, votre téléphone et votre
            adresse viennent de cette commande.
          </Text>
        </div>
        <form action={formAction} className="flex flex-col gap-y-4 max-w-sm">
          <Input
            label="Mot de passe"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            data-testid="create-account-password-input"
          />
          <ErrorMessage
            error={state?.state === "error" ? state.error : null}
            data-testid="create-account-error"
          />
          <SubmitButton
            className="w-fit"
            data-testid="create-account-submit"
          >
            Créer mon compte
          </SubmitButton>
        </form>
      </div>
    </Container>
  )
}

export default CreateAccountFromOrder
