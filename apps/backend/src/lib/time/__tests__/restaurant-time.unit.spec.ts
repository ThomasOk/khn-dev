import {
  addDays,
  civilDayAt,
  civilDayKey,
  dayOfWeek,
  hhmmToMinutes,
  offsetMsAt,
  wallClockAt,
  wallTimeToTimestamp,
} from "../restaurant-time"

// These primitives are the shared floor under every wall-clock computation in
// the app (pickup slots today, table-reservation availability next). They read
// no system clock: every case below states an explicit instant and asserts an
// explicit instant back.
//
// Paris switches at 01:00 UTC, so on 2026-03-29 the local clock jumps 02:00 →
// 03:00 (02:00–02:59 never happens) and on 2026-10-25 it falls 03:00 → 02:00
// (02:00–02:59 happens twice). Those two Sundays are where a naive
// implementation is wrong, so they carry most of the assertions.

const HOUR_MS = 3_600_000

describe("wallClockAt", () => {
  it("decomposes a summer instant into Paris wall-clock components", () => {
    // 2026-07-14T10:15:30Z is 12:15:30 Paris (CEST, +02:00).
    expect(wallClockAt(Date.parse("2026-07-14T10:15:30Z"))).toEqual({
      year: 2026,
      month: 7,
      day: 14,
      hour: 12,
      minute: 15,
      second: 30,
    })
  })

  it("decomposes a winter instant an hour closer to UTC", () => {
    // Same wall-clock hour as above costs an hour more of UTC in CET (+01:00).
    expect(wallClockAt(Date.parse("2026-01-13T11:15:30Z"))).toEqual({
      year: 2026,
      month: 1,
      day: 13,
      hour: 12,
      minute: 15,
      second: 30,
    })
  })

  it("reports midnight as hour 0, not 24", () => {
    // hourCycle h23: the boundary instant must not read as the previous day's 24:00.
    expect(wallClockAt(Date.parse("2026-07-13T22:00:00Z"))).toMatchObject({
      day: 14,
      hour: 0,
    })
  })

  it("rolls the civil day over before UTC does", () => {
    // 23:30Z on 07-13 is already 01:30 on 07-14 in Paris.
    expect(wallClockAt(Date.parse("2026-07-13T23:30:00Z"))).toMatchObject({
      month: 7,
      day: 14,
      hour: 1,
    })
  })
})

describe("civilDayAt", () => {
  it("keeps only the civil day of the instant", () => {
    expect(civilDayAt(Date.parse("2026-07-14T10:15:30Z"))).toEqual({
      year: 2026,
      month: 7,
      day: 14,
    })
  })

  it("returns the Paris civil day, not the UTC one", () => {
    // 22:30Z on 07-13 is 00:30 on 07-14 in Paris: the two calendars disagree here.
    expect(civilDayAt(Date.parse("2026-07-13T22:30:00Z"))).toEqual({
      year: 2026,
      month: 7,
      day: 14,
    })
  })
})

describe("offsetMsAt", () => {
  it("is +01:00 in winter", () => {
    expect(offsetMsAt(Date.parse("2026-01-13T12:00:00Z"))).toEqual(HOUR_MS)
  })

  it("is +02:00 in summer", () => {
    expect(offsetMsAt(Date.parse("2026-07-14T12:00:00Z"))).toEqual(2 * HOUR_MS)
  })

  it("changes at the spring-forward instant itself", () => {
    // The jump happens at 01:00 UTC on 2026-03-29.
    expect(offsetMsAt(Date.parse("2026-03-29T00:59:59Z"))).toEqual(HOUR_MS)
    expect(offsetMsAt(Date.parse("2026-03-29T01:00:00Z"))).toEqual(2 * HOUR_MS)
  })

  it("changes at the fall-back instant itself", () => {
    expect(offsetMsAt(Date.parse("2026-10-25T00:59:59Z"))).toEqual(2 * HOUR_MS)
    expect(offsetMsAt(Date.parse("2026-10-25T01:00:00Z"))).toEqual(HOUR_MS)
  })
})

