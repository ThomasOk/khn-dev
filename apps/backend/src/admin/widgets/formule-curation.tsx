import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { HttpTypes } from "@medusajs/types"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"
import { Formule } from "../lib/formule"
import { ComposantsSection } from "../components/formule/composants-section"

type Props = DetailWidgetProps<HttpTypes.AdminProduct>

// Curation lives on the Formule Produit's own page (spec §"La Curation :
// écran sur la fiche du Produit Formule"), not a separate settings page: it's
// a property of one specific Formule, not shared configuration. Renders
// nothing extra until this Produit is explicitly marked as a Formule — that
// is decided here, never derived from a Produit merely having Composants.
const FormuleCurationWidget = ({ data: product }: Props) => {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ formule: Formule | null }>(
        `/admin/formules/${product.id}`
      ),
    queryKey: ["formule-curation", product.id],
  })

  const markAsFormule = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/formules", {
        method: "POST",
        body: { product_id: product.id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["formule-curation", product.id],
      })
      toast.success("This product is now a Formule")
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to mark as Formule"),
  })

  if (isLoading) {
    return null
  }

  if (!data?.formule) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col">
            <Heading level="h2">Formule</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Mark this product as a Formule to curate its Composants.
            </Text>
          </div>
          <Button
            size="small"
            variant="secondary"
            isLoading={markAsFormule.isPending}
            onClick={() => markAsFormule.mutate()}
          >
            Mark as Formule
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <ComposantsSection formule={data.formule} />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default FormuleCurationWidget
