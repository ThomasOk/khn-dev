import { Heading, Text } from "@modules/common/components/ui"
import TransferActions from "@modules/order/components/transfer-actions"
import { retrieveOrder } from "@lib/data/orders"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  // The email links here with the order's internal id (needed for the
  // accept/decline calls below), but the customer only ever knows their
  // order by its display_id ("#4") — same reasoning as the "rattacher une
  // commande" form. Public GET, no auth required (native Medusa route).
  const order = await retrieveOrder(id).catch(() => null)
  const orderLabel = order ? `#${order.display_id}` : id

  return (
    <div className="flex flex-col gap-y-6 items-start w-2/5 mx-auto mt-24 mb-20">
      <Heading level="h1" className="text-xl text-zinc-900">
        Demande de rattachement pour la commande {orderLabel}
      </Heading>
      <Text className="text-zinc-600">
        Une demande de rattachement à cette commande ({orderLabel}) a été
        faite depuis un compte client. Si vous êtes à l&#39;origine de cette
        demande, vous pouvez l&#39;approuver en cliquant sur le bouton
        ci-dessous.
      </Text>
      <div className="w-full h-px bg-zinc-200" />
      <Text className="text-zinc-600">
        Si vous acceptez, cette commande sera rattachée à ce compte client et
        visible dans son historique de commandes.
      </Text>
      <Text className="text-zinc-600">
        Si vous ne reconnaissez pas cette demande, aucune action n&#39;est
        nécessaire.
      </Text>
      <div className="w-full h-px bg-zinc-200" />
      <TransferActions id={id} token={token} />
    </div>
  )
}
