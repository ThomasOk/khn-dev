import { Suspense } from "react"
import { HttpTypes } from "@medusajs/types"

import { getFormule } from "@lib/data/formules"
import CarteFormuleCard from "@modules/store/components/carte-formule-card"
import CartePlatCard from "@modules/store/components/carte-plat-card"
import SkeletonCarteCard from "@modules/skeletons/components/skeleton-carte-card"

// Whether a Produit is a Formule is read from its Curation, never guessed
// from its category (docs/specs/commande-depuis-la-page-carte.md, "Les
// cartes consomment le Produit déjà chargé") — a Formule filed outside the
// Formules section must still render as a Formule. That lookup is this
// card's own loading boundary: cards reveal themselves as their Curation
// arrives rather than waiting on the slowest one on the page.
export default function CarteProductCard({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) {
  return (
    <Suspense fallback={<SkeletonCarteCard />}>
      <CarteProductCardContent product={product} region={region} />
    </Suspense>
  )
}

async function CarteProductCardContent({
  product,
  region,
}: {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
}) {
  const formule = await getFormule(product.id, region.id)

  if (formule) {
    return <CarteFormuleCard product={product} composants={formule.composants} />
  }

  return <CartePlatCard product={product} region={region} />
}
