import { Suspense } from "react"

import { listCategories } from "@lib/data/categories"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import NavClient from "@modules/layout/components/nav-client"

export default async function Nav() {
  const categories = await listCategories()

  return (
    <NavClient categories={categories}>
      <Suspense
        fallback={
          <LocalizedClientLink
            className="text-xs tracking-[0.15em] uppercase text-white tabular-nums transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
            href="/cart"
            data-testid="nav-cart-link"
          >
            Panier (0)
          </LocalizedClientLink>
        }
      >
        <CartButton />
      </Suspense>
    </NavClient>
  )
}