describe("wallTimeToTimestamp", () => {
  const july14 = { year: 2026, month: 7, day: 14 }
  const january13 = { year: 2026, month: 1, day: 13 }

  it("resolves a summer wall time at the +02:00 offset", () => {
    expect(wallTimeToTimestamp(july14, 12 * 60)).toEqual(
      Date.parse("2026-07-14T10:00:00Z")
    )
  })

  it("resolves the same wall time an hour later in winter", () => {
    expect(wallTimeToTimestamp(january13, 12 * 60)).toEqual(
      Date.parse("2026-01-13T11:00:00Z")
    )
  })

  it("resolves midnight itself", () => {
    expect(wallTimeToTimestamp(july14, 0)).toEqual(
      Date.parse("2026-07-13T22:00:00Z")
    )
  })

  it("accepts minutes past 1440 as spilling into the next civil day", () => {
    // A dinner service running to 00:30 belongs to its own day's schedule; the
    // table-reservation availability computation relies on this staying legal.
    expect(wallTimeToTimestamp(july14, 24 * 60 + 30)).toEqual(
      Date.parse("2026-07-14T22:30:00Z") // 00:30 on 07-15, Paris
    )
  })

  describe("on the spring-forward Sunday", () => {
    const march29 = { year: 2026, month: 3, day: 29 }

    it("uses the pre-jump offset for a wall time before 02:00", () => {
      expect(wallTimeToTimestamp(march29, 1 * 60 + 30)).toEqual(
        Date.parse("2026-03-29T00:30:00Z") // 01:30+01:00
      )
    })

    it("uses the post-jump offset for a wall time after 03:00", () => {
      // This is the bug the two-pass resolution exists for: taking the day's
      // offset once at midnight would place 11:00 an hour early.
      expect(wallTimeToTimestamp(march29, 11 * 60)).toEqual(
        Date.parse("2026-03-29T09:00:00Z") // 11:00+02:00
      )
    })

    it("pushes a wall time that never happened forward into the new offset", () => {
      // 02:30 does not exist on this day. It resolves to 03:30 local rather than
      // throwing — a schedule row configured there still yields a real instant.
      const resolved = wallTimeToTimestamp(march29, 2 * 60 + 30)

      expect(resolved).toEqual(Date.parse("2026-03-29T01:30:00Z"))
      expect(wallClockAt(resolved)).toMatchObject({ hour: 3, minute: 30 })
    })
  })

  describe("on the fall-back Sunday", () => {
    const october25 = { year: 2026, month: 10, day: 25 }

    it("uses the pre-fall offset for a wall time before 02:00", () => {
      expect(wallTimeToTimestamp(october25, 1 * 60)).toEqual(
        Date.parse("2026-10-24T23:00:00Z") // 01:00+02:00
      )
    })

    it("uses the post-fall offset for a wall time after 03:00", () => {
      expect(wallTimeToTimestamp(october25, 11 * 60)).toEqual(
        Date.parse("2026-10-25T10:00:00Z") // 11:00+01:00
      )
    })

    it("resolves a wall time that happened twice to its second occurrence", () => {
      // 02:30 occurs at both +02:00 and +01:00. We pin the later one so the
      // choice is a documented decision rather than an accident of refactoring.
      const resolved = wallTimeToTimestamp(october25, 2 * 60 + 30)

      expect(resolved).toEqual(Date.parse("2026-10-25T01:30:00Z"))
      expect(offsetMsAt(resolved)).toEqual(HOUR_MS)
    })
  })

  describe("wall time → instant → wall time round-trip", () => {
    // The acceptance criterion of the extraction: whatever the offset in force,
    // resolving a wall time and reading it back must give the same wall time.
    const roundTrip = (day: { year: number; month: number; day: number }, minutes: number) => {
      const wall = wallClockAt(wallTimeToTimestamp(day, minutes))
      return wall.hour * 60 + wall.minute
    }

    it("survives the spring-forward Sunday on both sides of the jump", () => {
      const march29 = { year: 2026, month: 3, day: 29 }

      expect(roundTrip(march29, 1 * 60 + 30)).toEqual(1 * 60 + 30)
      expect(roundTrip(march29, 11 * 60)).toEqual(11 * 60)
      expect(roundTrip(march29, 23 * 60 + 45)).toEqual(23 * 60 + 45)
    })

    it("survives the fall-back Sunday on both sides of the repeat", () => {
      const october25 = { year: 2026, month: 10, day: 25 }

      expect(roundTrip(october25, 1 * 60)).toEqual(1 * 60)
      expect(roundTrip(october25, 11 * 60)).toEqual(11 * 60)
      expect(roundTrip(october25, 23 * 60 + 45)).toEqual(23 * 60 + 45)
    })
  })
})

