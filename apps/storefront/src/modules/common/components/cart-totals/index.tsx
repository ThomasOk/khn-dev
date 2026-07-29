"use client"

import { convertToLocale } from "@lib/util/money"
import { getTaxBreakdown } from "@lib/util/tax"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_total?: number | null
    item_subtotal?: number | null
    shipping_total?: number | null
    shipping_subtotal?: number | null
    items?: Array<{
      tax_total?: number | null
      tax_lines?: Array<{ rate: number }> | null
    }> | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_total,
    shipping_total,
    items,
  } = totals

  const taxBreakdown = getTaxBreakdown(items)

  return (
    <div>
      <div className="flex flex-col gap-y-2 txt-medium text-ui-fg-subtle ">
        <div className="flex items-center justify-between">
          <span>Sous-total</span>
          <span data-testid="cart-subtotal" data-value={item_total || 0}>
            {convertToLocale({ amount: item_total ?? 0, currency_code })}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Retrait en magasin</span>
          <span data-testid="cart-shipping" data-value={shipping_total || 0}>
            {shipping_total === 0
              ? "Gratuit"
              : convertToLocale({ amount: shipping_total ?? 0, currency_code })}
          </span>
        </div>
        {taxBreakdown.length > 0 ? (
          taxBreakdown.map(({ rate, amount }) => (
            <div
              key={rate}
              className="flex justify-between text-ui-fg-subtle text-sm"
            >
              <span>dont TVA ({rate} %)</span>
              <span data-testid="cart-taxes" data-value={amount}>
                {convertToLocale({ amount, currency_code })}
              </span>
            </div>
          ))
        ) : (
          <div className="flex justify-between text-ui-fg-subtle text-sm">
            <span>dont TVA</span>
            <span data-testid="cart-taxes" data-value={tax_total || 0}>
              {convertToLocale({ amount: tax_total ?? 0, currency_code })}
            </span>
          </div>
        )}
      </div>
      <div className="h-px w-full border-b border-gray-200 my-4" />
      <div className="flex items-center justify-between text-ui-fg-base mb-2 txt-medium ">
        <span>Total TTC</span>
        <span
          className="txt-xlarge-plus"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>
      <div className="h-px w-full border-b border-gray-200 mt-4" />
    </div>
  )
}

export default CartTotals
