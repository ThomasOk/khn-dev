import {
  deriveAvailability,
  deriveOpenDays,
  deriveReservationAcceptance,
  ExistingReservationInput,
  ReservationClosureInput,
  ServiceWindowInput,
  TableReservationConfigInput,
} from "../derive-availability"

// Seam 2 of the table-reservation spec: deriveAvailability is a pure function
// with an injected clock, and this file is the only place the capacity math
// and the daylight-saving behaviour can be provoked on demand. ADR 0006 is
// tested directly here: capacity is consumed over an INTERVAL, never at a
// single instant, and never with one Service's current duration silently
// applied to another Réservation's own.

const baseConfig: TableReservationConfigInput = {
  min_lead_minutes: 0,
  horizon_days: 30,
  slot_step_minutes: 30,
  max_party_size: 8,
  last_seating_margin_minutes: 0,
}

const service = (overrides: Partial<ServiceWindowInput> = {}): ServiceWindowInput => ({
  id: "sw_test",
  day_of_week: 2, // Tuesday
  start_time: "12:00",
  end_time: "13:00",
  capacity: 10,
  duration_minutes: 90,
  active: true,
  ...overrides,
})

const reservation = (
  overrides: Partial<ExistingReservationInput> = {}
): ExistingReservationInput => ({
  time: "19:00",
  party_size: 2,
  duration_minutes: 90,
  ...overrides,
})

