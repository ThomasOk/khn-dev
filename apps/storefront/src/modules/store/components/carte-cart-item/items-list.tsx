"use client"

import { useEffect, useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { FormuleSelectionEntry } from "@lib/util/formule-selection"
import { clx } from "@modules/common/components/ui"
import Divider from "@modules/common/components/divider"
import CarteCartItem from "@modules/store/components/carte-cart-item"

type CartItemEntry = {
  item: HttpTypes.StoreCartLineItem
  formuleSelection?: FormuleSelectionEntry[]
}

// A deleted line item disappears the instant the server action's
// revalidateTag re-renders the cart (docs/specs/commande-depuis-la-page-carte.md
// never asked for this, but a row teleporting out reads as broken). This
// mirrors `items` in local state one render behind so a removed row stays
// mounted just long enough to collapse instead of vanishing mid-frame.
// Quantity changes and any re-fetch that doesn't drop an id pass straight
// through untouched — only an id missing from the new list triggers the exit.
export default function CarteCartItemsList({
  items,
  currencyCode,
}: {
  items: CartItemEntry[]
  currencyCode: string
}) {
  const [displayed, setDisplayed] = useState(items)
  const [leavingIds, setLeavingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const nextIds = new Set(items.map(({ item }) => item.id))
    const removedIds = displayed
      .map(({ item }) => item.id)
      .filter((id) => !nextIds.has(id))

    if (removedIds.length === 0) {
      setDisplayed(items)
      return
    }

    setLeavingIds(
      (prev) => new Set(Array.from(prev).concat(removedIds))
    )

    const timeout = setTimeout(() => {
      setDisplayed(items)
      setLeavingIds((prev) => {
        const next = new Set(prev)
        removedIds.forEach((id) => next.delete(id))
        return next
      })
    }, 200)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items])

  return (
    <div data-testid="items-table">
      {displayed.map(({ item, formuleSelection }, index) => {
        const isLeaving = leavingIds.has(item.id)

        return (
          <div
            key={item.id}
            className={clx(
              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
              isLeaving
                ? "grid-rows-[0fr] opacity-0"
                : "grid-rows-[1fr] opacity-100"
            )}
          >
            <div className="overflow-hidden">
              <CarteCartItem
                item={item}
                currencyCode={currencyCode}
                formuleSelection={formuleSelection}
              />
              {index < displayed.length - 1 && <Divider />}
            </div>
          </div>
        )
      })}
    </div>
  )
}
