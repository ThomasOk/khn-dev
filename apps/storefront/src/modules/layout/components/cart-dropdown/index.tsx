"use client"

import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { hasFormuleSelection } from "@lib/util/formule-selection"
import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import FormuleThumbnail from "@modules/products/components/formule-thumbnail"
import Thumbnail from "@modules/products/components/thumbnail"
import { usePathname } from "next/navigation"
import { Fragment, useEffect, useRef, useState } from "react"

// Mirrors the "small" breakpoint in tailwind.config.js: below it, the Carte's sticky
// cart column (docs/specs/commande-depuis-la-page-carte.md) is `hidden`, so this is the
// client's only add-to-cart feedback there and must keep auto-opening.
const CARTE_CART_COLUMN_BREAKPOINT_PX = 1024

const CartDropdown = ({
  cart: cartState,
}: {
  cart?: HttpTypes.StoreCart | null
}) => {
  const [activeTimer, setActiveTimer] = useState<NodeJS.Timer | undefined>(
    undefined
  )
  const [cartDropdownOpen, setCartDropdownOpen] = useState(false)

  const open = () => setCartDropdownOpen(true)
  const close = () => setCartDropdownOpen(false)

  const totalItems =
    cartState?.items?.reduce((acc, item) => {
      return acc + item.quantity
    }, 0) || 0

  const subtotal = cartState?.item_total ?? 0
  const itemRef = useRef<number>(totalItems || 0)

  const timedOpen = () => {
    open()

    const timer = setTimeout(close, 5000)

    setActiveTimer(timer)
  }

  const openAndCancel = () => {
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    open()
  }

  // Clean up the timer when the component unmounts
  useEffect(() => {
    return () => {
      if (activeTimer) {
        clearTimeout(activeTimer)
      }
    }
  }, [activeTimer])

  const pathname = usePathname()

  const [hasVisibleCartColumn, setHasVisibleCartColumn] = useState(false)

  // The Carte's sticky cart column only renders above the "small" breakpoint (see
  // CARTE_CART_COLUMN_BREAKPOINT_PX above) — below it, this dropdown remains the only
  // add-to-cart feedback, so the auto-open below must stay gated on actual viewport width,
  // not just the route.
  useEffect(() => {
    if (!pathname.includes("/store")) {
      setHasVisibleCartColumn(false)
      return
    }

    const mql = window.matchMedia(
      `(min-width: ${CARTE_CART_COLUMN_BREAKPOINT_PX}px)`
    )
    const update = () => setHasVisibleCartColumn(mql.matches)

    update()
    mql.addEventListener("change", update)

    return () => mql.removeEventListener("change", update)
  }, [pathname])

  // Open cart dropdown when modifying the cart items, but only where its content would
  // add something the client can't already see: not on the cart page, and not on the
  // Carte (/store) above the breakpoint where its sticky cart column
  // (docs/specs/commande-depuis-la-page-carte.md) already shows the same update live
  // and sits right under where this popover renders.
  useEffect(() => {
    if (
      itemRef.current !== totalItems &&
      !pathname.includes("/cart") &&
      !hasVisibleCartColumn
    ) {
      timedOpen()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems, itemRef.current, hasVisibleCartColumn])

  return (
    <div
      className="h-full z-50"
      onMouseEnter={openAndCancel}
      onMouseLeave={close}
    >
      <Popover className="relative h-full">
        <PopoverButton className="h-full">
          <LocalizedClientLink
            className="relative inline-flex items-center text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
            href="/store"
            data-testid="nav-cart-link"
            aria-label={`Panier (${totalItems})`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 8 L5 8 L3.6 20.2 A2 2 0 0 0 5.6 22.4 H18.4 A2 2 0 0 0 20.4 20.2 L19 8 H17" />
              <path d="M7 8 A5 5 0 0 1 17 8" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-khn-gold text-[10px] font-bold leading-none text-khn-teal-panel tabular-nums">
                {totalItems}
              </span>
            )}
          </LocalizedClientLink>
        </PopoverButton>
        <Transition
          show={cartDropdownOpen}
          as={Fragment}
          enter="motion-safe:transition-[opacity,transform] motion-safe:ease-out motion-safe:duration-200"
          enterFrom="opacity-0 motion-safe:translate-y-1"
          enterTo="opacity-100 motion-safe:translate-y-0"
          leave="motion-safe:transition-[opacity,transform] motion-safe:ease-in motion-safe:duration-150"
          leaveFrom="opacity-100 motion-safe:translate-y-0"
          leaveTo="opacity-0 motion-safe:translate-y-1"
        >
          <PopoverPanel
            static
            className="hidden small:block absolute top-[calc(100%+1px)] right-0 bg-white border-x border-b border-gray-200 w-[420px] text-ui-fg-base"
            data-testid="nav-cart-dropdown"
          >
            <div className="p-4 flex items-center justify-center">
              <h3 className="text-large-semi">Panier</h3>
            </div>
            {cartState && cartState.items?.length ? (
              <>
                <div className="overflow-y-scroll max-h-[402px] px-4 grid grid-cols-1 gap-y-8 no-scrollbar p-px">
                  {cartState.items
                    .sort((a, b) => {
                      return (a.created_at ?? "") > (b.created_at ?? "")
                        ? -1
                        : 1
                    })
                    .map((item) => {
                      // A Formule has no image of its own (ADR 0001) — it
                      // swaps the regular Thumbnail for a monogram tile
                      // instead, so the row keeps its layout without a
                      // misleading or generic placeholder photo.
                      const isFormule = hasFormuleSelection(item.metadata)

                      return (
                      <div
                        className="grid grid-cols-[122px_1fr] gap-x-4"
                        key={item.id}
                        data-testid="cart-item"
                      >
                        {isFormule ? (
                          <div className="w-24">
                            <FormuleThumbnail
                              title={item.product_title ?? item.title}
                              data-testid="formule-thumbnail"
                            />
                          </div>
                        ) : (
                          <LocalizedClientLink
                            href={`/products/${item.product_handle}`}
                            className="w-24"
                          >
                            <Thumbnail
                              thumbnail={item.thumbnail}
                              images={item.variant?.product?.images}
                              size="square"
                            />
                          </LocalizedClientLink>
                        )}
                        <div className="flex flex-col justify-between flex-1">
                          <div className="flex flex-col flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex flex-col overflow-ellipsis whitespace-nowrap mr-4 w-[180px]">
                                <h3 className="text-base-regular overflow-hidden text-ellipsis">
                                  <LocalizedClientLink
                                    href={`/products/${item.product_handle}`}
                                    data-testid="product-link"
                                  >
                                    {item.title}
                                  </LocalizedClientLink>
                                </h3>
                                <LineItemOptions
                                  variant={item.variant}
                                  data-testid="cart-item-variant"
                                  data-value={item.variant}
                                />
                                <span
                                  data-testid="cart-item-quantity"
                                  data-value={item.quantity}
                                >
                                  Qté : {item.quantity}
                                </span>
                              </div>
                              <div className="flex justify-end">
                                <LineItemPrice
                                  item={item}
                                  style="tight"
                                  currencyCode={cartState.currency_code}
                                />
                              </div>
                            </div>
                          </div>
                          <DeleteButton
                            id={item.id}
                            className="mt-1"
                            data-testid="cart-item-remove-button"
                          >
                            Supprimer
                          </DeleteButton>
                        </div>
                      </div>
                      )
                    })}
                </div>
                <div className="p-4 flex flex-col gap-y-4 text-small-regular">
                  <div className="flex items-center justify-between">
                    <span className="text-ui-fg-base font-semibold">
                      Sous-total{" "}
                      <span className="font-normal">(TTC)</span>
                    </span>
                    <span
                      className="text-large-semi"
                      data-testid="cart-subtotal"
                      data-value={subtotal}
                    >
                      {convertToLocale({
                        amount: subtotal,
                        currency_code: cartState.currency_code,
                      })}
                    </span>
                  </div>
                  <LocalizedClientLink href="/cart" passHref>
                    <Button
                      variant="accent"
                      size="large"
                      className="w-full !rounded-base"
                      data-testid="go-to-cart-button"
                    >
                      Voir mon panier
                    </Button>
                  </LocalizedClientLink>
                </div>
              </>
            ) : (
              <div>
                <div className="flex py-16 flex-col gap-y-4 items-center justify-center">
                  <div className="bg-gray-900 text-small-regular flex items-center justify-center w-6 h-6 rounded-full text-white">
                    <span>0</span>
                  </div>
                  <span>Votre panier est vide.</span>
                  <div>
                    <LocalizedClientLink href="/store">
                      <>
                        <span className="sr-only">Voir tous les produits</span>
                        <Button
                          variant="accent"
                          size="large"
                          className="!rounded-base"
                          onClick={close}
                        >
                          Voir la carte
                        </Button>
                      </>
                    </LocalizedClientLink>
                  </div>
                </div>
              </div>
            )}
          </PopoverPanel>
        </Transition>
      </Popover>
    </div>
  )
}

export default CartDropdown
