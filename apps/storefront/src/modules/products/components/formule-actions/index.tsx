"use client"

import { addToCart } from "@lib/data/cart"
import { FormuleComposant } from "@lib/data/formules"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import ProductPrice from "../product-price"
import ComposantSelect from "./composant-select"

type FormuleActionsProps = {
  product: HttpTypes.StoreProduct
  composants: FormuleComposant[]
  disabled?: boolean
}

// The Formule equivalent of ProductActions: a selector per Composant instead
// of a variant/option picker, a price that never moves with the Sélection
// (it's the Formule's own single Variante, ADR 0001), and an add-to-cart that
// writes the Sélection as flat metadata (ADR 0005) instead of just a variant.
export default function FormuleActions({
  product,
  composants,
  disabled,
}: FormuleActionsProps) {
  const countryCode = useParams().countryCode as string

  const [selections, setSelections] = useState<Record<string, string>>({})
  const [isAdding, setIsAdding] = useState(false)

  // A Formule is a Produit à Variante unique (ADR 0001) — the line item
  // added to the cart is always this one Variante, never derived from the
  // Sélection.
  const variant = product.variants?.[0]

  const isComplete = useMemo(
    () => composants.every((composant) => !!selections[composant.key]),
    [composants, selections]
  )

  const handleSelect = (key: string, variantId: string) => {
    setSelections((prev) => ({ ...prev, [key]: variantId }))
  }

  const handleAddToCart = async () => {
    if (!variant?.id || !isComplete) {
      return
    }

    setIsAdding(true)

    const metadata = Object.fromEntries(
      composants.map((composant) => [
        `formule_${composant.key}_variant_id`,
        selections[composant.key],
      ])
    )

    await addToCart({
      variantId: variant.id,
      quantity: 1,
      countryCode,
      metadata,
    })

    setIsAdding(false)
  }

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-col gap-y-4">
        {composants.map((composant) => (
          <ComposantSelect
            key={composant.id}
            label={composant.label}
            variants={composant.variants}
            current={selections[composant.key]}
            onSelect={(variantId) => handleSelect(composant.key, variantId)}
            disabled={!!disabled || isAdding}
            data-testid={`formule-composant-${composant.key}`}
          />
        ))}
        <Divider />
      </div>

      <ProductPrice product={product} variant={variant} />

      <Button
        onClick={handleAddToCart}
        disabled={!isComplete || !variant || !!disabled || isAdding}
        variant="primary"
        className="w-full h-10"
        isLoading={isAdding}
        data-testid="formule-add-button"
      >
        Add to cart
      </Button>
    </div>
  )
}
