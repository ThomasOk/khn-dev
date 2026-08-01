import { HttpTypes } from "@medusajs/types"

import { getCheckoutStep } from "@lib/util/get-checkout-step"
import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import OrdersSuspendedLabel from "@modules/showcase/components/orders-suspended-label"

// The Carte's checkout CTA, kept out of CarteCartContent's scrollable flow so both
// the desktop sticky column and the mobile fullscreen drawer can pin it in a
// non-scrolling footer instead of letting it scroll away on a long cart.
export default function CarteCartCheckoutButton({
  cart,
  orderPossible,
}: {
  cart: HttpTypes.StoreCart | null
  orderPossible: boolean
}) {
  if (!cart?.items?.length || !cart.region) {
    return null
  }

  if (!orderPossible) {
    return <OrdersSuspendedLabel />
  }

  return (
    <LocalizedClientLink
      href={"/checkout?step=" + getCheckoutStep(cart)}
      data-testid="checkout-button"
    >
      <Button variant="accent" size="large" className="w-full !rounded-base">
        Commander
      </Button>
    </LocalizedClientLink>
  )
}
