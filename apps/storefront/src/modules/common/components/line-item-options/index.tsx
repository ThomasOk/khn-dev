import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

// Medusa auto-names the sole Option of a Produit with no real Options
// "Default option" (its lone Variante "Default variant") — a label with no
// meaning to the client, so it's dropped rather than printed as if it
// distinguished anything (same suppression as the backend's own
// DEFAULT_VARIANT_TITLE checks, e.g. apps/backend's kitchen-ticket.ts and
// store/formules route).
const DEFAULT_OPTION_TITLE = "Default option"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

const LineItemOptions = ({
  variant,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  // A Produit with several Options (e.g. Banh Sung's "Choix Nems" and "Choix
  // Banh Sung") must show which Option each value answers — the bare value
  // ("Porc / Tofu") doesn't say which choice is which.
  const options = (variant?.options ?? []).filter(
    (option) =>
      option.option?.title && option.option.title !== DEFAULT_OPTION_TITLE
  )

  if (options.length === 0) {
    return null
  }

  return (
    <div
      data-testid={dataTestid}
      data-value={dataValue}
      className="flex flex-col w-full"
    >
      {options.map((option) => (
        <Text
          key={option.id}
          className="inline-block txt-medium text-ui-fg-subtle w-full overflow-hidden text-ellipsis"
        >
          {option.option!.title}: {option.value}
        </Text>
      ))}
    </div>
  )
}

export default LineItemOptions
