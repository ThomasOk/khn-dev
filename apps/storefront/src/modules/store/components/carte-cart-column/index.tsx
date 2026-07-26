import { retrieveCart } from "@lib/data/cart"
import Divider from "@modules/common/components/divider"
import { Heading, Text } from "@modules/common/components/ui"
import CarteCartContent from "@modules/store/components/carte-cart-content"

// Desktop sticky sidebar for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Le panier latéral et la barre mobile ne créent aucun nouvel état"). This renders
// the shared CarteCartContent (cart-preview + summary) in a new layout container —
// it fetches the cart itself so it refreshes off the same cache tag an add-to-cart
// already invalidates, exactly like the nav's CartButton does. No cart state lives here.
export default async function CarteCartColumn({
  orderPossible,
}: {
  orderPossible: boolean
}) {
  const cart = await retrieveCart().catch(() => null)
  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0

  return (
    <div
      className="flex flex-col gap-y-6 bg-white"
      data-testid="carte-cart-column"
    >
      <div className="flex flex-col gap-y-1">
        <Heading
          level="h2"
          className="font-display text-2xl uppercase tracking-[0.06em] text-neutral-900"
        >
          Votre panier
        </Heading>
        <Text as="span" className="text-sm text-neutral-500">
          {itemCount} article{itemCount > 1 ? "s" : ""}
        </Text>
      </div>
      <Divider className="mt-0" />
      <CarteCartContent cart={cart} orderPossible={orderPossible} />
    </div>
  )
}
