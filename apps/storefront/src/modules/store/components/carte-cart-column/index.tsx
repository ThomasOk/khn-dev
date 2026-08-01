import { retrieveCart } from "@lib/data/cart"
import Divider from "@modules/common/components/divider"
import { Heading, Text } from "@modules/common/components/ui"
import CarteCartCheckoutButton from "@modules/store/components/carte-cart-checkout-button"
import CarteCartContent from "@modules/store/components/carte-cart-content"

// Desktop sticky sidebar for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Le panier latéral et la barre mobile ne créent aucun nouvel état"). This renders
// the shared CarteCartContent (cart-preview + summary) in a new layout container —
// it fetches the cart itself so it refreshes off the same cache tag an add-to-cart
// already invalidates, exactly like the nav's CartButton does. No cart state lives here.
//
// The checkout button sits in its own non-scrolling footer below a scrollable body,
// mirroring the mobile fullscreen drawer, so it never scrolls out of view on a long
// cart. `min-h-0` on both flex layers is load-bearing: without it a flex child's
// default min-height:auto keeps it sized to its content, defeating overflow-y-auto
// and the parent's max-height (templates/index.tsx) instead of scrolling internally.
export default async function CarteCartColumn({
  orderPossible,
}: {
  orderPossible: boolean
}) {
  const cart = await retrieveCart().catch(() => null)
  const itemCount =
    cart?.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0
  const showFooter = Boolean(cart?.items?.length && cart.region)

  return (
    <div
      className="flex flex-col h-full min-h-0"
      data-testid="carte-cart-column"
    >
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-y-6 px-6 pt-6 pb-6 bg-white">
        <div className="flex flex-col gap-y-1">
          <Heading
            level="h2"
            className="font-display text-2xl uppercase tracking-[0.06em] text-neutral-900"
          >
            Votre panier
          </Heading>
          <Text as="span" className="text-sm text-neutral-500">
            {itemCount} produit{itemCount > 1 ? "s" : ""}
          </Text>
        </div>
        <Divider className="mt-0" />
        <CarteCartContent cart={cart} orderPossible={orderPossible} />
      </div>
      {showFooter && (
        <div className="px-6 pt-4 pb-6 border-t border-neutral-200 bg-white">
          <CarteCartCheckoutButton cart={cart} orderPossible={orderPossible} />
        </div>
      )}
    </div>
  )
}