describe("deriveAvailability", () => {
  describe("daylight saving", () => {
    it("uses each candidate's own offset on the spring-forward Sunday, not midnight's", () => {
      // 2026-03-29: midnight is +01:00 but 11:00 is +02:00 (clocks jumped at
      // 03:00 local). A single-pass implementation using midnight's offset for
      // the whole day would place every candidate an hour late — here, on the
      // wrong side of the min_lead cutoff.
      const now = new Date("2026-03-29T09:30:00Z")

      const result = deriveAvailability({
        date: "2026-03-29",
        party_size: 2,
        services: [service({ day_of_week: 0, start_time: "11:00", end_time: "12:00" })],
        reservations: [],
        closures: [],
        config: { ...baseConfig, slot_step_minutes: 15 },
        now,
      })

      // Correct offset (+02:00): 11:00→09:00Z, 11:15→09:15Z, 11:30→09:30Z (all
      // <= cutoff 09:30Z, excluded), 11:45→09:45Z and 12:00→10:00Z (> cutoff,
      // included). A midnight-offset (+01:00) bug would instead compute
      // 10:00Z..11:00Z and offer all five.
      expect(result.times).toEqual(["11:45", "12:00"])
    })

    it("uses each candidate's own offset on the fall-back Sunday, not midnight's", () => {
      // 2026-10-25: midnight is +02:00 but 11:00 is +01:00 (clocks fell back at
      // 03:00 local). The midnight-offset bug runs the other way here: it would
      // compute every candidate an hour EARLY and drop them all.
      const now = new Date("2026-10-25T09:45:00Z")

      const result = deriveAvailability({
        date: "2026-10-25",
        party_size: 2,
        services: [service({ day_of_week: 0, start_time: "11:00", end_time: "12:00" })],
        reservations: [],
        closures: [],
        config: { ...baseConfig, slot_step_minutes: 15 },
        now,
      })

      // Correct offset (+01:00): 11:00→10:00Z .. 12:00→11:00Z, all > cutoff
      // 09:45Z, so all five survive.
      expect(result.times).toEqual(["11:00", "11:15", "11:30", "11:45", "12:00"])
    })
  })

  describe("délai minimum boundary", () => {
    const base = {
      date: "2026-07-14", // Tuesday, CEST +02:00, no DST edge nearby
      party_size: 2,
      services: [service({ start_time: "12:00", end_time: "13:00" })],
      reservations: [],
      closures: [],
      config: { ...baseConfig, min_lead_minutes: 30, slot_step_minutes: 15 },
    }

    it("excludes a candidate starting exactly on the now+délai limit (strictly after)", () => {
      // now = 12:00 Paris, now+30 = 12:30 Paris: the 12:30 candidate sits
      // exactly on the limit.
      const result = deriveAvailability({ ...base, now: new Date("2026-07-14T10:00:00Z") })

      expect(result.times).toEqual(["12:45", "13:00"])
    })

    it("includes a candidate once now+délai falls just before it", () => {
      // now = 11:59 Paris, now+30 = 12:29 Paris — one minute before 12:30.
      const result = deriveAvailability({ ...base, now: new Date("2026-07-14T09:59:00Z") })

      expect(result.times).toEqual(["12:30", "12:45", "13:00"])
    })
  })

  describe("horizon boundary", () => {
    // now = 2026-07-14 (Tuesday), horizon_days = 30.
    const now = new Date("2026-07-14T08:00:00Z")

    it("still offers a Service on the last day of the horizon (day 30)", () => {
      // 2026-08-13 is a Thursday, exactly 30 days after 2026-07-14.
      const result = deriveAvailability({
        date: "2026-08-13",
        party_size: 2,
        services: [service({ day_of_week: 4, start_time: "12:00", end_time: "13:00" })],
        reservations: [],
        closures: [],
        config: baseConfig,
        now,
      })

      expect(result.open).toBe(true)
      expect(result.times.length).toBeGreaterThan(0)
    })

    it("closes the day just past the horizon (day 31), even with a matching Service", () => {
      // 2026-08-14 is a Friday, 31 days after 2026-07-14 — a Service is
      // declared for it on purpose, to prove the horizon (not a missing
      // Service) is what closes the day.
      const result = deriveAvailability({
        date: "2026-08-14",
        party_size: 2,
        services: [service({ day_of_week: 5, start_time: "12:00", end_time: "13:00" })],
        reservations: [],
        closures: [],
        config: baseConfig,
        now,
      })

      expect(result).toEqual({ times: [], open: false })
    })
  })

  describe("capacity reached exactly (ADR 0006)", () => {
    // Single candidate at 19:00 (window collapsed to one instant), capacity 6,
    // 4 Couverts already taken by an existing Réservation.
    const base = {
      date: "2026-07-14",
      services: [
        service({ start_time: "19:00", end_time: "19:00", capacity: 6, duration_minutes: 60 }),
      ],
      reservations: [reservation({ time: "19:00", party_size: 4, duration_minutes: 60 })],
      closures: [],
      config: baseConfig,
      now: new Date("2026-07-14T06:00:00Z"),
    }

    it("accepts the last party that still fits exactly", () => {
      const result = deriveAvailability({ ...base, party_size: 2 })
      expect(result.times).toEqual(["19:00"])
    })

    it("refuses the party that no longer fits by a single Couvert", () => {
      const result = deriveAvailability({ ...base, party_size: 3 })
      expect(result.times).toEqual([])
    })
  })

  it("keeps two Services on the same day on their own capacity and duration", () => {
    const result = deriveAvailability({
      date: "2026-07-14",
      party_size: 5,
      services: [
        service({ start_time: "12:00", end_time: "12:00", capacity: 10, duration_minutes: 60 }), // lunch
        service({ start_time: "19:00", end_time: "19:00", capacity: 4, duration_minutes: 120 }), // dinner
      ],
      reservations: [],
      closures: [],
      config: baseConfig,
      now: new Date("2026-07-14T06:00:00Z"),
    })

    // Lunch's capacity (10) takes a party of 5; dinner's (4) refuses it.
    expect(result.times).toEqual(["12:00"])
  })

  it("sums overlapping Réservations on their own recorded durations, never the Service's current one", () => {
    // Candidate at 20:00, Service's CURRENT duration is 90 (20:00-21:30).
    // Existing A ran 60 min (19:00-20:00): under its own duration it ends
    // exactly at the candidate's start and must NOT count. If duration were
    // wrongly re-read from the Service (90 min), A would run until 20:30 and
    // wrongly overlap, pushing the peak to 4 and refusing party_size 3.
    const result = deriveAvailability({
      date: "2026-07-14",
      party_size: 3,
      services: [
        service({ start_time: "20:00", end_time: "20:00", capacity: 5, duration_minutes: 90 }),
      ],
      reservations: [
        reservation({ time: "19:00", party_size: 2, duration_minutes: 60 }), // A
        reservation({ time: "19:30", party_size: 2, duration_minutes: 120 }), // B, overlaps
      ],
      closures: [],
      config: baseConfig,
      now: new Date("2026-07-14T06:00:00Z"),
    })

    // Only B (2 Couverts) genuinely overlaps 20:00-21:30. 2 + 3 = 5 = capacity.
    expect(result.times).toEqual(["20:00"])
  })

  it("treats the overlap bound as semi-open: an ending or starting Réservation never double-counts", () => {
    // Candidate 20:00-21:00 (duration 60). C ends exactly at 20:00 (frees its
    // Couverts); D starts exactly at 21:00 (hasn't claimed them yet). Neither
    // should count against capacity.
    const result = deriveAvailability({
      date: "2026-07-14",
      party_size: 3,
      services: [
        service({ start_time: "20:00", end_time: "20:00", capacity: 3, duration_minutes: 60 }),
      ],
      reservations: [
        reservation({ time: "19:00", party_size: 3, duration_minutes: 60 }), // C: [19:00, 20:00)
        reservation({ time: "21:00", party_size: 3, duration_minutes: 60 }), // D: [21:00, 22:00)
      ],
      closures: [],
      config: baseConfig,
      now: new Date("2026-07-14T06:00:00Z"),
    })

    expect(result.times).toEqual(["20:00"])
  })

  it("keeps occupancy on the Service's own day when it spills past midnight", () => {
    // Saturday dinner 22:00-23:00, duration 120: the 22:30 candidate occupies
    // [22:30, 00:30) — minute 1350 to 1470, past the 1440 mark on purpose
    // (ADR 0006). An existing Réservation at 23:45 overlaps the tail of that
    // interval and must still be read as belonging to this Service's day, not
    // wrapped onto a following day that doesn't exist in this input.
    const base = {
      date: "2026-07-18", // Saturday
      services: [
        service({ day_of_week: 6, start_time: "22:00", end_time: "23:00", capacity: 5, duration_minutes: 120 }),
      ],
      reservations: [reservation({ time: "23:45", party_size: 2, duration_minutes: 60 })],
      closures: [],
      config: { ...baseConfig, slot_step_minutes: 30 },
      now: new Date("2026-07-18T06:00:00Z"),
    }

    expect(deriveAvailability({ ...base, party_size: 3 }).times).toContain("22:30")
    expect(deriveAvailability({ ...base, party_size: 4 }).times).not.toContain("22:30")
  })

  it("returns open: false with no times on a day with no Service at all", () => {
    const result = deriveAvailability({
      date: "2026-07-15", // Wednesday
      party_size: 2,
      services: [service({ day_of_week: 2 })], // Tuesday only
      reservations: [],
      closures: [],
      config: baseConfig,
      now: new Date("2026-07-14T06:00:00Z"),
    })

    expect(result).toEqual({ times: [], open: false })
  })

  it("returns open: true with no times when party_size exceeds the plafond", () => {
    const result = deriveAvailability({
      date: "2026-07-14",
      party_size: 9,
      services: [service()],
      reservations: [],
      closures: [],
      config: { ...baseConfig, max_party_size: 8 },
      now: new Date("2026-07-14T06:00:00Z"),
    })

    expect(result).toEqual({ times: [], open: true })
  })

  it("offers the last candidate up to end_time minus the last-seating margin, inclusive", () => {
    const result = deriveAvailability({
      date: "2026-07-14",
      party_size: 2,
      services: [
        service({ start_time: "19:00", end_time: "21:00", duration_minutes: 60, capacity: 10 }),
      ],
      reservations: [],
      closures: [],
      config: { ...baseConfig, slot_step_minutes: 30, last_seating_margin_minutes: 30 },
      now: new Date("2026-07-14T06:00:00Z"),
    })

    // Window 19:00-21:00, margin 30 ⇒ last offerable start is 20:30, included.
    expect(result.times).toEqual(["19:00", "19:30", "20:00", "20:30"])
  })

  describe("Fermeture de réservation", () => {
    // A closure period 2026-07-13 (Mon) .. 2026-07-15 (Wed). A Service is
    // declared every day of that stretch plus its neighbours, so it is the
    // closure boundary itself under test, never a missing Service.
    const base = {
      party_size: 2,
      services: [
        service({ day_of_week: 0, start_time: "12:00", end_time: "12:00" }), // Sunday 07-12, day before
        service({ day_of_week: 1, start_time: "12:00", end_time: "12:00" }), // Monday 07-13, start_date
        service({ day_of_week: 2, start_time: "12:00", end_time: "12:00" }), // Tuesday 07-14, inside
        service({ day_of_week: 3, start_time: "12:00", end_time: "12:00" }), // Wednesday 07-15, end_date
        service({ day_of_week: 4, start_time: "12:00", end_time: "12:00" }), // Thursday 07-16, day after
      ],
      reservations: [],
      config: baseConfig,
      now: new Date("2026-07-10T06:00:00Z"),
    }
    const closures: ReservationClosureInput[] = [
      { start_date: "2026-07-13", end_date: "2026-07-15" },
    ]

    it("empties availability entirely for a day inside the period", () => {
      const result = deriveAvailability({ ...base, date: "2026-07-14", closures })

      expect(result).toEqual({ times: [], open: false })
    })

    it("empties availability on the start_date bound, inclusive", () => {
      const result = deriveAvailability({ ...base, date: "2026-07-13", closures })

      expect(result).toEqual({ times: [], open: false })
    })

    it("empties availability on the end_date bound, inclusive", () => {
      const result = deriveAvailability({ ...base, date: "2026-07-15", closures })

      expect(result).toEqual({ times: [], open: false })
    })

    it("still offers a Service the day just before the period starts", () => {
      const result = deriveAvailability({ ...base, date: "2026-07-12", closures })

      expect(result.open).toBe(true)
      expect(result.times).not.toEqual([])
    })

    it("offers a Service again the day just after the period ends", () => {
      const result = deriveAvailability({ ...base, date: "2026-07-16", closures })

      expect(result.open).toBe(true)
      expect(result.times).not.toEqual([])
    })

    it("wipes even a single-day closure (start_date === end_date), the bank-holiday case", () => {
      const result = deriveAvailability({
        ...base,
        date: "2026-07-14",
        closures: [{ start_date: "2026-07-14", end_date: "2026-07-14" }],
      })

      expect(result).toEqual({ times: [], open: false })
    })
  })
})

