// Réservation `date`/`time` travel as civil wall-clock text ("2026-08-12",
// "20:00"), never as an instant — formatted here by parsing the string
// directly, never through `new Date(...)`, so no host-timezone conversion can
// shift the displayed day or hour. Independent from the backend's own
// src/lib/reservation/format-reservation.ts (separate app, nothing shared).

const WEEKDAYS_FR = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
]
const MONTHS_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
]

function parseCivilDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number)
  return { year, month, day }
}

// Zeller-ish day-of-week via Date.UTC on the Y/M/D components — calendar
// arithmetic, not a real-time computation, so it carries no DST concern.
function dayOfWeek({ year, month, day }: { year: number; month: number; day: number }): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

// "2026-08-12" -> "mercredi 12 août 2026"
export function formatReservationDateLong(date: string): string {
  const civilDate = parseCivilDate(date)
  const weekday = WEEKDAYS_FR[dayOfWeek(civilDate)]
  const month = MONTHS_FR[civilDate.month - 1]
  return `${weekday} ${civilDate.day} ${month} ${civilDate.year}`
}

// "20:00" -> "20h00"
export function formatReservationTime(time: string): string {
  const [hour, minute] = time.split(":")
  return `${hour}h${minute}`
}
