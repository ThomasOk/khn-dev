// Order line items carry no quantity of their own — it lives on the
// OrderItem "detail" side (an Order's line item model has no `quantity`
// column; only the OrderItem it's paired with does). Every reader of an
// order's items needs this same fallback: order-confirmation.ts,
// kitchen-ticket-notification.ts, and issueInvoiceWorkflow all read it.
export function lineItemQuantity(item: {
  quantity?: unknown
  detail?: { quantity?: unknown } | null
}): unknown {
  return item.detail?.quantity ?? item.quantity
}
