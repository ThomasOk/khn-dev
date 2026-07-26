import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import { retrieveShowcase } from "@lib/data/showcase"
import StoreTemplate from "@modules/store/templates"

export const metadata: Metadata = {
  title: "La carte",
  description: "Découvrez notre carte de plats.",
}

type Params = {
  params: Promise<{
    countryCode: string
  }>
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const [categories, showcase] = await Promise.all([
    listCategories(),
    retrieveShowcase(),
  ])

  // The single "commande possible" decision for the whole Carte (prefactor,
  // docs/specs/mode-vitrine.md "Storefront — rendu"): computed once here and
  // passed down, instead of every card and the cart deriving it on its own.
  const orderPossible = !showcase.showcase_mode

  return (
    <StoreTemplate
      countryCode={params.countryCode}
      categories={categories}
      orderPossible={orderPossible}
      showcaseNote={showcase.note}
    />
  )
}
