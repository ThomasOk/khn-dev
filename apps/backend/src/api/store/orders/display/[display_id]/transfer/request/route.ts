import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  getOrderDetailWorkflow,
  requestOrderTransferWorkflow,
} from "@medusajs/core-flows"
import { RequestOrderTransferByDisplayIdSchema } from "../../../../middlewares"

// POST /store/orders/display/:display_id/transfer/request — same request
// as Medusa's native POST /store/orders/:id/transfer/request, except keyed
// by the order's customer-facing display_id ("#4") instead of its internal
// id ("order_01…"). The storefront's "rattacher une commande" form only
// ever showed the customer their display_id (order details page,
// confirmation email — see order-confirmation.ts) — the native route
// needing the internal id made the form unusable in practice: the
// customer had no way to know it. This resolves display_id → internal id
// first, then delegates to the same workflow the native route uses.
//
// No new authorization surface: requesting a transfer still only queues an
// OrderChange the *original* order's email must approve via
// acceptTransfer's token link (createTransferRequest in lib/data/orders.ts)
// — knowing a display_id (or, on the native route, the internal id) never
// completes a transfer by itself.
export async function POST(
  req: AuthenticatedMedusaRequest<RequestOrderTransferByDisplayIdSchema>,
  res: MedusaResponse
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const displayId = Number(req.params.display_id)
  const notFound = () =>
    res.status(404).json({
      message: "Commande introuvable : vérifiez le numéro saisi.",
    })

  if (!Number.isInteger(displayId)) {
    return notFound()
  }

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id"],
    // display_id is stored as an integer, but the remote query's filter
    // type for it is (like several Medusa filter types) declared as
    // string — matches fine at the DB level, Postgres casts a numeric
    // string against an integer column in a parameterized WHERE.
    filters: { display_id: String(displayId) },
  })

  const order = orders[0]
  if (!order) {
    return notFound()
  }

  const customerId = req.auth_context.actor_id

  try {
    await requestOrderTransferWorkflow(req.scope).run({
      input: {
        order_id: order.id,
        customer_id: customerId,
        logged_in_user: customerId,
        description: req.validatedBody.description,
        update_order_email: req.validatedBody.update_order_email,
      },
    })
  } catch (error) {
    logger.error(
      `Échec de la demande de rattachement pour la commande ${order.id}: ${error.message}`
    )
    if (error.message?.includes("already belongs to customer")) {
      return res.status(400).json({
        message: "Cette commande est déjà rattachée à votre compte.",
      })
    }
    return res.status(400).json({
      message:
        "Impossible de rattacher cette commande pour le moment. Réessayez ou contactez-nous.",
    })
  }

  const { result } = await getOrderDetailWorkflow(req.scope).run({
    input: {
      fields: ["id", "display_id", "email"],
      order_id: order.id,
    },
  })

  res.status(200).json({ order: result })
}
