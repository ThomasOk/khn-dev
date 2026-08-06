type MedusaError = {
  response?: {
    data: { message?: string; code?: string } | string
    status: number
    headers: unknown
  }
  request?: unknown
  message?: string
  config?: { url: string; baseURL: string }
}

// The stable, typed discriminator MedusaError's `code` constructor argument
// carries end to end (apps/backend error-handler middleware forwards it
// verbatim for INVALID_DATA responses) — attached here so callers can match
// on `err.code` instead of sniffing prose out of `err.message`, which stays
// free-form UI text.
export type ClientError = Error & { code?: string }

// Builds the ClientError without throwing it. Split out from `medusaError`
// so Server Actions that need to hand an expected business error back to a
// client component as a normal return value (never as a `throw`) can reuse
// the same parsing — see `placeOrder` in `lib/data/cart.ts` for why a thrown
// error can't be used there: Next.js redacts the message of anything
// `throw`-n across the Server Action boundary in production builds.
export function toClientError(error: unknown): ClientError {
  const err = error as MedusaError
  if (err.response) {
    const u = new URL(err.config?.url ?? "", err.config?.baseURL ?? "")
    console.error("Resource:", u.toString())
    console.error("Response data:", err.response.data)
    console.error("Status code:", err.response.status)
    console.error("Headers:", err.response.headers)

    const data = err.response.data
    const message =
      typeof data === "object" && data !== null
        ? data.message || String(data)
        : data
    const code = typeof data === "object" && data !== null ? data.code : undefined

    const clientError: ClientError = new Error(
      message.charAt(0).toUpperCase() + message.slice(1) + "."
    )
    clientError.code = code
    return clientError
  } else if (err.request) {
    return new Error("No response received: " + String(err.request))
  } else {
    return new Error("Error setting up the request: " + err.message)
  }
}

export default function medusaError(error: unknown): never {
  throw toClientError(error)
}
