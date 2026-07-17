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

export default function medusaError(error: unknown): never {
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
    throw clientError
  } else if (err.request) {
    throw new Error("No response received: " + String(err.request))
  } else {
    throw new Error("Error setting up the request: " + err.message)
  }
}
