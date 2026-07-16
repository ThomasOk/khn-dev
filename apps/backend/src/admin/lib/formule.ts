// Shared shapes for the Curation widget. The wire contract is in English (see
// AGENTS.md); "Formule" and "Composant" stay untranslated on purpose (ticket
// 01-curation-module-et-administration.md, §"Correspondance des noms").

export type CuratedVariant = {
  id: string
  title: string
  product?: { title: string } | null
}

export type FormuleComposant = {
  id: string
  key: string
  label: string
  rank: number
  product_variants: CuratedVariant[]
}

export type Formule = {
  id: string
  product_id: string
  composants: FormuleComposant[]
}

// A Variante's title alone ("Bœuf") isn't enough to cook from — it's the dish
// name that disambiguates (spec: "par nom lisible", never by ID). Falls back
// to the variant title alone when the product isn't loaded on the object.
export function variantDisplayName(variant: {
  title: string
  product?: { title: string } | null
}): string {
  if (variant.product?.title) {
    return `${variant.product.title} — ${variant.title}`
  }
  return variant.title
}
