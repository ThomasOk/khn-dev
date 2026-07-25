// Shared shapes and helpers for the announcements settings page. The wire
// contract is in English (see AGENTS.md); the French domain vocabulary
// (Annonce, Accroche, Période d'annonce) lives in the docs, not here.

export type Announcement = {
  id: string
  headline: string
  start_date: string
  end_date: string
}

export const HEADLINE_MAX_LENGTH = 90

// A civil-day period, compared as "YYYY-MM-DD" strings — never a constructed
// Date — same rule the backend workflow uses for the overlap check.
export type AnnouncementStatus = "upcoming" | "current" | "past"

export function announcementStatus(
  announcement: Pick<Announcement, "start_date" | "end_date">,
  today: string
): AnnouncementStatus {
  if (today < announcement.start_date) {
    return "upcoming"
  }
  if (today > announcement.end_date) {
    return "past"
  }
  return "current"
}

// "YYYY-MM-DD" -> "YYYY-MM-DD" shifted by `days`, anchored at UTC noon so the
// shift can't be knocked a day off by the browser's own timezone or DST. This
// is a form default only (start + 14 days pre-filling end date) — it doesn't
// read or derive anything from another module (ADR 0009 is about that).
export function addDays(day: string, days: number): string {
  const [year, month, dayOfMonth] = day.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// "YYYY-MM-DD" -> "DD/MM/YYYY", for display only (never parsed back).
export function formatCivilDay(day: string): string {
  const [year, month, dayOfMonth] = day.split("-")
  return `${dayOfMonth}/${month}/${year}`
}

export function formatAnnouncementPeriod(
  announcement: Pick<Announcement, "start_date" | "end_date">
): string {
  return `${formatCivilDay(announcement.start_date)} – ${formatCivilDay(
    announcement.end_date
  )}`
}
