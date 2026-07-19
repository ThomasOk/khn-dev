// A tiny sliding-window request counter — the mechanism behind ticket 08's
// "limite de fréquence par email et par IP". It is deliberately NOT persisted
// anywhere (ADR 0008, and the ticket's "sans état supplémentaire"): the state
// lives in a plain Map for the life of the Node process and is gone on the
// next deploy or restart, exactly like the in-memory locking provider this
// feature already refuses to rely on for anything that must actually hold
// (reserve-table.ts). That is acceptable here because this guard has a
// different job than the lock: it only needs to blunt the boring case — a
// script or a stuck retry loop hammering the same email or IP — not stand up
// to a determined, multi-IP attacker. `now` is always passed in, never read
// from the system clock, so the sliding window stays testable.
export type RateLimiter = {
  allow(key: string, now: number): boolean
}

export type RateLimiterOptions = {
  windowMs: number
  max: number
}

export function createRateLimiter({
  windowMs,
  max,
}: RateLimiterOptions): RateLimiter {
  const hitsByKey = new Map<string, number[]>()

  return {
    allow(key: string, now: number): boolean {
      const cutoff = now - windowMs
      const recentHits = (hitsByKey.get(key) ?? []).filter((t) => t > cutoff)

      if (recentHits.length >= max) {
        hitsByKey.set(key, recentHits)
        return false
      }

      recentHits.push(now)
      hitsByKey.set(key, recentHits)
      return true
    },
  }
}
