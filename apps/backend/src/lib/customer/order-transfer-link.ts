// The storefront's transfer acceptance page already exists and reads its
// order id and token from the path itself: `/order/:id/transfer/:token`
// (apps/storefront/src/app/[countryCode]/(main)/order/[id]/transfer/[token]/
// page.tsx, native Medusa starter route, untouched by this ticket). The
// storefront's middleware redirects a country-code-less path to the
// visitor's region automatically, so no country code is built in here — same
// discipline as buildCancellationLink (../reservation/cancellation-link.ts).
//
// STOREFRONT_URL has exactly one source of truth — .env / .env.template —
// same as buildResetPasswordLink nearby: no second default value duplicated
// in code for the two to drift out of sync.
export function buildOrderTransferLink(orderId: string, token: string): string {
  const url = new URL(
    `/order/${orderId}/transfer/${token}`,
    process.env.STOREFRONT_URL
  )
  return url.toString()
}
