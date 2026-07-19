import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { PencilSquare, Printer } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import type { TableReservation } from "../../lib/table-reservation"
import { todayInRestaurantTimezone } from "../../lib/timezone"

type FormState = {
  date: string
  time: string
  party_size: number
  customer_name: string
  customer_email: string
  customer_phone: string
  note: string
}

const toFormState = (reservation: TableReservation): FormState => ({
  date: reservation.date,
  time: reservation.time,
  party_size: reservation.party_size,
  customer_name: reservation.customer_name,
  customer_email: reservation.customer_email,
  customer_phone: reservation.customer_phone,
  note: reservation.note ?? "",
})

// La Feuille de service (ticket 07): the dining room's production document —
// one day's `confirmed` Réservations, ascending Heure, nom/Couverts/téléphone/
// note, read standing up and printed once before the coup de feu. `cancelled`
// Réservations never reach this list — the admin route already filters them
// out, so there is nothing to filter here.
export const ServiceSheetSection = () => {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(todayInRestaurantTimezone)
  const [editing, setEditing] = useState<TableReservation | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["table-reservation-service-sheet", date],
    queryFn: () =>
      sdk.client.fetch<{ reservations: TableReservation[] }>(
        "/admin/table-reservation/reservations",
        { query: { date } }
      ),
  })

  const reservations = data?.reservations ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["table-reservation-service-sheet", date],
    })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4 print:hidden">
        <div className="flex flex-col">
          <Heading level="h2">Service sheet</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The day's Réservations, by ascending time — name, Couverts,
            phone, note. Cancelled Réservations never show here.
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <Button size="small" variant="secondary" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <Heading level="h2" className="mb-4 hidden print:block">
          Service sheet — {date}
        </Heading>

        {isLoading ? (
          <Text size="small" className="text-ui-fg-subtle print:hidden">
            Loading…
          </Text>
        ) : reservations.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No Réservation for this day.
          </Text>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-ui-border-base border-b">
                <th className="py-2 pr-4 text-sm font-medium">Time</th>
                <th className="py-2 pr-4 text-sm font-medium">Name</th>
                <th className="py-2 pr-4 text-sm font-medium">Couverts</th>
                <th className="py-2 pr-4 text-sm font-medium">Phone</th>
                <th className="py-2 pr-4 text-sm font-medium">Note</th>
                <th className="py-2 pr-4 text-sm font-medium print:hidden" />
              </tr>
            </thead>
            <tbody>
              {reservations.map((reservation) => (
                <tr
                  key={reservation.id}
                  className="border-ui-border-base border-b"
                >
                  <td className="py-2 pr-4 text-sm">{reservation.time}</td>
                  <td className="py-2 pr-4 text-sm">
                    {reservation.customer_name}
                  </td>
                  <td className="py-2 pr-4 text-sm">
                    {reservation.party_size}
                  </td>
                  <td className="py-2 pr-4 text-sm">
                    {reservation.customer_phone}
                  </td>
                  <td className="py-2 pr-4 text-sm">
                    {reservation.note ?? ""}
                  </td>
                  <td className="py-2 pr-4 text-sm print:hidden">
                    <IconButton
                      size="small"
                      variant="transparent"
                      onClick={() => setEditing(reservation)}
                    >
                      <PencilSquare />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EditReservationDrawer
        reservation={editing}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
    </Container>
  )
}

// Consult and correct a Réservation from the admin — "le client a appelé"
// (ticket 07, User Story 32). This never re-derives Capacité: a human already
// made the call, and the restaurant's own judgement is the check here.
const EditReservationDrawer = ({
  reservation,
  onClose,
  onSaved,
}: {
  reservation: TableReservation | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [form, setForm] = useState<FormState | null>(null)

  useEffect(() => {
    if (reservation) {
      setForm(toFormState(reservation))
    }
  }, [reservation])

  const update = useMutation({
    mutationFn: (body: FormState) =>
      sdk.client.fetch(
        `/admin/table-reservation/reservations/${reservation!.id}`,
        {
          method: "POST",
          body: {
            date: body.date,
            time: body.time,
            party_size: body.party_size,
            customer_name: body.customer_name,
            customer_email: body.customer_email,
            customer_phone: body.customer_phone,
            note: body.note.trim() ? body.note.trim() : null,
          },
        }
      ),
    onSuccess: () => {
      onSaved()
      toast.success("Réservation updated")
      onClose()
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update"),
  })

  return (
    <Drawer open={!!reservation} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Correct this Réservation</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4">
          {form && <ReservationFields form={form} setForm={setForm} />}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button size="small" variant="secondary" disabled={update.isPending}>
              Cancel
            </Button>
          </Drawer.Close>
          <Button
            size="small"
            onClick={() => form && update.mutate(form)}
            isLoading={update.isPending}
            disabled={!form}
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ReservationFields = ({
  form,
  setForm,
}: {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState | null>>
}) => (
  <>
    <div className="grid grid-cols-2 gap-x-3">
      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          Date
        </Label>
        <Input
          type="date"
          value={form.date}
          onChange={(e) =>
            setForm((f) => (f ? { ...f, date: e.target.value } : f))
          }
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          Time
        </Label>
        <Input
          type="time"
          value={form.time}
          onChange={(e) =>
            setForm((f) => (f ? { ...f, time: e.target.value } : f))
          }
        />
      </div>
    </div>

    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        Couverts
      </Label>
      <Input
        type="number"
        min={1}
        step={1}
        value={form.party_size}
        onChange={(e) =>
          setForm((f) =>
            f ? { ...f, party_size: Number(e.target.value) } : f
          )
        }
      />
    </div>

    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        Name
      </Label>
      <Input
        value={form.customer_name}
        onChange={(e) =>
          setForm((f) => (f ? { ...f, customer_name: e.target.value } : f))
        }
      />
    </div>

    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        Phone
      </Label>
      <Input
        value={form.customer_phone}
        onChange={(e) =>
          setForm((f) => (f ? { ...f, customer_phone: e.target.value } : f))
        }
      />
    </div>

    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        Email
      </Label>
      <Input
        type="email"
        value={form.customer_email}
        onChange={(e) =>
          setForm((f) => (f ? { ...f, customer_email: e.target.value } : f))
        }
      />
    </div>

    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        Note
      </Label>
      <Textarea
        value={form.note}
        onChange={(e) =>
          setForm((f) => (f ? { ...f, note: e.target.value } : f))
        }
      />
    </div>
  </>
)
