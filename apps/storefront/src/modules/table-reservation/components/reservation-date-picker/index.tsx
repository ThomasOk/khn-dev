"use client"

import { ChevronLeftMini, ChevronRightMini } from "@medusajs/icons"
import { ReservationDayOption } from "@lib/util/timezone"
import { useEffect, useRef, useState } from "react"

type ReservationDatePickerProps = {
  days: ReservationDayOption[]
  selectedDate: string
  onSelect: (date: string) => void
}

const ReservationDatePicker = ({
  days,
  selectedDate,
  onSelect,
}: ReservationDatePickerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const updateEdges = () => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    setAtStart(el.scrollLeft <= 0)
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }

  useEffect(() => {
    updateEdges()

    const el = scrollRef.current
    if (!el) {
      return
    }

    el.addEventListener("scroll", updateEdges, { passive: true })
    window.addEventListener("resize", updateEdges)

    return () => {
      el.removeEventListener("scroll", updateEdges)
      window.removeEventListener("resize", updateEdges)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days.length])

  // Advances by the strip's own visible width rather than a fixed number of
  // days — a calendar-week jump would land awkwardly (e.g. only 2 days on
  // the first page if today is a Friday). This stays consistent regardless
  // of how many cards fit at the current viewport width.
  const scrollByPage = (direction: 1 | -1) => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollBy({ left: direction * el.clientWidth, behavior: "smooth" })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Jours précédents"
        onClick={() => scrollByPage(-1)}
        disabled={atStart}
        className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full border border-stone-300 text-stone-700 transition-colors duration-150 disabled:opacity-30 disabled:pointer-events-none [@media(hover:hover)]:hover:border-stone-900"
      >
        <ChevronLeftMini />
      </button>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar"
        data-testid="reservation-day-picker"
      >
        {days.map((option) => {
          const isSelected = option.date === selectedDate
          return (
            <button
              key={option.date}
              type="button"
              onClick={() => onSelect(option.date)}
              aria-pressed={isSelected}
              data-testid="reservation-day-option"
              className={`shrink-0 snap-start flex flex-col items-center justify-center gap-1 w-20 h-20 rounded-md border transition-colors duration-150 ${
                isSelected
                  ? "bg-stone-900 text-white border-stone-900"
                  : "border-stone-300 text-stone-700 [@media(hover:hover)]:hover:border-stone-900"
              }`}
            >
              <span className="text-[11px] uppercase tracking-wider opacity-70">
                {option.weekday}
              </span>
              <span className="text-lg font-semibold">{option.day}</span>
              <span className="text-[11px] uppercase tracking-wider opacity-70">
                {option.month}
              </span>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        aria-label="Jours suivants"
        onClick={() => scrollByPage(1)}
        disabled={atEnd}
        className="shrink-0 flex items-center justify-center h-10 w-10 rounded-full border border-stone-300 text-stone-700 transition-colors duration-150 disabled:opacity-30 disabled:pointer-events-none [@media(hover:hover)]:hover:border-stone-900"
      >
        <ChevronRightMini />
      </button>
    </div>
  )
}

export default ReservationDatePicker
