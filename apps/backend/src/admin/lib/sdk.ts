import Medusa from "@medusajs/js-sdk"

// The admin SDK client. Every request from an admin extension goes through this —
// never a bare fetch() — so the session auth headers are attached automatically.
export const sdk = new Medusa({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  debug: import.meta.env.DEV,
  auth: {
    type: "session",
  },
})
