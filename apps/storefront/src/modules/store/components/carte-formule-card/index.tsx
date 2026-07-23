"use client"

import { FormuleComposant } from "@lib/data/formules"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import useToggleState from "@lib/hooks/use-toggle-state"
import { Text } from "@modules/common/components/ui"
import FormuleComposerModal from "./formule-composer-modal"

// The Formule half of the Carte's two card presentations (docs/specs/
// commande-depuis-la-page-carte.md, "Deux présentations de carte"): no
// image — a Formule is chosen on what it contains, not on a picture, so its
// fixed price and a summary (subtitle, description) carry the card instead
// (User Story 39). The "Composer ma formule" call to action opens
// FormuleComposerModal in place — the Carte already has both the Produit and
// its Curation loaded (CarteProductCard), so there is nothing left to fetch
// on click and no reason to navigate away.
export default function CarteFormuleCard({
  product,
  composants,
}: {
  product: HttpTypes.StoreProduct
  composants: FormuleComposant[]
}) {
  const { cheapestPrice } = getProductPrice({ product })
  const { state: isOpen, open, close } = useToggleState()

  return (
    <div
      className="flex flex-col gap-y-3 h-full bg-white p-6"
      data-testid="carte-product-card"
    >
      <div className="flex flex-col gap-y-3 flex-1">
        {/* No reserved height on title/subtitle — they hug their actual
            content so the price follows right after. The description below
            still reserves 3 lines, and the button is pinned to the card's
            bottom edge by flex-1 + mt-auto, so those two keep lining up
            across a row even though the title/subtitle block doesn't. */}
        <div className="flex flex-col">
          <Text
            as="span"
            className="font-display font-semibold text-lg uppercase tracking-wide text-stone-900 line-clamp-2"
            data-testid="carte-product-title"
          >
            {product.title}
          </Text>
          <Text
            as="span"
            className="text-xs uppercase tracking-widest text-stone-500"
            data-testid="carte-product-subtitle"
          >
            {product.subtitle}
          </Text>
        </div>
        {cheapestPrice && (
          <Text
            as="span"
            className="font-lato text-base text-stone-900"
            data-testid="carte-product-price"
          >
            {cheapestPrice.calculated_price}
          </Text>
        )}
        <Text className="text-sm text-stone-600 leading-relaxed line-clamp-3 min-h-[4.25rem]">
          {product.description}
        </Text>
      </div>
      <button
        type="button"
        onClick={open}
        className="mt-auto flex items-center justify-center w-full h-11 px-3 rounded-base bg-khn-teal hover:bg-khn-teal-panel transition-[background-color,transform] duration-150 ease-out motion-safe:active:scale-[0.97] text-white font-medium uppercase text-xs tracking-[0.15em] whitespace-nowrap"
        data-testid="formule-compose-button"
      >
        Composer ma formule
      </button>
      <FormuleComposerModal
        product={product}
        composants={composants}
        isOpen={isOpen}
        close={close}
      />
    </div>
  )
}
