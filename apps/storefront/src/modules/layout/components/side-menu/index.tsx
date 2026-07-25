"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { XMark } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import { Fragment } from "react"

const DELIVERY_PLATFORMS = [
  {
    name: "Uber Eats",
    href: "https://www.ubereats.com/store/kim-hi-noodle/yM9hQfPEUeaaTSyLWAy_MQ?diningMode=DELIVERY",
  },
  {
    name: "Deliveroo",
    href: "https://deliveroo.fr/fr/menu/Montpellier/castelnau-le-lez/kim-hi-noodle",
  },
]

const SideMenu = () => {
  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  aria-label="Ouvrir le menu"
                  className="relative h-full flex items-center transition-colors duration-200 focus:outline-none [@media(hover:hover)]:hover:text-khn-gold"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-black/0 pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="motion-safe:transition-[opacity,transform] motion-safe:ease-out motion-safe:duration-200"
                enterFrom="opacity-0 motion-safe:-translate-x-4"
                enterTo="opacity-100 motion-safe:translate-x-0"
                leave="motion-safe:transition-[opacity,transform] motion-safe:ease-in motion-safe:duration-150"
                leaveFrom="opacity-100 motion-safe:translate-x-0"
                leaveTo="opacity-0 motion-safe:-translate-x-4"
              >
                <PopoverPanel className="flex flex-col absolute w-full pr-4 sm:pr-0 sm:w-1/3 2xl:w-1/4 sm:min-w-min h-[calc(100vh-1rem)] z-[51] inset-x-0 text-sm text-ui-fg-on-color m-2 backdrop-blur-2xl">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-khn-teal/90 rounded-rounded justify-between p-6"
                  >
                    <div className="flex justify-end">
                      <button
                        data-testid="close-menu-button"
                        aria-label="Fermer le menu"
                        onClick={close}
                      >
                        <XMark />
                      </button>
                    </div>

                    <ul className="flex flex-col gap-6 items-start justify-start">
                      <li>
                        <LocalizedClientLink
                          href="/store"
                          className="text-3xl leading-10 transition-colors duration-150 [@media(hover:hover)]:hover:text-ui-fg-disabled"
                          onClick={close}
                          data-testid="store-link"
                        >
                          La carte
                        </LocalizedClientLink>
                      </li>
                      <li>
                        <span className="text-3xl leading-10 text-white/70">
                          Livraison
                        </span>
                        <ul className="flex flex-col gap-2 mt-3 ml-4">
                          {DELIVERY_PLATFORMS.map((platform) => (
                            <li key={platform.name}>
                              <a
                                href={platform.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-lg leading-7 text-white transition-colors duration-150 [@media(hover:hover)]:hover:text-white/70"
                                onClick={close}
                              >
                                {platform.name}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </li>
                      <li>
                        <LocalizedClientLink
                          href="/table-reservations"
                          className="text-3xl leading-10 transition-colors duration-150 [@media(hover:hover)]:hover:text-ui-fg-disabled"
                          onClick={close}
                          data-testid="reservations-link"
                        >
                          Réserver une table
                        </LocalizedClientLink>
                      </li>
                      <li>
                        <LocalizedClientLink
                          href="/about"
                          className="text-3xl leading-10 transition-colors duration-150 [@media(hover:hover)]:hover:text-ui-fg-disabled"
                          onClick={close}
                          data-testid="about-link"
                        >
                          Notre histoire
                        </LocalizedClientLink>
                      </li>
                      <li>
                        <LocalizedClientLink
                          href="/contact"
                          className="text-3xl leading-10 transition-colors duration-150 [@media(hover:hover)]:hover:text-ui-fg-disabled"
                          onClick={close}
                          data-testid="contact-link"
                        >
                          Contact
                        </LocalizedClientLink>
                      </li>
                    </ul>

                    <Text className="txt-compact-small text-white/50">
                      © {new Date().getFullYear()} Kim-Hi Noodle
                    </Text>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
