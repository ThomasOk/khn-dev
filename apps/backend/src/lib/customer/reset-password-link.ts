// The storefront's set-new-password page reads a single query param:
// `/reset-password?token=...`. No email or customer id travels alongside it
// — the token alone identifies the request (it's a signed JWT whose
// entity_id Medusa's own validateToken middleware decodes server-side) — so
// the link works from any device, logged out, exactly as the spec requires.
//
// STOREFRONT_URL has exactly one source of truth — .env / .env.template —
// same as buildCancellationLink (../reservation/cancellation-link.ts): no
// second default value duplicated in code for the two to drift out of sync.
export function buildResetPasswordLink(token: string): string {
  const url = new URL("/reset-password", process.env.STOREFRONT_URL)
  url.searchParams.set("token", token)
  return url.toString()
}
