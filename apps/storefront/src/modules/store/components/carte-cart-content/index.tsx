import { HttpTypes } from "@medusajs/types"
import Divider from "@modules/common/components/divider"
import { Text } from "@modules/common/components/ui"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import Summary from "@modules/cart/templates/summary"

// Shared cart body for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Le panier latéral et la barre mobile ne créent aucun nouvel état"): the
// desktop sticky column and the mobile fullscreen cart both render this, so
// there is only one place deciding what "the cart" looks like on the Carte,
// not a second version kept in sync with the first.
export default function CarteCartContent({
  cart,
}: {
  cart: HttpTypes.StoreCart | null
}) {
  if (!cart?.items?.length) {
    return (
      <Text
        className="text-neutral-600"
        data-testid="carte-cart-empty-message"
      >
        Votre panier est vide. Ajoutez un plat depuis la carte pour commencer
        votre commande.
      </Text>
    )
  }

  return (
    <>
      <ItemsPreviewTemplate cart={cart} showRemove />
      <Divider />
      {cart.region && <Summary cart={cart} />}
    </>
  )
}
