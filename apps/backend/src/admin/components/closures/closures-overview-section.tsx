import { useQuery } from "@tanstack/react-query"
import { ExclamationCircleSolid } from "@medusajs/icons"
import { Container, Heading, Text, Tooltip } from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import type { Closure as PickupClosure } from "../../lib/pickup"
import type { ReservationClosure } from "../../lib/table-reservation"

// The single mitigation ADR 0007 calls for: pickup and table-reservation each
// own their own Fermeture calendar (no shared table, no shared row, no shared
// code), so nothing in the domain can catch the August break recorded on one
// side and forgotten on the other. This page is the human-facing guard rail
// instead — it reads both calendars side by side and flags any period that
// closes one channel but leaves the other one open, the exact silent failure
// the ADR names.

type CivilDayPeriod = { start_date: string; end_date: string }

// Inclusive civil-day period overlap: a <= d && c <= b for [a,b] and [c,d].
const periodsOverlap = (a: CivilDayPeriod, b: CivilDayPeriod) =>
  a.start_date <= b.end_date && b.start_date <= a.end_date

const formatCivilDay = (day: string) => {
  const [year, month, dayOfMonth] = day.split("-")
  return `${dayOfMonth}/${month}/${year}`
}

const formatClosurePeriod = (closure: CivilDayPeriod) =>
  closure.start_date === closure.end_date
    ? formatCivilDay(closure.start_date)
    : `${formatCivilDay(closure.start_date)} – ${formatCivilDay(closure.end_date)}`

export const ClosuresOverviewSection = () => {
  const { data: pickupData, isLoading: pickupLoading } = useQuery({
    queryKey: ["pickup-closures"],
    queryFn: () =>
      sdk.client.fetch<{ closures: PickupClosure[] }>("/admin/pickup/closures"),
  })

  const { data: reservationData, isLoading: reservationLoading } = useQuery({
    queryKey: ["table-reservation-closures"],
    queryFn: () =>
      sdk.client.fetch<{ closures: ReservationClosure[] }>(
        "/admin/table-reservation/closures"
      ),
  })

  const pickupClosures = pickupData?.closures ?? []
  const reservationClosures = reservationData?.closures ?? []
  const isLoading = pickupLoading || reservationLoading

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col px-6 py-4">
        <Heading level="h2">Closures</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Pickup and table reservation each keep their own closure calendar
          (ADR 0007) — they are never linked automatically. A period flagged
          below closes one channel but not the other; confirm that is
          intentional (a privatised evening, a kitchen-only closure) rather
          than a missed entry.
        </Text>
      </div>

      {isLoading ? (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        </div>
      ) : (
        <div className="grid grid-cols-1 divide-x md:grid-cols-2">
          <ClosureColumn
            title="Pickup"
            closures={pickupClosures}
            otherClosures={reservationClosures}
            mismatchLabel="Table reservation stays open"
          />
          <ClosureColumn
            title="Table reservation"
            closures={reservationClosures}
            otherClosures={pickupClosures}
            mismatchLabel="Pickup stays open"
          />
        </div>
      )}
    </Container>
  )
}

const ClosureColumn = ({
  title,
  closures,
  otherClosures,
  mismatchLabel,
}: {
  title: string
  closures: CivilDayPeriod[]
  otherClosures: CivilDayPeriod[]
  mismatchLabel: string
}) => (
  <div className="flex flex-col gap-y-2 px-6 py-4">
    <Text size="small" weight="plus">
      {title}
    </Text>
    {closures.length === 0 ? (
      <Text size="small" className="text-ui-fg-subtle">
        No closures declared.
      </Text>
    ) : (
      closures.map((closure, index) => {
        const covered = otherClosures.some((other) =>
          periodsOverlap(closure, other)
        )
        return (
          <div
            key={index}
            className="bg-ui-bg-subtle flex items-center justify-between gap-x-2 rounded-md px-3 py-2"
          >
            <Text size="small" leading="compact">
              {formatClosurePeriod(closure)}
            </Text>
            {!covered && (
              <Tooltip content={mismatchLabel}>
                <div className="text-ui-fg-error flex items-center gap-x-1">
                  <ExclamationCircleSolid />
                  <Text size="xsmall" leading="compact">
                    {mismatchLabel}
                  </Text>
                </div>
              </Tooltip>
            )}
          </div>
        )
      })
    )}
  </div>
)
