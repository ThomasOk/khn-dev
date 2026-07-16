"use client"
import { Radio, RadioGroup } from "@headlessui/react"
import { setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import { PickupSlot } from "@lib/data/pickup"
import { convertToLocale } from "@lib/util/money"
import {
  PICKUP_SLOT_ERROR_PARAM,
  pickupSlotFromCartMetadata,
} from "@lib/util/pickup-slot"
import { formatSlotRange } from "@lib/util/timezone"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import PickupSlotPicker from "@modules/checkout/components/pickup-slot-picker"
import Divider from "@modules/common/components/divider"
import MedusaRadio from "@modules/common/components/radio"
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
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null
  )
  const [pickupSlot, setPickupSlot] = useState<PickupSlot | null>(() =>
    pickupSlotFromCartMetadata(cart.metadata)
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

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) => (sm as unknown as { service_zone?: { fulfillment_set?: { type?: string; location?: { address: HttpTypes.StoreCartAddress } } } }).service_zone?.fulfillment_set?.type !== "pickup"
  )

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) => (sm as unknown as { service_zone?: { fulfillment_set?: { type?: string; location?: { address: HttpTypes.StoreCartAddress } } } }).service_zone?.fulfillment_set?.type === "pickup"
  )

  const hasPickupOptions = !!_pickupMethods?.length

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => {
              if (p.value?.id) {
                pricesMap[p.value.id] = p.value.amount ?? 0
              }
            })

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      }
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  const handleSubmit = () => {
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup"
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

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
          Delivery
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
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-medium txt-medium text-ui-fg-base">
                Shipping method
              </span>
              <span className="mb-4 text-ui-fg-muted txt-medium">
                How would you like you order delivered
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(_value) => {
                      const id = _pickupMethods.find(
                        (option) => !option.insufficient_inventory
                      )?.id

                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                        {
                          "border-ui-border-interactive":
                            showPickupOptions === PICKUP_OPTION_ON,
                        }
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="text-base-regular">
                          Pick up your order
                        </span>
                      </div>
                      <span className="justify-self-end text-ui-fg-base">
                        -
                      </span>
                    </Radio>
                  </RadioGroup>
                )}
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      return handleSetShippingMethod(v, "shipping")
                    }
                  }}
                >
                  {_shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                          {
                            "border-ui-border-interactive":
                              option.id === shippingMethodId,
                            "hover:shadow-brders-none cursor-not-allowed":
                              isDisabled,
                          }
                        )}
                      >
                        <div className="flex items-center gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          <span className="text-base-regular">
                            {option.name}
                          </span>
                        </div>
                        <span className="justify-self-end text-ui-fg-base">
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : calculatedPricesMap[option.id] ? (
                            convertToLocale({
                              amount: calculatedPricesMap[option.id],
                              currency_code: cart?.currency_code,
                            })
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid">
              <div className="flex flex-col">
                <span className="font-medium txt-medium text-ui-fg-base">
                  Store
                </span>
                <span className="mb-4 text-ui-fg-muted txt-medium">
                  Choose a store near you
                </span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 md:pt-0 pt-2">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => {
                      if (v) {
                        return handleSetShippingMethod(v, "pickup")
                      }
                    }}
                  >
                    {_pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                            {
                              "border-ui-border-interactive":
                                option.id === shippingMethodId,
                              "hover:shadow-brders-none cursor-not-allowed":
                                option.insufficient_inventory,
                            }
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-base-regular">
                                {option.name}
                              </span>
                              <span className="text-base-regular text-ui-fg-muted">
                                {formatAddress(
                                  (option as unknown as { service_zone?: { fulfillment_set?: { location?: { address: HttpTypes.StoreCartAddress } } } }).service_zone?.fulfillment_set?.location
                                    ?.address as HttpTypes.StoreCartAddress
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="justify-self-end text-ui-fg-base">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
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
                  Method
                </Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {cart.shipping_methods!.at(-1)!.name}{" "}
                  {convertToLocale({
                    amount: cart.shipping_methods!.at(-1)!.amount!,
                    currency_code: cart?.currency_code,
                  })}
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
