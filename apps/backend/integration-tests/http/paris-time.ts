// Shared by the Seam 1 HTTP specs that seed schedules RELATIVE TO the real
// clock (pickup-slots.spec.ts, complete-cart.spec.ts) — they read the real
// Paris wall-clock to build a schedule around "now", instead of injecting a
// clock the way the pure derivation seam (Seam 2) does.

// Paris wall-clock components of an instant.
export const parisParts = (d: Date) => {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const o: Record<string, string> = {}
  for (const p of f.formatToParts(d)) {
    if (p.type !== "literal") o[p.type] = p.value
  }
  return o
}

export const parisMinutesOfDay = (d: Date) => {
  const p = parisParts(d)
  return Number(p.hour) * 60 + Number(p.minute)
}

// JavaScript weekday (0 = Sunday) of an instant's Paris civil day.
export const parisDayOfWeek = (d: Date) => {
  const p = parisParts(d)
  return new Date(
    Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))
  ).getUTCDay()
}

export const parisDateKey = (d: Date) => {
  const p = parisParts(d)
  return `${p.year}-${p.month}-${p.day}`
}

export const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`

// Renders an instant as ISO 8601 with the Paris offset, matching the format the
// storefront writes onto cart.metadata (src/lib/slots/format.ts).
export const toParisIso = (d: Date): string => {
  const p = parisParts(d)
  const asUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second)
  )
  const offsetMinutes = Math.round((asUtc - d.getTime()) / 60_000)
  const sign = offsetMinutes >= 0 ? "+" : "-"
  const abs = Math.abs(offsetMinutes)
  const offsetHH = String(Math.floor(abs / 60)).padStart(2, "0")
  const offsetMM = String(abs % 60).padStart(2, "0")
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${offsetHH}:${offsetMM}`
}
