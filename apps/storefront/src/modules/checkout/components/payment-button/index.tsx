"use client"

import { isManual, isStripeLike } from "@lib/constants"
import { placeOrder } from "@lib/data/cart"
import {
  buildPickupSlotExpiredMessage,
  isPickupSlotValidationError,
  PICKUP_SLOT_ERROR_PARAM,
} from "@lib/util/pickup-slot"
import {
  FORMULE_SELECTION_ERROR_PARAM,
  isFormuleSelectionValidationError,
} from "@lib/util/formule-selection"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import { useParams, usePathname } from "next/navigation"
import React, { useState } from "react"
import ErrorMessage from "../error-message"

// The 13h55 case: the créneau on this cart expired while the customer sat on
// the payment page and completeCartWorkflow's validate hook rejected it. The
// cart itself is untouched (the hook only throws, it never mutates), so
// recovery is just routing the customer back to the delivery step — with a
// message naming the lost slot — instead of surfacing a generic payment
// error. Any other completion failure (inventory, a missing address, …)
// falls through to the normal inline error message.
//
// This is a hard navigation (window.location), not router.push: verified by
// hand that calling router.push from inside a rejected Server Action's
// .catch() leaves Next's action-dispatch queue wedged — every Server Action
// on the destination page (e.g. picking a new créneau) then hangs forever
// with no error, which is exactly the infinite-loop the spec forbids. A hard
// navigation re-fetches the page from scratch and sidesteps that entirely;
// the cart itself lives server-side, so nothing is lost by not doing a soft
// navigation here.
function recoverFromPickupSlotError(
  err: Error,
  cart: HttpTypes.StoreCart,
  pathname: string
): boolean {
  if (!isPickupSlotValidationError(err.message)) {
    return false
  }

  const params = new URLSearchParams({
    step: "delivery",
    [PICKUP_SLOT_ERROR_PARAM]: buildPickupSlotExpiredMessage(cart.metadata),
  })
  window.location.href = `${pathname}?${params.toString()}`
  return true
}

// The Formule counterpart of the créneau case above: completeCartWorkflow's
// validate hook (extended by src/lib/formule/assert-valid-selection.ts on
// the backend) rejected a Sélection whose Curation changed between
// add-to-cart and payment. Unlike the créneau, there is no single "pick a
// new one" step to route back to — the fix is on the offending line item
// itself, in the cart. The rejected line still has its stale Sélection, so
// recovery is a hard navigation back to the cart with the backend's own
// message (it already names the Composant and the Formule), where the
// customer can delete that one line and re-add a corrected Formule without
// touching the rest of the cart.
function recoverFromFormuleSelectionError(
  err: Error,
  countryCode: string
): boolean {
  if (!isFormuleSelectionValidationError(err.message)) {
    return false
  }

  const params = new URLSearchParams({
    [FORMULE_SELECTION_ERROR_PARAM]: err.message,
  })
  window.location.href = `/${countryCode}/cart?${params.toString()}`
  return true
}

// Shared by both payment-button variants below: on a completion failure,
// recover from the créneau rejection, then the Sélection rejection, or fall
// back to the normal inline error message.
function handlePlaceOrderError(
  err: Error,
  cart: HttpTypes.StoreCart,
  pathname: string,
  countryCode: string,
  setErrorMessage: (message: string | null) => void
) {
  if (recoverFromPickupSlotError(err, cart, pathname)) {
    return
  }
  if (recoverFromFormuleSelectionError(err, countryCode)) {
    return
  }
  setErrorMessage(err.message)
}

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  const paymentSession = cart.payment_collection?.payment_sessions?.[0]

  switch (true) {
    case isStripeLike(paymentSession?.provider_id):
      return (
        <StripePaymentButton
          notReady={notReady}
          cart={cart}
          data-testid={dataTestId}
        />
      )
    case isManual(paymentSession?.provider_id):
      return (
        <ManualTestPaymentButton
          cart={cart}
          notReady={notReady}
          data-testid={dataTestId}
        />
      )
    default:
      return <Button disabled>Select a payment method</Button>
  }
}

const StripePaymentButton = ({
  cart,
  notReady,
  "data-testid": dataTestId,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pathname = usePathname()
  const countryCode = useParams().countryCode as string

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) =>
        handlePlaceOrderError(err, cart, pathname, countryCode, setErrorMessage)
      )
      .finally(() => {
        setSubmitting(false)
      })
  }

  const stripe = useStripe()
  const elements = useElements()
  const card = elements?.getElement("card")

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const disabled = !stripe || !elements ? true : false

  const handlePayment = async () => {
    setSubmitting(true)

    if (!stripe || !elements || !card || !cart) {
      setSubmitting(false)
      return
    }

    await stripe
      .confirmCardPayment(session?.data.client_secret as string, {
        payment_method: {
          card: card,
          billing_details: {
            name:
              cart.billing_address?.first_name +
              " " +
              cart.billing_address?.last_name,
            address: {
              city: cart.billing_address?.city ?? undefined,
              country: cart.billing_address?.country_code ?? undefined,
              line1: cart.billing_address?.address_1 ?? undefined,
              line2: cart.billing_address?.address_2 ?? undefined,
              postal_code: cart.billing_address?.postal_code ?? undefined,
              state: cart.billing_address?.province ?? undefined,
            },
            email: cart.email,
            phone: cart.billing_address?.phone ?? undefined,
          },
        },
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          const pi = error.payment_intent

          if (
            (pi && pi.status === "requires_capture") ||
            (pi && pi.status === "succeeded")
          ) {
            onPaymentCompleted()
          }

          setErrorMessage(error.message || null)
          return
        }

        if (
          (paymentIntent && paymentIntent.status === "requires_capture") ||
          paymentIntent.status === "succeeded"
        ) {
          return onPaymentCompleted()
        }

        return
      })
  }

  return (
    <>
      <Button
        disabled={disabled || notReady}
        onClick={handlePayment}
        size="large"
        isLoading={submitting}
        data-testid={dataTestId}
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="stripe-payment-error-message"
      />
    </>
  )
}

const ManualTestPaymentButton = ({
  cart,
  notReady,
}: {
  cart: HttpTypes.StoreCart
  notReady: boolean
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const pathname = usePathname()
  const countryCode = useParams().countryCode as string

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) =>
        handlePlaceOrderError(err, cart, pathname, countryCode, setErrorMessage)
      )
      .finally(() => {
        setSubmitting(false)
      })
  }

  const handlePayment = () => {
    setSubmitting(true)

    onPaymentCompleted()
  }

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        data-testid="submit-order-button"
      >
        Place order
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  )
}

export default PaymentButton
