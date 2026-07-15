import { toRestaurantIso } from "../format"

// The route transports slots as ISO 8601 WITH the restaurant-timezone offset
// (never UTC "Z", never a bare local time). A wrong offset is the spec's most
// likely bug, so every assertion pins the exact string a client would parse.
describe("toRestaurantIso", () => {
  it("renders a summer instant with the +02:00 Paris offset", () => {
    // 2026-07-14T10:15:00Z is 12:15 Paris in CEST (+02:00).
    expect(toRestaurantIso(new Date("2026-07-14T10:15:00Z"))).toEqual(
      "2026-07-14T12:15:00+02:00"
    )
  })

  it("renders a winter instant with the +01:00 Paris offset", () => {
    // 2026-01-13T11:00:00Z is 12:00 Paris in CET (+01:00).
    expect(toRestaurantIso(new Date("2026-01-13T11:00:00Z"))).toEqual(
      "2026-01-13T12:00:00+01:00"
    )
  })

  it("uses the instant's own offset across the spring-forward boundary", () => {
    // 2026-03-29T09:00:00Z is 11:00 Paris — already past the 03:00 jump (+02:00).
    expect(toRestaurantIso(new Date("2026-03-29T09:00:00Z"))).toEqual(
      "2026-03-29T11:00:00+02:00"
    )
  })

  it("uses the instant's own offset across the fall-back boundary", () => {
    // 2026-10-25T10:00:00Z is 11:00 Paris — already past the 03:00 fall-back (+01:00).
    expect(toRestaurantIso(new Date("2026-10-25T10:00:00Z"))).toEqual(
      "2026-10-25T11:00:00+01:00"
    )
  })
})
