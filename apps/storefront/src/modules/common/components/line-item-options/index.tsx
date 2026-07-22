import { HttpTypes } from "@medusajs/types"
import { Text } from "@modules/common/components/ui"

// Medusa auto-names the sole Variante of a Produit with no real Options
// "Default variant" — a label with no meaning to the client, so the whole
// line is dropped rather than printed as if it distinguished anything (same
// suppression as the backend's own DEFAULT_VARIANT_TITLE checks, e.g.
// apps/backend's kitchen-ticket.ts and store/formules route).
const DEFAULT_VARIANT_TITLE = "Default variant"

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
  if (!variant?.title || variant.title === DEFAULT_VARIANT_TITLE) {
    return null
  }

  return (
    <Text
      data-testid={dataTestid}
      data-value={dataValue}
      className="inline-block txt-medium text-ui-fg-subtle w-full overflow-hidden text-ellipsis"
    >
      Variant: {variant.title}
    </Text>
  )
}

export default LineItemOptions
