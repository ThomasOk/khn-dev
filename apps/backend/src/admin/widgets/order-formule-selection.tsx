import { useQueries } from "@tanstack/react-query"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { HttpTypes } from "@medusajs/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { sdk } from "../lib/sdk"
import {
  Formule,
  FormuleSelectionEntry,
  formuleSelectionEntries,
  resolveFormuleSelectionEntries,
} from "../lib/formule"

type Props = {
  data: HttpTypes.AdminOrder
}

type FormuleLine = {
  item: HttpTypes.AdminOrderLineItem
  productId: string
  entries: FormuleSelectionEntry[]
}

// Reads order.items[].metadata straight from props (spec User Story 17, ADR
// 0005 §"Consequences") — the Sélection itself needs no network call. The
// Composant's `label` and the chosen Variante's name do: they live in the
// Curation, resolved per distinct Formule product via the same
// GET /admin/formules/:product_id route the product-page Curation widget
// already uses (formule-curation.tsx), so a repeat visit shares its
// react-query cache instead of re-fetching.
const OrderFormuleSelectionWidget = ({ data: order }: Props) => {
  const formuleLines: FormuleLine[] = (order.items ?? []).flatMap((item) => {
    const entries = formuleSelectionEntries(item.metadata)
    if (entries.length === 0 || !item.product_id) {
      return []
    }
    return [{ item, productId: item.product_id, entries }]
  })

  const productIds = Array.from(new Set(formuleLines.map((l) => l.productId)))

  const curationQueries = useQueries({
    queries: productIds.map((productId) => ({
      queryKey: ["formule-curation", productId],
      queryFn: () =>
        sdk.client.fetch<{ formule: Formule | null }>(
          `/admin/formules/${productId}`
        ),
    })),
  })

  if (formuleLines.length === 0) {
    return null
  }

  const curationQueryByProductId = new Map(
    productIds.map((productId, index) => [productId, curationQueries[index]])
  )

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Formule selections</Heading>
      </div>
      <div className="flex flex-col gap-y-4 px-6 py-4">
        {formuleLines.map(({ item, productId, entries }) => {
          const query = curationQueryByProductId.get(productId)

          return (
            <div key={item.id} className="flex flex-col gap-y-1">
              <Text size="small" leading="compact" weight="plus">
                {item.title}
              </Text>
              <div className="flex flex-col gap-y-0.5 pl-3">
                {query?.isLoading ? (
                  <Text size="small" className="text-ui-fg-subtle">
                    Loading…
                  </Text>
                ) : (
                  resolveFormuleSelectionEntries(
                    entries,
                    query?.data?.formule
                  ).map((entry) => (
                    <Text
                      key={entry.composantKey}
                      size="small"
                      className="text-ui-fg-subtle"
                    >
                      {entry.label} — {entry.variantLabel}
                    </Text>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderFormuleSelectionWidget
