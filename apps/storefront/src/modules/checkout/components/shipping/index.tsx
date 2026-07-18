"use client"
import { setShippingMethod } from "@lib/data/cart"
import { PickupSlot } from "@lib/data/pickup"
import {
  PICKUP_SLOT_ERROR_PARAM,
  pickupSlotFromMetadata,
} from "@lib/util/pickup-slot"
import { formatSlotRange } from "@lib/util/timezone"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import PickupSlotPicker from "@modules/checkout/components/pickup-slot-picker"
import Divider from "@modules/common/components/divider"
import { Button, clx, Heading, Text } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
}

function formatAddress(address: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )
  const [pickupSlot, setPickupSlot] = useState<PickupSlot | null>(() =>
    pickupSlotFromMetadata(cart.metadata)
  )
  const [pickupSlotError, setPickupSlotError] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  // The 13h55 case: the payment step redirected here after the créneau on
  // this cart got rejected by the validate hook. The cart itself was never
  // touched, so recovery is purely local — show the message naming the lost
  // slot and force an explicit re-selection (no auto-reassignment: the
  // customer decides, not the system).
  //
  // The URL param is deliberately NOT stripped here. PickupSlotPicker mounts
  // fresh on this same render and kicks off its own fetch (a Next.js Server
  // Action call) to refresh the list; any navigation landing this soon after
  // — even router.replace, even a raw history.replaceState, which Next's
  // router still intercepts to keep its own state in sync — races that
  // in-flight call and orphans its promise, leaving the picker stuck on
  // "Loading pickup slots…" forever (verified by hand: exactly the
  // infinite-loop the spec forbids). The param is cleaned up later instead,
  // once the customer re-selects a slot (see PickupSlotPicker's onSelect
  // below) — by then the initial fetch has long settled, so there's nothing
  // left to race.
  useEffect(() => {
    const message = searchParams.get(PICKUP_SLOT_ERROR_PARAM)

    if (!message) {
      return
    }

    setPickupSlotError(message)
    setPickupSlot(null)
  }, [searchParams])

  // The only fulfillment set this restaurant seeds is "pickup" (ADR: no
  // delivery) — availableShippingMethods never carries a non-pickup entry
  // in practice, so there is nothing else to derive here.
  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => (sm as unknown as { service_zone?: { fulfillment_set?: { type?: string; location?: { address: HttpTypes.StoreCartAddress } } } }).service_zone?.fulfillment_set?.type === "pickup"
  )

  const hasPickupOptions = !!_pickupMethods?.length
  const pickupMethod = _pickupMethods?.find(
    (option) => !option.insufficient_inventory
  )

  useEffect(() => {
    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods])

  // Click & Collect is the only fulfillment method this restaurant offers
  // (no delivery — CONTEXT.md), so there is nothing for the customer to
  // choose here: select it as soon as it's available instead of making
  // them click a radio with a single option.
  useEffect(() => {
    if (pickupMethod && !shippingMethodId) {
      handleSetShippingMethod(pickupMethod.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupMethod?.id])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (id: string) => {
    setError(null)
    setShowPickupOptions(PICKUP_OPTION_ON)

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    await setShippingMethod({ cartId: cart.id, shippingMethodId: id })
      .catch((err) => {
        setShippingMethodId(currentId)

        setError(err.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && cart.shipping_methods?.length === 0,
            }
          )}
        >
          Pickup
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                Edit
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <>
          {pickupSlotError && (
            <ErrorMessage
              error={pickupSlotError}
              data-testid="pickup-slot-expired-message"
            />
          )}
          {hasPickupOptions && pickupMethod && (
            <div className="flex flex-col mb-6" data-testid="pickup-location">
              <span className="font-medium txt-medium text-ui-fg-base">
                Pickup location
              </span>
              <span className="txt-medium text-ui-fg-subtle">
                {pickupMethod.name}
              </span>
              <span className="text-base-regular text-ui-fg-muted">
                {formatAddress(
                  (pickupMethod as unknown as { service_zone?: { fulfillment_set?: { location?: { address: HttpTypes.StoreCartAddress } } } }).service_zone?.fulfillment_set?.location
                    ?.address as HttpTypes.StoreCartAddress
                )}
              </span>
            </div>
          )}

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid">
              <div className="flex flex-col">
                <span className="font-medium txt-medium text-ui-fg-base">
                  Time
                </span>
                <span className="mb-4 text-ui-fg-muted txt-medium">
                  Choose when you&apos;ll pick up your order
                </span>
              </div>
              <PickupSlotPicker
                cartId={cart.id}
                initialSlot={pickupSlot}
                onSelect={(slot) => {
                  setPickupSlotError(null)
                  setPickupSlot(slot)

                  // Safe to clean the URL here: the picker has already
                  // rendered a real slot to click, so its initial fetch is
                  // long settled — no in-flight Server Action call left to
                  // race (see the effect above for why this can't happen
                  // any earlier).
                  if (searchParams.get(PICKUP_SLOT_ERROR_PARAM)) {
                    const params = new URLSearchParams(searchParams)
                    params.delete(PICKUP_SLOT_ERROR_PARAM)
                    window.history.replaceState(
                      null,
                      "",
                      `${pathname}?${params.toString()}`
                    )
                  }
                }}
              />
            </div>
          )}

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="mt"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={
                !cart.shipping_methods?.[0] ||
                (showPickupOptions === PICKUP_OPTION_ON && !pickupSlot)
              }
              data-testid="submit-delivery-option-button"
            >
              Continue to payment
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Pickup location
                </Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {cart.shipping_methods!.at(-1)!.name}
                </Text>
                {pickupSlot && (
                  <Text
                    className="txt-medium text-ui-fg-subtle"
                    data-testid="pickup-slot-summary"
                  >
                    {formatSlotRange(pickupSlot.start, pickupSlot.end)}
                  </Text>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
