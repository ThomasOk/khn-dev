import { clx } from "@modules/common/components/ui"
import { FormuleComposantVariant } from "@lib/data/formules"

type ComposantSelectProps = {
  label: string
  variants: FormuleComposantVariant[]
  current: string | undefined
  onSelect: (variantId: string) => void
  disabled: boolean
  "data-testid"?: string
}

// One control per Composant, offering only its curated Variantes — never the
// full Carte (spec §"L'ajout au panier écrit la Sélection").
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
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => onSelect(variant.id)}
            className={clx(
              "border-ui-border-base bg-ui-bg-subtle border text-small-regular h-10 rounded-rounded p-2 flex-1",
              {
                "border-ui-border-interactive": variant.id === current,
                "hover:shadow-elevation-card-rest transition-shadow ease-in-out duration-150":
                  variant.id !== current,
              }
            )}
            disabled={disabled}
            data-testid="composant-option-button"
          >
            {variant.title}
          </button>
        ))}
      </div>
    </div>
  )
}
