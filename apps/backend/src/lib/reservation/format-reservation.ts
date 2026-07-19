import { dayOfWeek } from "../time/restaurant-time"

// Réservation `date`/`time` are civil wall-clock text, not instants (see
// TableReservation model) — formatted here by parsing the string directly,
// never through `new Date(...)`, so no host-timezone conversion can ever
// shift the displayed day or hour (same discipline as restaurant-time.ts).

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

// "2026-08-12" -> "12/08" — compact, sortable-by-eye, for subject lines.
export function formatReservationDateShort(date: string): string {
  const { month, day } = parseCivilDate(date)
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`
}

// "2026-08-12" -> "mercredi 12 août 2026" — for the email body.
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

// The subject's bracketed prefix is customer/restaurant-facing French, like
// the rest of the email — only the code-level discriminant stays English
// (AGENTS.md "Language").
const SUBJECT_PREFIX_FR: Record<"reservation" | "cancellation", string> = {
  reservation: "Réservation",
  cancellation: "Annulation",
}

// `[Réservation] 12/08 20h00 — 4 pers. — Alix Dupont` / `[Annulation] …` —
// sortable and readable in an inbox without opening the email (ticket 06).
export function formatReservationSubject(
  kind: "reservation" | "cancellation",
  props: { date: string; time: string; party_size: number; customer_name: string }
): string {
  return `[${SUBJECT_PREFIX_FR[kind]}] ${formatReservationDateShort(
    props.date
  )} ${formatReservationTime(props.time)} — ${props.party_size} pers. — ${props.customer_name}`
}
