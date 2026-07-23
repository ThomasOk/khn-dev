"use client"

import { Dialog, Transition } from "@headlessui/react"
import { addToCart } from "@lib/data/cart"
import { FormuleComposant, FormuleComposantVariant } from "@lib/data/formules"
import { getProductPrice } from "@lib/util/get-product-price"
import { formuleSelectionKey } from "@lib/util/formule-selection"
import {
  ComposantProductGroup,
  deriveOptionChoices,
  groupVariantsByProduct,
  isValueAvailable,
  resolveVariantId,
} from "@lib/util/formule-variant-group"
import { HttpTypes } from "@medusajs/types"
import { Button, clx } from "@modules/common/components/ui"
import NativeSelect from "@modules/common/components/native-select"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import X from "@modules/common/icons/x"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Fragment, useEffect, useMemo, useState } from "react"

type FormuleComposerModalProps = {
  product: HttpTypes.StoreProduct
  composants: FormuleComposant[]
  isOpen: boolean
  close: () => void
}

// The modal a "Composer ma formule" click opens from the Carte: one section
// per Composant, offering only its curated Variantes (never the full Carte),
// and an add-to-cart that writes the Sélection as flat metadata (ADR 0005).
// The Formule's own price stays fixed regardless of what's picked (ADR
// 0001) — nothing here ever recomputes it from the Sélection.
export default function FormuleComposerModal({
  product,
  composants,
  isOpen,
  close,
}: FormuleComposerModalProps) {
  const countryCode = useParams().countryCode as string
  const { cheapestPrice } = getProductPrice({ product })

  const [selections, setSelections] = useState<
    Record<string, string | undefined>
  >({})
  const [isAdding, setIsAdding] = useState(false)

  const variant = product.variants?.[0]

  const isComplete = useMemo(
    () => composants.every((composant) => !!selections[composant.key]),
    [composants, selections]
  )

  const handleAddToCart = async () => {
    if (!variant?.id || !isComplete) {
      return
    }

    setIsAdding(true)

    // `isComplete` above guarantees every Composant has a string Sélection
    // by this point — the cast reflects that, not a new assumption.
    const metadata = Object.fromEntries(
      composants.map((composant) => [
        formuleSelectionKey(composant.key),
        selections[composant.key],
      ])
    ) as Record<string, string>

    await addToCart({
      variantId: variant.id,
      quantity: 1,
      countryCode,
      metadata,
    })

    setIsAdding(false)
    setSelections({})
    close()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-hidden">
          <div className="flex min-h-full h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className="flex flex-col w-full max-w-2xl h-full max-h-[85vh] bg-white text-left overflow-hidden"
                data-testid="formule-composer-modal"
              >
                <div className="relative bg-khn-teal text-white p-6 shrink-0">
                  <button
                    type="button"
                    onClick={close}
                    className="absolute top-4 right-4 text-white/80 hover:text-white"
                    aria-label="Fermer"
                    data-testid="close-modal-button"
                  >
                    <X size={20} />
                  </button>
                  <Dialog.Title as="div">
                    <span className="block text-xs uppercase tracking-[0.2em] text-white/70">
                      {composants.map((composant) => composant.label).join(" + ")}
                    </span>
                    <span className="block font-display font-semibold text-xl uppercase tracking-wide mt-1 pr-8">
                      {product.title}
                    </span>
                  </Dialog.Title>
                  {product.description && (
                    <p className="text-sm text-white/80 leading-relaxed mt-2">
                      {product.description}
                    </p>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto bg-[#F7F3F0] p-6 flex flex-col gap-y-8">
                  {composants.map((composant) => (
                    <ComposantSection
                      key={composant.id}
                      composant={composant}
                      current={selections[composant.key]}
                      onSelect={(variantId) =>
                        setSelections((prev) => ({
                          ...prev,
                          [composant.key]: variantId,
                        }))
                      }
                      disabled={isAdding}
                    />
                  ))}
                </div>

                <div className="shrink-0 border-t border-stone-200 bg-white">
                  <div className="flex items-center justify-between px-6 pt-4">
                    <span className="text-xs uppercase tracking-widest text-stone-500">
                      Prix de la formule
                    </span>
                    {cheapestPrice && (
                      <span
                        className="font-lato text-lg text-stone-900"
                        data-testid="formule-modal-price"
                      >
                        {cheapestPrice.calculated_price}
                      </span>
                    )}
                  </div>
                  <div className="p-6 pt-4">
                    <Button
                      onClick={handleAddToCart}
                      disabled={!isComplete || !variant || isAdding}
                      variant="accent"
                      className="w-full h-11 uppercase text-xs tracking-[0.15em] rounded-base"
                      isLoading={isAdding}
                      data-testid="formule-add-button"
                    >
                      Ajouter au panier
                    </Button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

function ComposantSection({
  composant,
  current,
  onSelect,
  disabled,
}: {
  composant: FormuleComposant
  current: string | undefined
  onSelect: (variantId: string | undefined) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-x-3">
        <span className="font-display font-semibold text-sm uppercase tracking-widest text-stone-900">
          {composant.label}
        </span>
        <span className="h-px flex-1 bg-orange-400" />
      </div>
      <div
        className="flex flex-col gap-y-2"
        data-testid={`formule-composant-${composant.key}`}
      >
        {groupVariantsByProduct(composant.variants).map((group) =>
          group.variants.length > 1 ? (
            <ComposantOptionGroup
              key={group.productId}
              group={group}
              current={current}
              onSelect={onSelect}
              disabled={disabled}
            />
          ) : (
            <ComposantOption
              key={group.variants[0].id}
              variant={group.variants[0]}
              selected={group.variants[0].id === current}
              onSelect={() => onSelect(group.variants[0].id)}
              disabled={disabled}
            />
          )
        )}
      </div>
    </div>
  )
}

// A Produit with more than one curated Variante in this Composant: one card,
// one select per Option (e.g. "Viande 1", "Viande 2") instead of one flat
// row per Variante combination — the client picks each Option independently
// and the matching curated Variante is resolved underneath. `current` only
// marks the card selected when it holds one of this group's own Variante
// ids — another group's selection leaves it blank and clears this card's own
// Option selects.
function ComposantOptionGroup({
  group,
  current,
  onSelect,
  disabled,
}: {
  group: ComposantProductGroup
  current: string | undefined
  onSelect: (variantId: string | undefined) => void
  disabled: boolean
}) {
  const currentVariant = group.variants.find((v) => v.id === current)
  const optionChoices = useMemo(() => deriveOptionChoices(group), [group])

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        (currentVariant?.options ?? []).map((o) => [o.option_id, o.value])
      )
  )

  // Another group in the same Composant got selected instead — clear this
  // card's own Option selects so it doesn't keep showing a stale partial
  // pick.
  useEffect(() => {
    if (!currentVariant) {
      setSelectedValues({})
    }
  }, [currentVariant])

  const handleOptionChange = (optionId: string, value: string) => {
    const next = { ...selectedValues, [optionId]: value }
    setSelectedValues(next)
    onSelect(resolveVariantId(group, next))
  }

  return (
    <div
      className={clx(
        "flex items-center gap-x-4 p-3 border bg-white transition-colors",
        currentVariant ? "border-orange-400 bg-orange-50" : "border-stone-200"
      )}
      data-testid="composant-option-group"
    >
      <ComposantThumbnail thumbnail={group.thumbnail} />
      <div className="flex-1 flex flex-col gap-y-1.5 py-0.5">
        <span className="font-display font-semibold text-sm uppercase tracking-wide text-stone-900">
          {group.productTitle}
        </span>
        <div className="flex flex-col gap-2">
          {optionChoices.map((choice) => (
            <NativeSelect
              key={choice.optionId}
              value={selectedValues[choice.optionId] ?? ""}
              onChange={(e) =>
                handleOptionChange(choice.optionId, e.target.value)
              }
              disabled={disabled}
              placeholder={choice.optionTitle}
              className="bg-white h-9 text-sm w-full"
              data-testid="composant-option-variant-select"
            >
              {choice.values.map((value) => (
                <option
                  key={value}
                  value={value}
                  disabled={
                    !isValueAvailable(
                      group,
                      choice.optionId,
                      value,
                      selectedValues
                    )
                  }
                >
                  {value}
                </option>
              ))}
            </NativeSelect>
          ))}
        </div>
      </div>
    </div>
  )
}

function ComposantThumbnail({ thumbnail }: { thumbnail: string | null }) {
  return (
    <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-full bg-stone-100 flex items-center justify-center">
      {thumbnail ? (
        <Image src={thumbnail} alt="" fill className="object-cover" sizes="56px" />
      ) : (
        <PlaceholderImage size={20} />
      )}
    </div>
  )
}

function ComposantOption({
  variant,
  selected,
  onSelect,
  disabled,
}: {
  variant: FormuleComposantVariant
  selected: boolean
  onSelect: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={clx(
        "flex items-center gap-x-4 text-left p-3 border bg-white transition-colors disabled:opacity-50",
        selected
          ? "border-orange-400 bg-orange-50"
          : "border-stone-200 hover:border-stone-300"
      )}
      data-testid="composant-option-button"
    >
      <ComposantThumbnail thumbnail={variant.thumbnail} />
      <span className="font-display font-semibold text-sm uppercase tracking-wide text-stone-900">
        {variant.title}
      </span>
    </button>
  )
}