describe("dayOfWeek", () => {
  it("numbers the week from Sunday = 0", () => {
    // 2026-07-12 is a Sunday; the week that follows walks 0..6 in order.
    const week = [12, 13, 14, 15, 16, 17, 18].map((day) =>
      dayOfWeek({ year: 2026, month: 7, day })
    )

    expect(week).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it("handles January and February, which Sakamoto's algorithm shifts to the previous year", () => {
    expect(dayOfWeek({ year: 2026, month: 1, day: 13 })).toEqual(2) // Tuesday
    expect(dayOfWeek({ year: 2026, month: 2, day: 28 })).toEqual(6) // Saturday
  })

  it("handles a leap day", () => {
    expect(dayOfWeek({ year: 2024, month: 2, day: 29 })).toEqual(4) // Thursday
  })

  it("handles the day after a leap day", () => {
    expect(dayOfWeek({ year: 2024, month: 3, day: 1 })).toEqual(5) // Friday
  })

  it("handles a century year that is a leap year", () => {
    expect(dayOfWeek({ year: 2000, month: 2, day: 29 })).toEqual(2) // Tuesday
  })

  it("agrees with the civil day read back from an instant", () => {
    // Cross-check against the platform: same day, two independent routes.
    const timestamp = Date.parse("2026-10-25T10:00:00Z")

    expect(dayOfWeek(civilDayAt(timestamp))).toEqual(
      new Date(timestamp).getUTCDay()
    )
  })
})

describe("hhmmToMinutes", () => {
  it("converts a wall-clock HH:MM to minutes since midnight", () => {
    expect(hhmmToMinutes("00:00")).toEqual(0)
    expect(hhmmToMinutes("12:30")).toEqual(750)
    expect(hhmmToMinutes("23:59")).toEqual(1439)
  })

  it("reads a leading zero as decimal, not octal", () => {
    expect(hhmmToMinutes("08:09")).toEqual(489)
  })
})

describe("civilDayKey", () => {
  it("renders a zero-padded YYYY-MM-DD", () => {
    expect(civilDayKey({ year: 2026, month: 7, day: 4 })).toEqual("2026-07-04")
  })

  it("sorts lexicographically in chronological order", () => {
    // Closure intervals are compared as strings, so this property is load-bearing.
    const keys = [
      civilDayKey({ year: 2026, month: 10, day: 2 }),
      civilDayKey({ year: 2026, month: 2, day: 10 }),
      civilDayKey({ year: 2025, month: 12, day: 31 }),
    ]

    expect([...keys].sort()).toEqual([
      "2025-12-31",
      "2026-02-10",
      "2026-10-02",
    ])
  })
})

describe("addDays", () => {
  it("advances within a month", () => {
    expect(addDays({ year: 2026, month: 7, day: 14 }, 5)).toEqual({
      year: 2026,
      month: 7,
      day: 19,
    })
  })

  it("rolls over a month boundary", () => {
    expect(addDays({ year: 2026, month: 7, day: 30 }, 3)).toEqual({
      year: 2026,
      month: 8,
      day: 2,
    })
  })

  it("rolls over a year boundary", () => {
    expect(addDays({ year: 2026, month: 12, day: 30 }, 3)).toEqual({
      year: 2027,
      month: 1,
      day: 2,
    })
  })

  it("goes backward for a negative delta", () => {
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({
      year: 2026,
      month: 2,
      day: 28,
    })
  })

  it("a zero delta returns the same day", () => {
    expect(addDays({ year: 2026, month: 7, day: 14 }, 0)).toEqual({
      year: 2026,
      month: 7,
      day: 14,
    })
  })
})
