import { retrieveCart } from "@lib/data/cart"
import { Heading } from "@modules/common/components/ui"
import CarteCartContent from "@modules/store/components/carte-cart-content"

// Desktop sticky sidebar for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Le panier latéral et la barre mobile ne créent aucun nouvel état"). This renders
// the shared CarteCartContent (cart-preview + summary) in a new layout container —
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
      <CarteCartContent cart={cart} />
    </div>
  )
}
