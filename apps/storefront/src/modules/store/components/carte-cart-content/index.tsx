import { HttpTypes } from "@medusajs/types"
import { getCartFormuleSelections } from "@lib/data/formules"
import CartTotals from "@modules/common/components/cart-totals"
import Divider from "@modules/common/components/divider"
import { Text } from "@modules/common/components/ui"
import DiscountCode from "@modules/checkout/components/discount-code"
import OrdersSuspendedLabel from "@modules/showcase/components/orders-suspended-label"
import CarteCartItemsList from "@modules/store/components/carte-cart-item/items-list"

// Shared cart body for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Le panier latéral et la barre mobile ne créent aucun nouvel état"): the
// desktop sticky column and the mobile fullscreen cart both render this, so
// there is only one place deciding what "the cart" looks like on the Carte,
// not a second version kept in sync with the first. Also the only place that
// needs to know about Mode vitrine for the Carte's cart surfaces (ticket 05):
// covering it here covers the sticky column and the mobile bar in one edit.
// The checkout button itself lives outside this component (CarteCartCheckoutButton)
// so each caller can pin it in its own non-scrolling footer instead.
export default async function CarteCartContent({
  cart,
  orderPossible,
}: {
  cart: HttpTypes.StoreCart | null
  orderPossible: boolean
}) {
  if (!cart?.items?.length) {
    return (
      <>
        <Text
          className="text-neutral-600"
          data-testid="carte-cart-empty-message"
        >
          Votre panier est vide.
          {orderPossible &&
            " Ajoutez un plat depuis la carte pour commencer votre commande."}
        </Text>
        {!orderPossible && <OrdersSuspendedLabel />}
      </>
    )
  }

  const formuleSelections = await getCartFormuleSelections(cart)
  const items = [...cart.items].sort((a, b) =>
    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
  )

  return (
    <>
      <CarteCartItemsList
        items={items.map((item) => ({
          item,
          formuleSelection: formuleSelections[item.id],
        }))}
        currencyCode={cart.currency_code}
      />

      {cart.region && (
        <>
          <Divider />
          <DiscountCode cart={cart} />
          <div className="[&_[data-testid='cart-total']]:font-sans [&_[data-testid='cart-total']]:text-base">
            <CartTotals totals={cart} />
          </div>
        </>
      )}
    </>
  )
}
