import { PickupSlot } from "@lib/data/pickup"
import { formatSlotRange } from "@lib/util/timezone"

// The two flat, top-level cart.metadata keys the créneau is written under
// (ADR 0004). Named once so the write (lib/data/cart.ts) and the read
// (below) can't drift apart under a rename. Kept out of lib/data/pickup.ts
// because that file is "use server" and can only export async functions.
export const CRENEAU_DEBUT_KEY = "creneau_debut"
export const CRENEAU_FIN_KEY = "creneau_fin"

// The query-param key the payment step's redirect and the delivery step's
// recovery effect must agree on. Named once for the same reason as the two
// metadata keys above: nothing else keeps three separate string literals in
// sync under a rename.
export const PICKUP_SLOT_ERROR_PARAM = "pickup_slot_error"

// Reads the two keys above out of either cart.metadata or order.metadata —
// completeCartWorkflow recopies cart.metadata onto order.metadata verbatim
// (ADR 0004), so the same two flat keys land in both places.
export function pickupSlotFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): PickupSlot | null {
  const start = metadata?.[CRENEAU_DEBUT_KEY]
  const end = metadata?.[CRENEAU_FIN_KEY]

  if (typeof start === "string" && typeof end === "string") {
    return { start, end }
  }

  return null
}

// completeCartWorkflow's validate hook (apps/backend/src/workflows/hooks/
// complete-cart.ts) is the only place in the app that raises an error
// mentioning "pickup slot" — matching on it is how the storefront tells the
// 13h55 case (créneau rejected at payment) apart from any other completion
// failure, without the two apps sharing an error code.
export function isPickupSlotValidationError(
  message: string | null | undefined
): boolean {
  return (
    typeof message === "string" &&
    message.toLowerCase().includes("pickup slot")
  )
}

// Builds the recovery message shown back on the delivery step. The cart still
// carries whatever créneau was on it when /complete was called — that's
// exactly the one that just got rejected, so it's named explicitly rather
// than leaving the customer to guess which slot disappeared.
export function buildPickupSlotExpiredMessage(
  metadata: Record<string, unknown> | null | undefined
): string {
  const slot = pickupSlotFromMetadata(metadata)

  if (!slot) {
    return "Choose a pickup slot before paying."
  }

  return `Your slot ${formatSlotRange(
    slot.start,
    slot.end
  )} is no longer available. Please choose another one.`
}
