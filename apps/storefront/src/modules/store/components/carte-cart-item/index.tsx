"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { updateLineItem } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { FormuleSelectionEntry } from "@lib/util/formule-selection"
import { Text } from "@modules/common/components/ui"
import DeleteButton from "@modules/common/components/delete-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import LineItemOptions from "@modules/common/components/line-item-options"
import Thumbnail from "@modules/products/components/thumbnail"

type CarteCartItemProps = {
  item: HttpTypes.StoreCartLineItem
  currencyCode: string
  formuleSelection?: FormuleSelectionEntry[]
}

// TODO: Update this to grab the actual max inventory, mirrors the same
// placeholder ceiling as the full cart page's quantity select (cart/components/item).
const MAX_QUANTITY = 10

export default function CarteCartItem({
  item,
  currencyCode,
  formuleSelection,
}: CarteCartItemProps) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    if (quantity < 1 || quantity > MAX_QUANTITY) {
      return
    }

    setError(null)
    setUpdating(true)

    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => setError(err.message))
      .finally(() => setUpdating(false))
  }

  const unitPrice = convertToLocale({
    amount: (item.total ?? 0) / item.quantity,
    currency_code: currencyCode,
  })
  const lineTotal = convertToLocale({
    amount: item.total ?? 0,
    currency_code: currencyCode,
  })

  const isFormule = Boolean(formuleSelection && formuleSelection.length > 0)

  return (
    <div className="flex gap-x-4 py-5" data-testid="carte-cart-item">
      <div className="w-16 shrink-0">
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="square"
          data-testid="product-thumbnail"
        />
      </div>

      <div className="flex flex-col gap-y-3 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-x-4">
          <Text
            as="span"
            className="font-semibold uppercase tracking-wide text-neutral-900"
            data-testid="product-title"
          >
            {item.product_title}
          </Text>
          <Text
            as="span"
            className="font-semibold text-neutral-900 whitespace-nowrap"
            data-testid="product-price"
          >
            {lineTotal}
          </Text>
        </div>

        {isFormule ? (
          <div className="flex flex-col" data-testid="formule-selection">
            {formuleSelection!.map((entry) => (
              <Text
                key={entry.label}
                as="span"
                className="text-sm text-neutral-500"
              >
                {entry.label}: {entry.variantTitle}
              </Text>
            ))}
          </div>
        ) : (
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
        )}

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center border border-neutral-300 rounded-md divide-x divide-neutral-300">
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity - 1)}
              disabled={updating || item.quantity <= 1}
              className="w-7 h-7 flex items-center justify-center text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Diminuer la quantité"
              data-testid="product-quantity-decrement"
            >
              −
            </button>
            <span
              className="w-7 h-7 flex items-center justify-center text-xs font-medium text-neutral-900"
              data-testid="product-quantity"
            >
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => changeQuantity(item.quantity + 1)}
              disabled={updating || item.quantity >= MAX_QUANTITY}
              className="w-7 h-7 flex items-center justify-center text-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Augmenter la quantité"
              data-testid="product-quantity-increment"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-x-3 text-sm text-neutral-400">
            <span data-testid="product-unit-price">
              {unitPrice} x {item.quantity}
            </span>
            <DeleteButton id={item.id} data-testid="product-delete-button" />
          </div>
        </div>

        <ErrorMessage error={error} data-testid="product-error-message" />
      </div>
    </div>
  )
}
