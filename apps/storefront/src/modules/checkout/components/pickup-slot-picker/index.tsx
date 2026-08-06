"use client"

import { setPickupSlot } from "@lib/data/cart"
import { listPickupSlots, PickupSlot } from "@lib/data/pickup"
import { formatSlotRange } from "@lib/util/timezone"
import { Radio, RadioGroup } from "@headlessui/react"
import ErrorMessage from "@modules/checkout/components/error-message"
import MedusaRadio from "@modules/common/components/radio"
import { clx, Text } from "@modules/common/components/ui"
import { useEffect, useState } from "react"

type PickupSlotPickerProps = {
  cartId: string
  initialSlot: PickupSlot | null
  // Called with a real slot on an explicit pick, or `null` when the
  // `initialSlot` the parent seeded us with (the créneau already on the
  // cart) turns out not to be selectable anymore — see the validation
  // effect below for why that can't be decided until the slots have loaded.
  onSelect: (slot: PickupSlot | null) => void
}

const slotKey = (slot: PickupSlot) => `${slot.start}|${slot.end}`

const PickupSlotPicker: React.FC<PickupSlotPickerProps> = ({
  cartId,
  initialSlot,
  onSelect,
}) => {
  const [slots, setSlots] = useState<PickupSlot[] | null>(null)
  const [ordersOpen, setOrdersOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<PickupSlot | null>(initialSlot)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listPickupSlots()
      .then((res) => {
        if (cancelled) {
          return
        }
        setSlots(res.slots)
        setOrdersOpen(res.orders_open)
      })
      .catch(() => {
        if (!cancelled) {
          setError("Impossible de charger les créneaux.")
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  // `selected` starts out as `initialSlot` — the créneau already on the
  // cart, seeded by the parent before this picker has fetched anything. It
  // was valid when it was chosen, but by the time this step is reopened
  // (the "Modifier" flow) it may no longer be: orders could have closed, or
  // that exact slot could have dropped out of the fetched list. Only once
  // loading settles can that be checked, so this runs once on that
  // transition — deliberately not on every `selected` change, since a fresh
  // pick via handleSelect below is always valid by construction.
  useEffect(() => {
    if (isLoading || !selected) {
      return
    }

    const stillValid =
      ordersOpen && !!slots?.some((s) => slotKey(s) === slotKey(selected))

    if (!stillValid) {
      setSelected(null)
      onSelect(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, slots, ordersOpen])

  const handleSelect = async (slot: PickupSlot) => {
    setError(null)
    const previous = selected
    setSelected(slot)

    await setPickupSlot({ cartId, slot })
      .then(() => {
        // Only unlocks the parent's "Continue to payment" once the write is
        // confirmed — the customer must not be let through to payment on a
        // créneau that failed to save.
        onSelect(slot)
      })
      .catch((err) => {
        setSelected(previous)
        setError(err.message)
      })
  }

  if (isLoading) {
    return (
      <Text className="text-ui-fg-muted txt-medium" data-testid="pickup-slots-loading">
        Chargement des créneaux…
      </Text>
    )
  }

  if (!ordersOpen || !slots?.length) {
    return (
      <Text
        className="text-ui-fg-muted txt-medium"
        data-testid="pickup-slots-closed"
      >
        Aucun créneau disponible pour le moment. Les commandes sont fermées.
      </Text>
    )
  }

  return (
    <div data-testid="pickup-slot-picker">
      <RadioGroup
        value={selected ? slotKey(selected) : null}
        onChange={(value) => {
          const slot = slots.find((s) => slotKey(s) === value)
          if (slot) {
            handleSelect(slot)
          }
        }}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slots.map((slot) => {
            const isSelected = selected ? slotKey(selected) === slotKey(slot) : false

            return (
              <Radio
                key={slotKey(slot)}
                value={slotKey(slot)}
                data-testid="pickup-slot-radio"
                className={clx(
                  "flex items-center gap-x-2 justify-center text-small-regular cursor-pointer py-3 border rounded-rounded hover:shadow-borders-interactive-with-active",
                  { "border-ui-border-interactive": isSelected }
                )}
              >
                <MedusaRadio checked={isSelected} />
                {formatSlotRange(slot.start, slot.end)}
              </Radio>
            )
          })}
        </div>
      </RadioGroup>
      <ErrorMessage error={error} data-testid="pickup-slot-error-message" />
    </div>
  )
}

export default PickupSlotPicker