describe("deriveReservationAcceptance", () => {
  // Seam 2 for ticket 04's POST route: the revalidation that runs inside the
  // locked job. It must accept exactly the Heures deriveAvailability would
  // have offered, and reject everything else with a reason the route can map
  // to the right response — never silently accepting a stale client value.
  const base = {
    date: "2026-07-14", // Tuesday
    services: [
      service({ start_time: "19:00", end_time: "21:00", capacity: 6, duration_minutes: 60 }),
    ],
    reservations: [],
    closures: [],
    config: baseConfig,
    now: new Date("2026-07-14T06:00:00Z"),
  }

  it("accepts an offerable Heure and reports its Service's id and current duration", () => {
    const result = deriveReservationAcceptance({
      ...base,
      party_size: 2,
      time: "19:30",
    })

    expect(result).toEqual({
      accepted: true,
      service_window_id: "sw_test",
      duration_minutes: 60,
    })
  })

  it("rejects a hand-crafted Heure that was never an offerable candidate at all", () => {
    // 19:05 is inside the window but off the slot_step_minutes grid.
    const result = deriveReservationAcceptance({
      ...base,
      party_size: 2,
      time: "19:05",
    })

    expect(result).toEqual({ accepted: false, reason: "time_unavailable" })
  })

  it("rejects the exact Heure that capacity no longer has room for (ADR 0006)", () => {
    const result = deriveReservationAcceptance({
      ...base,
      services: [
        service({ start_time: "19:30", end_time: "19:30", capacity: 6, duration_minutes: 60 }),
      ],
      reservations: [reservation({ time: "19:30", party_size: 6, duration_minutes: 60 })],
      party_size: 1,
      time: "19:30",
    })

    expect(result).toEqual({ accepted: false, reason: "time_unavailable" })
  })

  it("rejects with party_size_too_large, distinct from an unavailable Heure", () => {
    const result = deriveReservationAcceptance({
      ...base,
      config: { ...baseConfig, max_party_size: 8 },
      party_size: 9,
      time: "19:30",
    })

    expect(result).toEqual({ accepted: false, reason: "party_size_too_large" })
  })

  it("rejects with closed on a day covered by a Fermeture de réservation", () => {
    const result = deriveReservationAcceptance({
      ...base,
      closures: [{ start_date: "2026-07-14", end_date: "2026-07-14" }],
      party_size: 2,
      time: "19:30",
    })

    expect(result).toEqual({ accepted: false, reason: "closed" })
  })

  it("rejects with closed past the horizon", () => {
    const result = deriveReservationAcceptance({
      ...base,
      config: { ...baseConfig, horizon_days: 1 },
      now: new Date("2026-01-01T06:00:00Z"),
      party_size: 2,
      time: "19:30",
    })

    expect(result).toEqual({ accepted: false, reason: "closed" })
  })

  it("picks the Service that actually has room when two Services differ only in capacity", () => {
    const result = deriveReservationAcceptance({
      ...base,
      services: [
        service({
          id: "sw_lunch",
          start_time: "12:00",
          end_time: "12:00",
          capacity: 10,
          duration_minutes: 60,
        }),
        service({
          id: "sw_dinner",
          start_time: "19:00",
          end_time: "19:00",
          capacity: 4,
          duration_minutes: 120,
        }),
      ],
      party_size: 5,
      time: "12:00",
    })

    expect(result).toEqual({
      accepted: true,
      service_window_id: "sw_lunch",
      duration_minutes: 60,
    })
  })
})

