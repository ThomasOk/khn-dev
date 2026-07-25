import { Suspense } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import NavClient from "@modules/layout/components/nav-client"

export default function Nav({ opaque }: { opaque?: boolean }) {
  return (
    <NavClient opaque={opaque}>
      <Suspense
        fallback={
          <LocalizedClientLink
            className="inline-flex items-center text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
            href="/cart"
            data-testid="nav-cart-link"
            aria-label="Panier (0)"
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
          </LocalizedClientLink>
        }
      >
        <CartButton />
      </Suspense>
    </NavClient>
  )
}
