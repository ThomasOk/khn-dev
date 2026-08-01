import { retrieveCart } from "@lib/data/cart"
import { getRegion } from "@lib/data/regions"
import CarteCartCheckoutButton from "@modules/store/components/carte-cart-checkout-button"
import CarteCartContent from "@modules/store/components/carte-cart-content"
import CarteCartBarClient from "./carte-cart-bar-client"

// Mobile sticky bar for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Le panier latéral et la barre mobile ne créent aucun nouvel état"). It fetches
// the cart itself, exactly like CarteCartColumn and the nav's CartButton, so it
// refreshes off the same cache tag an add-to-cart already invalidates. The
// fullscreen content it opens is CarteCartContent — the same content
// CarteCartColumn renders on desktop, not a second version of it.
export default async function CarteCartBar({
  countryCode,
  orderPossible,
}: {
  countryCode: string
  orderPossible: boolean
}) {
  const cart = await retrieveCart().catch(() => null)

  const totalItems =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
  const subtotal = cart?.item_total ?? 0

  // A first-time visitor has no cart yet (retrieveCart returns null before any
  // add), so there is no currency to format the total with — fall back to the
  // region's so the bar still shows a total (User Story 26) instead of just a
  // count.
  const currencyCode =
    cart?.currency_code ??
    (await getRegion(countryCode).catch(() => undefined))?.currency_code

  return (
    <CarteCartBarClient
      totalItems={totalItems}
      subtotal={subtotal}
      currencyCode={currencyCode}
      footer={
        cart?.items?.length && cart.region ? (
          <CarteCartCheckoutButton cart={cart} orderPossible={orderPossible} />
        ) : null
      }
    >
      <CarteCartContent cart={cart} orderPossible={orderPossible} />
    </CarteCartBarClient>
  )
}
