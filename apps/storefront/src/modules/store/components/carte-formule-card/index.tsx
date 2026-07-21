import { HttpTypes } from "@medusajs/types"

import { FormuleComposant } from "@lib/data/formules"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Text } from "@modules/common/components/ui"
import FormuleActions from "@modules/products/components/formule-actions"

// The Formule half of the Carte's two card presentations (docs/specs/
// commande-depuis-la-page-carte.md, "Deux présentations de carte"): no
// image — a Formule is chosen on what it contains, not on a picture, so its
// fixed price and its Composant selectors (FormuleActions) carry the card
// instead (User Story 39).
export default function CarteFormuleCard({
  product,
  composants,
}: {
  product: HttpTypes.StoreProduct
  composants: FormuleComposant[]
}) {
  return (
    <div className="flex flex-col gap-y-3" data-testid="carte-product-card">
      <LocalizedClientLink href={`/products/${product.handle}`}>
        <Text
          className="font-medium text-neutral-900 text-sm leading-snug"
          data-testid="carte-product-title"
        >
          {product.title}
        </Text>
      </LocalizedClientLink>
      <FormuleActions product={product} composants={composants} />
    </div>
  )
}
