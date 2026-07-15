import { PickupSlot } from "@lib/data/pickup"

// The two flat, top-level cart.metadata keys the créneau is written under
// (ADR 0004). Named once so the write (lib/data/cart.ts) and the read
// (below) can't drift apart under a rename. Kept out of lib/data/pickup.ts
// because that file is "use server" and can only export async functions.
export const CRENEAU_DEBUT_KEY = "creneau_debut"
export const CRENEAU_FIN_KEY = "creneau_fin"

export function pickupSlotFromCartMetadata(
  metadata: Record<string, unknown> | null | undefined
): PickupSlot | null {
  const start = metadata?.[CRENEAU_DEBUT_KEY]
  const end = metadata?.[CRENEAU_FIN_KEY]

  if (typeof start === "string" && typeof end === "string") {
    return { start, end }
  }

  return null
}
