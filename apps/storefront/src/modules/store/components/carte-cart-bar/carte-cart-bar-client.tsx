"use client"

import { Dialog, Transition } from "@headlessui/react"
import { convertToLocale } from "@lib/util/money"
import { Heading } from "@modules/common/components/ui"
import ChevronDown from "@modules/common/icons/chevron-down"
import X from "@modules/common/icons/x"
import useToggleState from "@lib/hooks/use-toggle-state"
import { Fragment, ReactNode } from "react"

type CarteCartBarClientProps = {
  totalItems: number
  subtotal: number
  currencyCode?: string
  children: ReactNode
  footer?: ReactNode
}

// The mobile counterpart to CarteCartColumn (docs/specs/commande-depuis-la-page-carte.md,
// "La mise en page bascule au point de rupture déjà utilisé dans le storefront"). Only the
// bar and the open/closed toggle are new state — the fullscreen panel it opens renders the
// same server-fetched cart content the desktop column renders (passed in as children), so
// there is no second cart to keep in sync.
//
// Closing never touches the Carte's scroll position: this is a fixed overlay on top of the
// page, not a navigation or a remount, so the page underneath never moves while it's open.
export default function CarteCartBarClient({
  totalItems,
  subtotal,
  currencyCode,
  children,
  footer,
}: CarteCartBarClientProps) {
  const { state, open, close } = useToggleState()

  return (
    <>
      <div
        className="small:hidden fixed inset-x-0 bottom-0 z-40"
        data-testid="carte-cart-bar"
      >
        <button
          type="button"
          onClick={open}
          className="w-full bg-neutral-900 text-white flex flex-col items-center gap-y-2 rounded-t-2xl pt-2 pb-3 px-6"
        >
          <span
            className="h-1 w-10 rounded-full bg-white/30"
            aria-hidden="true"
          />
          <span className="w-full flex items-center justify-between">
            <span
              data-testid="carte-cart-bar-count"
              className="flex items-center gap-x-2"
            >
              Panier
              <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-khn-gold text-[10px] font-bold leading-none text-khn-teal-panel tabular-nums">
                {totalItems}
              </span>
            </span>
            <span className="flex items-center gap-x-2">
              {currencyCode && (
                <span data-testid="carte-cart-bar-total">
                  {convertToLocale({ amount: subtotal, currency_code: currencyCode })}
                </span>
              )}
              <ChevronDown size="16" className="rotate-180" aria-hidden="true" />
            </span>
          </span>
        </button>
      </div>

      <Transition appear show={state} as={Fragment}>
        <Dialog as="div" className="relative z-[100]" onClose={close}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-gray-700 bg-opacity-75 backdrop-blur-sm" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4"
            enterTo="opacity-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-4"
          >
            <Dialog.Panel
              className="fixed inset-0 bg-white flex flex-col"
              data-testid="carte-cart-fullscreen"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200">
                <Dialog.Title as={Heading} level="h2" className="text-2xl font-normal text-neutral-900">
                  Votre panier
                </Dialog.Title>
                <button
                  type="button"
                  onClick={close}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-ui-fg-base"
                  data-testid="carte-cart-fullscreen-close"
                >
                  <X />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-y-6">
                {children}
              </div>
              {footer && (
                <div className="border-t border-neutral-200 px-6 py-4">
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  )
}
