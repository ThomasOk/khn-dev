// The storefront doesn't have its cancellation page yet (ticket 09), but the
// client's confirmation email is contractual and must carry a working link
// from day one — this is the URL contract ticket 09's page must serve:
// `/table-reservations/cancel?id=...&token=...`. Query params, not a nested
// `/table-reservations/:id/cancel` path, so the link is a single flat page
// independent of the store API's own routing. The storefront's middleware
// redirects a country-code-less path to the visitor's region automatically,
// so no country code is built in here.
//
// STOREFRONT_URL has exactly one source of truth — .env / .env.template —
// same as RESEND_FROM and RESEND_API_KEY nearby: no second default value
// duplicated in code for the two to drift out of sync.
export function buildCancellationLink(id: string, token: string): string {
  const url = new URL("/table-reservations/cancel", process.env.STOREFRONT_URL)
  url.searchParams.set("id", id)
  url.searchParams.set("token", token)
  return url.toString()
}
