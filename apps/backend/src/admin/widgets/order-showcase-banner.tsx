import { useMutation, useQueryClient } from "@tanstack/react-query"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Text, toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"
import { SHOWCASE_QUERY_KEY, useShowcaseConfig } from "../lib/showcase"

// The only thing standing between "online ordering is off" and nobody
// noticing — an empty order list looks exactly like a calm day. Renders
// nothing unless Showcase mode is on; it can only turn the mode off, never
// on (turning on is a deliberate trip to the settings screen).
const OrderShowcaseBannerWidget = () => {
  const queryClient = useQueryClient()

  const { data } = useShowcaseConfig()

  const deactivate = useMutation({
    mutationFn: () =>
      sdk.client.fetch("/admin/showcase", {
        method: "POST",
        body: { enabled: false, note: data?.note ?? null },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOWCASE_QUERY_KEY })
      toast.success("Online ordering reopened")
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to reopen ordering"),
  })

  if (!data?.enabled) {
    return null
  }

  return (
    <Container className="bg-ui-tag-red-bg border-ui-tag-red-border flex items-center justify-between gap-x-4 p-4">
      <div className="flex flex-col">
        <Text
          size="small"
          weight="plus"
          leading="compact"
          className="text-ui-tag-red-text"
        >
          Showcase mode is on — online ordering is suspended
        </Text>
        {data.note && (
          <Text size="small" leading="compact" className="text-ui-tag-red-text">
            {data.note}
          </Text>
        )}
      </div>
      <Button
        size="small"
        variant="secondary"
        isLoading={deactivate.isPending}
        onClick={() => deactivate.mutate()}
      >
        Réactiver les commandes
      </Button>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default OrderShowcaseBannerWidget
