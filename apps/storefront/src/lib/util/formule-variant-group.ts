import { isEqual } from "lodash"
import { FormuleComposantVariant } from "@lib/data/formules"

// A curated Produit with several Options (e.g. Banh Sung's 2 Options, 6
// Variantes) would otherwise explode into one row per combination in a
// Composant's picker — grouping by `product_id` turns that into one card per
// Produit, its Option values picked independently instead of picked as one
// long combined string (User request: "Banh Sung" listing every "Viande 1 /
// Viande 2" combination instead of two separate choices).
export type ComposantProductGroup = {
  productId: string
  productTitle: string
  thumbnail: string | null
  variants: FormuleComposantVariant[]
}

// Order follows each Produit's first appearance in the Curation.
export function groupVariantsByProduct(
  variants: FormuleComposantVariant[]
): ComposantProductGroup[] {
  const groups: ComposantProductGroup[] = []
  const indexByProductId = new Map<string, number>()

  for (const variant of variants) {
    const existingIndex = indexByProductId.get(variant.product_id)

    if (existingIndex === undefined) {
      indexByProductId.set(variant.product_id, groups.length)
      groups.push({
        productId: variant.product_id,
        productTitle: variant.product_title,
        thumbnail: variant.thumbnail,
        variants: [variant],
      })
    } else {
      groups[existingIndex].variants.push(variant)
    }
  }

  return groups
}

export type OptionChoice = {
  optionId: string
  optionTitle: string
  values: string[]
}

function optionValuesOf(
  variant: FormuleComposantVariant
): Record<string, string> {
  return Object.fromEntries(
    variant.options.map((option) => [option.option_id, option.value])
  )
}

// The Options to render a select for, and the values worth offering in each
// — derived only from what's actually curated in this group, never the
// Produit's full Option definitions. A Composant that curates 6 of a
// Produit's 16 possible combinations must not let the client wander into the
// other 10 (ADR 0005: the Curation is Variante-grained, not Option-grained).
// Order follows each Option's, and each value's, first appearance among the
// group's curated Variantes.
export function deriveOptionChoices(group: ComposantProductGroup): OptionChoice[] {
  const choices: OptionChoice[] = []
  const indexByOptionId = new Map<string, number>()

  for (const variant of group.variants) {
    for (const option of variant.options) {
      let index = indexByOptionId.get(option.option_id)

      if (index === undefined) {
        index = choices.length
        indexByOptionId.set(option.option_id, index)
        choices.push({
          optionId: option.option_id,
          optionTitle: option.option_title,
          values: [],
        })
      }

      if (!choices[index].values.includes(option.value)) {
        choices[index].values.push(option.value)
      }
    }
  }

  return choices
}

// The curated Variante matching a full set of Option values, or undefined
// while the selection is still incomplete (or, in principle, points at a
// combination nothing curated — the same "no matching Variante" case
// `isValidVariant` handles on the ordinary product page).
export function resolveVariantId(
  group: ComposantProductGroup,
  selectedValues: Record<string, string>
): string | undefined {
  return group.variants.find((variant) =>
    isEqual(optionValuesOf(variant), selectedValues)
  )?.id
}

// Whether `value` is still reachable for `optionId` given what's already
// picked for the group's *other* Options — the cascading filter that keeps
// the client from painting themselves into an uncurated combination (e.g.
// picking "Viande 1: Crevettes" first must not still offer "Viande 2:
// Poulet" if that pair was never curated).
export function isValueAvailable(
  group: ComposantProductGroup,
  optionId: string,
  value: string,
  selectedValues: Record<string, string>
): boolean {
  const otherSelections = Object.entries(selectedValues).filter(
    ([id]) => id !== optionId
  )

  return group.variants.some((variant) => {
    const variantValues = optionValuesOf(variant)

    return (
      variantValues[optionId] === value &&
      otherSelections.every(([id, val]) => variantValues[id] === val)
    )
  })
}
