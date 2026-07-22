import { useEffect, useMemo, useState } from "react"
import { clx } from "@modules/common/components/ui"
import NativeSelect from "@modules/common/components/native-select"
import { FormuleComposantVariant } from "@lib/data/formules"
import {
  ComposantProductGroup,
  deriveOptionChoices,
  groupVariantsByProduct,
  isValueAvailable,
  resolveVariantId,
} from "@lib/util/formule-variant-group"

type ComposantSelectProps = {
  label: string
  variants: FormuleComposantVariant[]
  current: string | undefined
  onSelect: (variantId: string | undefined) => void
  disabled: boolean
  "data-testid"?: string
}

// One control per Composant, offering only its curated Variantes — never the
// full Carte (spec §"L'ajout au panier écrit la Sélection"). A Produit
// curated with several Options (e.g. Banh Sung's 2 Options, 6 Variantes)
// is grouped into a single card with one select per Option instead of one
// button per combination.
export default function ComposantSelect({
  label,
  variants,
  current,
  onSelect,
  disabled,
  "data-testid": dataTestId,
}: ComposantSelectProps) {
  return (
    <div className="flex flex-col gap-y-3">
      <span className="text-sm">{label}</span>
      <div
        className="flex flex-wrap justify-between gap-2"
        data-testid={dataTestId}
      >
        {groupVariantsByProduct(variants).map((group) =>
          group.variants.length > 1 ? (
            <ComposantOptionGroup
              key={group.productId}
              group={group}
              current={current}
              onSelect={onSelect}
              disabled={disabled}
            />
          ) : (
            <button
              key={group.variants[0].id}
              type="button"
              onClick={() => onSelect(group.variants[0].id)}
              className={clx(
                "border-ui-border-base bg-ui-bg-subtle border text-small-regular h-10 rounded-rounded p-2 flex-1",
                {
                  "border-ui-border-interactive":
                    group.variants[0].id === current,
                  "hover:shadow-elevation-card-rest transition-shadow ease-in-out duration-150":
                    group.variants[0].id !== current,
                }
              )}
              disabled={disabled}
              data-testid="composant-option-button"
            >
              {group.variants[0].title}
            </button>
          )
        )}
      </div>
    </div>
  )
}

// A Produit with more than one curated Variante in this Composant: one card,
// one select per Option instead of one button per Variante combination — the
// client picks each Option independently and the matching curated Variante
// is resolved underneath. `current` only marks the card selected when it
// holds one of this group's own Variante ids — another group's selection
// leaves it blank and clears this card's own Option selects.
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
        "border-ui-border-base bg-ui-bg-subtle border rounded-rounded p-2 flex-1 flex flex-col gap-y-2",
        { "border-ui-border-interactive": !!currentVariant }
      )}
      data-testid="composant-option-group"
    >
      <span className="text-small-regular">{group.productTitle}</span>
      <div className="flex flex-col gap-2">
        {optionChoices.map((choice) => (
          <NativeSelect
            key={choice.optionId}
            value={selectedValues[choice.optionId] ?? ""}
            onChange={(e) => handleOptionChange(choice.optionId, e.target.value)}
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
  )
}