describe("deriveOpenDays", () => {
  // now = 2026-07-14 (Tuesday), so offsets 0..8 span Tue 14 .. Wed 22 — the
  // only two Tuesdays in range are offsets 0 and 7.
  const now = new Date("2026-07-14T09:00:00Z")

  it("returns only the days whose weekly Service actually offers a Heure", () => {
    const result = deriveOpenDays({
      party_size: 2,
      services: [service()], // Tuesday, 12:00-13:00
      reservationsByDate: new Map(),
      closures: [],
      config: { ...baseConfig, horizon_days: 8 },
      now,
    })

    expect(result).toEqual(["2026-07-14", "2026-07-21"])
  })

  it("excludes a day whose Service is fully booked for this party_size", () => {
    const result = deriveOpenDays({
      party_size: 2,
      services: [service({ capacity: 2 })],
      reservationsByDate: new Map([
        ["2026-07-14", [reservation({ time: "12:00", party_size: 2 })]],
      ]),
      closures: [],
      config: { ...baseConfig, horizon_days: 8 },
      now,
    })

    expect(result).toEqual(["2026-07-21"])
  })

  it("excludes a day covered by a Fermeture even though its weekly Service would otherwise offer a Heure", () => {
    const result = deriveOpenDays({
      party_size: 2,
      services: [service()],
      reservationsByDate: new Map(),
      closures: [{ start_date: "2026-07-14", end_date: "2026-07-14" }],
      config: { ...baseConfig, horizon_days: 8 },
      now,
    })

    expect(result).toEqual(["2026-07-21"])
  })

  it("returns no open day at all once party_size exceeds the plafond, even on days with a Service", () => {
    const result = deriveOpenDays({
      party_size: 9,
      services: [service()],
      reservationsByDate: new Map(),
      closures: [],
      config: { ...baseConfig, horizon_days: 8, max_party_size: 8 },
      now,
    })

    expect(result).toEqual([])
  })
})
