import { retrieveCart } from "@lib/data/cart"
import Divider from "@modules/common/components/divider"
import { Heading, Text } from "@modules/common/components/ui"
import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import Summary from "@modules/cart/templates/summary"

// Desktop sticky sidebar for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Le panier latéral et la barre mobile ne créent aucun nouvel état"). This renders
// the existing cart-preview and summary server components in a new layout container —
// it fetches the cart itself so it refreshes off the same cache tag an add-to-cart
// already invalidates, exactly like the nav's CartButton does. No cart state lives here.
export default async function CarteCartColumn() {
  const cart = await retrieveCart().catch(() => null)

  return (
    <div
      className="flex flex-col gap-y-6 bg-white"
      data-testid="carte-cart-column"
    >
      <Heading level="h2" className="text-2xl font-normal text-neutral-900">
        Votre panier
      </Heading>
      {cart?.items?.length ? (
        <>
          <ItemsPreviewTemplate cart={cart} showRemove />
          <Divider />
          {cart.region && <Summary cart={cart} />}
        </>
      ) : (
        <Text
          className="text-neutral-600"
          data-testid="carte-cart-empty-message"
        >
          Votre panier est vide. Ajoutez un plat depuis la carte pour
          commencer votre commande.
        </Text>
      )}
    </div>
  )
}
