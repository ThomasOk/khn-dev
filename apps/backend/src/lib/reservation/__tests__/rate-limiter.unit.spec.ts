import { createRateLimiter } from "../rate-limiter"

// Seam 2 for ticket 08's frequency guard: a pure sliding window with an
// injected clock, on the model of derive-availability.unit.spec.ts. HTTP
// coverage exercises the duplicate rule and the daily plafond (both cheap to
// prove through a real request); this file is the only place the window's
// edges — the boundary hit, the slide, per-key isolation — get pinned down.

describe("createRateLimiter", () => {
  it("allows up to `max` hits inside the window, then refuses the next one", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 3 })
    const now = 10_000

    expect(limiter.allow("a@example.com", now)).toBe(true)
    expect(limiter.allow("a@example.com", now)).toBe(true)
    expect(limiter.allow("a@example.com", now)).toBe(true)
    expect(limiter.allow("a@example.com", now)).toBe(false)
  })

  it("keeps refusing while still inside the window, even later", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 1 })
    const now = 10_000

    expect(limiter.allow("a@example.com", now)).toBe(true)
    expect(limiter.allow("a@example.com", now + 999)).toBe(false)
  })

  it("lets a hit back in once it slides out of the window", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 1 })
    const now = 10_000

    expect(limiter.allow("a@example.com", now)).toBe(true)
    // Just under the window: the first hit still counts.
    expect(limiter.allow("a@example.com", now + 999)).toBe(false)
    // Exactly one window later: the first hit has aged out.
    expect(limiter.allow("a@example.com", now + 1_000)).toBe(true)
  })

  it("only evicts what has actually expired, not the whole history", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 2 })

    expect(limiter.allow("a@example.com", 0)).toBe(true)
    expect(limiter.allow("a@example.com", 500)).toBe(true)
    // The hit at 0 just fell out of the window; the one at 500 has not.
    expect(limiter.allow("a@example.com", 1_001)).toBe(true)
    expect(limiter.allow("a@example.com", 1_001)).toBe(false)
  })

  it("tracks each key independently — one identity maxing out never blocks another", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 1 })
    const now = 10_000

    expect(limiter.allow("a@example.com", now)).toBe(true)
    expect(limiter.allow("a@example.com", now)).toBe(false)
    expect(limiter.allow("b@example.com", now)).toBe(true)
  })
})
