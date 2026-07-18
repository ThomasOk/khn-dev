import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { HttpTypes } from "@medusajs/types"
import { ArrowDownTray } from "@medusajs/icons"
import { Button, Container, Text, toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"

type Props = {
  data: HttpTypes.AdminOrder
}

type InvoiceInfo = {
  id: string
  formatted_number: string
}

// Displays the Facture's Numéro and a download link once payment.captured
// has issued one for this Commande (spec User Stories 15-16). No link, no
// widget at all, on a Commande that never got one — the Facture is never
// regenerated on demand, only the bytes stored at issuance are ever served
// (GET /admin/orders/:id/invoice/download).
const OrderInvoiceWidget = ({ data: order }: Props) => {
  const [downloading, setDownloading] = useState(false)

  const { data } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ invoice: InvoiceInfo | null }>(
        `/admin/orders/${order.id}/invoice`
      ),
    queryKey: ["order-invoice", order.id],
  })

  const invoice = data?.invoice

  if (!invoice) {
    return null
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await sdk.client.fetch<Response>(
        `/admin/orders/${order.id}/invoice/download`,
        { headers: { accept: "application/pdf" } }
      )
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `facture-${invoice.formatted_number}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Failed to download the Facture.")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          Facture {invoice.formatted_number}
        </Text>
        <Button
          size="small"
          variant="secondary"
          isLoading={downloading}
          onClick={handleDownload}
        >
          <ArrowDownTray />
          Download
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderInvoiceWidget
