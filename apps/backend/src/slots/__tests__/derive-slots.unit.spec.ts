import { deriveSlots, PickupScheduleInput } from "../derive-slots"

// Seam 2 of the spec: deriveSlots is a pure function with an injected clock, and
// this file is the only place the daylight-saving bug can be provoked on demand.
// Every assertion is on observable output (the slots returned), expressed as UTC
// ISO strings via Date.toISOString() — UTC encodes the Paris offset unambiguously,
// so a wrong offset (the most likely bug) shows up as a wrong instant.

const config = (prep_delay_minutes: number, slot_duration_minutes: number) => ({
  prep_delay_minutes,
  slot_duration_minutes,
})

// Tuesday = 2, Sunday = 0 (0 = Sunday .. 6 = Saturday).
const schedule = (
  day_of_week: number,
  start_time: string,
  end_time: string,
  active = true
): PickupScheduleInput => ({ day_of_week, start_time, end_time, active })

const starts = (slots: { start: Date }[]) => slots.map((s) => s.start.toISOString())

describe("deriveSlots", () => {
  it("places a summer slot at the +02:00 Paris offset", () => {
    // Tuesday 2026-07-14, 10:00 Paris (CEST, +02:00).
    const now = new Date("2026-07-14T08:00:00Z")

    const slots = deriveSlots({
      schedules: [schedule(2, "12:00", "13:00")],
      closures: [],
      config: config(30, 15),
      now,
    })

    expect(slots).toHaveLength(4)
    expect(slots[0].start.toISOString()).toEqual("2026-07-14T10:00:00.000Z") // 12:00+02:00
    expect(slots[0].end.toISOString()).toEqual("2026-07-14T10:15:00.000Z")
    expect(slots[3].start.toISOString()).toEqual("2026-07-14T10:45:00.000Z") // 12:45+02:00
    expect(slots[3].end.toISOString()).toEqual("2026-07-14T11:00:00.000Z")
  })

  it("places the same wall-clock slot one hour later in winter (+01:00)", () => {
    // Tuesday 2026-01-13, 10:00 Paris (CET, +01:00).
    const now = new Date("2026-01-13T09:00:00Z")

    const slots = deriveSlots({
      schedules: [schedule(2, "12:00", "13:00")],
      closures: [],
      config: config(30, 15),
      now,
    })

    // 12:00 Paris winter is 11:00Z — an hour later than the summer 10:00Z above.
    expect(slots[0].start.toISOString()).toEqual("2026-01-13T11:00:00.000Z")
  })

  it("uses the slot's own offset on the spring-forward Sunday, not midnight's", () => {
    // 2026-03-29: midnight is +01:00 but 11:00 is +02:00 (clocks jumped at 03:00).
    // A naive impl computing the day's offset once at midnight would be an hour off.
    const now = new Date("2026-03-29T06:00:00Z") // 08:00 Paris

    const slots = deriveSlots({
      schedules: [schedule(0, "11:00", "12:00")],
      closures: [],
      config: config(30, 15),
      now,
    })

    expect(slots[0].start.toISOString()).toEqual("2026-03-29T09:00:00.000Z") // 11:00+02:00
  })

  it("uses the slot's own offset on the fall-back Sunday, not midnight's", () => {
    // 2026-10-25: midnight is +02:00 but 11:00 is +01:00 (clocks fell back at 03:00).
    const now = new Date("2026-10-25T06:00:00Z") // 07:00 Paris

    const slots = deriveSlots({
      schedules: [schedule(0, "11:00", "12:00")],
      closures: [],
      config: config(30, 15),
      now,
    })

    expect(slots[0].start.toISOString()).toEqual("2026-10-25T10:00:00.000Z") // 11:00+01:00
  })

  describe("prep delay", () => {
    // 2026-07-14 Tuesday, schedule 12:00–13:00, 15-min slots, 30-min prep delay.
    const base = {
      schedules: [schedule(2, "12:00", "13:00")],
      closures: [],
      config: config(30, 15),
    }

    it("excludes a slot starting exactly on the now+delay limit (strictly after)", () => {
      // now = 12:00 Paris, now+30 = 12:30 Paris. The 12:30 slot sits on the limit.
      const slots = deriveSlots({ ...base, now: new Date("2026-07-14T10:00:00Z") })

      expect(starts(slots)).toEqual(["2026-07-14T10:45:00.000Z"]) // only 12:45 survives
    })

    it("includes the slot once now+delay falls just before it", () => {
      // now = 11:59 Paris, now+30 = 12:29 Paris — one minute before the 12:30 slot.
      const slots = deriveSlots({ ...base, now: new Date("2026-07-14T09:59:00Z") })

      expect(starts(slots)).toEqual([
        "2026-07-14T10:30:00.000Z", // 12:30
        "2026-07-14T10:45:00.000Z", // 12:45
      ])
    })
  })

  it("returns nothing on an exceptional closure of the current day", () => {
    const now = new Date("2026-07-14T08:00:00Z") // Tuesday, has a schedule

    const slots = deriveSlots({
      schedules: [schedule(2, "12:00", "13:00")],
      closures: [{ date: "2026-07-14" }],
      config: config(30, 15),
      now,
    })

    expect(slots).toEqual([])
  })

  it("returns nothing on a day with no schedule", () => {
    const now = new Date("2026-07-14T08:00:00Z") // Tuesday

    const slots = deriveSlots({
      schedules: [schedule(0, "12:00", "13:00")], // Sunday only
      closures: [],
      config: config(30, 15),
      now,
    })

    expect(slots).toEqual([])
  })

  it("ignores an inactive schedule", () => {
    const now = new Date("2026-07-14T08:00:00Z") // Tuesday

    const slots = deriveSlots({
      schedules: [schedule(2, "12:00", "13:00", false)],
      closures: [],
      config: config(30, 15),
      now,
    })

    expect(slots).toEqual([])
  })

  it("derives two services in the same day, in chronological order", () => {
    const now = new Date("2026-07-14T06:00:00Z") // 08:00 Paris, before both services

    const slots = deriveSlots({
      schedules: [
        schedule(2, "19:00", "21:00"), // dinner declared first, on purpose
        schedule(2, "12:00", "14:00"), // lunch
      ],
      closures: [],
      config: config(30, 30),
      now,
    })

    // Lunch: 12:00 12:30 13:00 13:30 — Dinner: 19:00 19:30 20:00 20:30 = 8 slots.
    expect(slots).toHaveLength(8)
    const iso = starts(slots)
    expect([...iso]).toEqual([...iso].sort()) // chronological
    expect(iso[0]).toEqual("2026-07-14T10:00:00.000Z") // 12:00
    expect(iso[iso.length - 1]).toEqual("2026-07-14T18:30:00.000Z") // 20:30
  })

  describe("end of service", () => {
    const base = {
      schedules: [schedule(2, "12:00", "13:00")], // 2026-07-14 Tuesday
      closures: [],
      config: config(0, 15),
    }

    it("offers the last slot, then nothing once it too has passed", () => {
      // now = 12:30 Paris → only the 12:45 slot is still ahead.
      const last = deriveSlots({ ...base, now: new Date("2026-07-14T10:30:00Z") })
      expect(starts(last)).toEqual(["2026-07-14T10:45:00.000Z"])

      // now = 12:46 Paris → nothing left: this is the "Commandes fermées" state.
      const closed = deriveSlots({ ...base, now: new Date("2026-07-14T10:46:00Z") })
      expect(closed).toEqual([])
    })

    it("drops a trailing slot that does not fully fit the window", () => {
      // 12:00–12:50 with 15-min slots: 12:45–13:00 overflows and is dropped.
      const slots = deriveSlots({
        schedules: [schedule(2, "12:00", "12:50")],
        closures: [],
        config: config(0, 15),
        now: new Date("2026-07-14T06:00:00Z"),
      })

      expect(slots).toHaveLength(3)
      expect(slots[2].start.toISOString()).toEqual("2026-07-14T10:30:00.000Z") // 12:30
      expect(slots[2].end.toISOString()).toEqual("2026-07-14T10:45:00.000Z") // 12:45
    })
  })
})
