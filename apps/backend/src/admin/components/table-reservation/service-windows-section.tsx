import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, type Dispatch, type SetStateAction } from "react"
import { Plus, Trash, PencilSquare } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import { WEEKDAYS, type ServiceWindow } from "../../lib/table-reservation"

type FormState = {
  name: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  duration_minutes: number
  active: boolean
}

const EMPTY_FORM: FormState = {
  name: "Déjeuner",
  day_of_week: 2,
  start_time: "12:00",
  end_time: "14:00",
  capacity: 20,
  duration_minutes: 90,
  active: true,
}

// The one client-side rule both the create and edit forms enforce before
// saving; the server re-checks it in the zod schema. Returns an error
// message, or undefined when the range is valid.
const timeRangeError = (form: FormState): string | undefined =>
  form.start_time >= form.end_time
    ? "End time must be after start time"
    : undefined

// Services: the weekly windows during which the restaurant seats customers,
// each with its own Capacité and Durée d'occupation (a Tuesday lunch and a
// Saturday dinner rarely match). Several Services may share a weekday — that
// is what separates a lunch service from a dinner service.
export const ServiceWindowsSection = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceWindow | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["table-reservation-service-windows"],
    queryFn: () =>
      sdk.client.fetch<{ service_windows: ServiceWindow[] }>(
        "/admin/table-reservation/service-windows"
      ),
  })

  const serviceWindows = data?.service_windows ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["table-reservation-service-windows"],
    })

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/table-reservation/service-windows/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      invalidate()
      toast.success("Service removed")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove"),
  })

  const toggleActive = useMutation({
    mutationFn: (serviceWindow: ServiceWindow) =>
      sdk.client.fetch(
        `/admin/table-reservation/service-windows/${serviceWindow.id}`,
        { method: "POST", body: { active: !serviceWindow.active } }
      ),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message || "Failed to update"),
  })

  const handleDelete = async (serviceWindow: ServiceWindow) => {
    const confirmed = await prompt({
      title: "Remove Service",
      description: `Remove ${serviceWindow.name} — ${WEEKDAYS[serviceWindow.day_of_week]} ${serviceWindow.start_time}–${serviceWindow.end_time}? It stops being offered right away.`,
      confirmText: "Remove",
      cancelText: "Cancel",
    })
    if (confirmed) {
      remove.mutate(serviceWindow.id)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading level="h2">Services</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Weekly windows when the dining room takes Réservations, each with
            its own capacity and occupancy duration.
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus />
          Add
        </Button>
      </div>

      <div className="flex flex-col gap-y-2 px-6 py-4">
        {isLoading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : serviceWindows.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No Service yet — no Heure de réservation will be offered until you
            add one.
          </Text>
        ) : (
          WEEKDAYS.map((label, day) => {
            const rows = serviceWindows.filter((s) => s.day_of_week === day)
            if (rows.length === 0) {
              return null
            }
            return (
              <div key={day} className="flex flex-col gap-y-1">
                <Text size="small" leading="compact" weight="plus">
                  {label}
                </Text>
                {rows.map((serviceWindow) => (
                  <div
                    key={serviceWindow.id}
                    className="bg-ui-bg-subtle flex items-center justify-between rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-x-3">
                      <Text size="small" leading="compact" weight="plus">
                        {serviceWindow.name}
                      </Text>
                      <Text size="small" leading="compact">
                        {serviceWindow.start_time} – {serviceWindow.end_time}
                      </Text>
                      <Text size="small" leading="compact" className="text-ui-fg-subtle">
                        {serviceWindow.capacity} couverts · {serviceWindow.duration_minutes} min
                      </Text>
                      {!serviceWindow.active && (
                        <Badge size="2xsmall" color="grey">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-x-2">
                      <Switch
                        checked={serviceWindow.active}
                        disabled={toggleActive.isPending}
                        onCheckedChange={() => toggleActive.mutate(serviceWindow)}
                      />
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => setEditing(serviceWindow)}
                      >
                        <PencilSquare />
                      </IconButton>
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => handleDelete(serviceWindow)}
                      >
                        <Trash />
                      </IconButton>
                    </div>
                  </div>
                ))}
              </div>
            )
          })
        )}
      </div>

      <CreateServiceWindowModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={invalidate}
      />
      <EditServiceWindowDrawer
        serviceWindow={editing}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
    </Container>
  )
}

// --- Create (FocusModal) --------------------------------------------------------

const CreateServiceWindowModal = ({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setError(undefined)
    }
  }, [open])

  const create = useMutation({
    mutationFn: (body: FormState) =>
      sdk.client.fetch("/admin/table-reservation/service-windows", {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      onSaved()
      toast.success("Service added")
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add"),
  })

  const handleSubmit = () => {
    const rangeError = timeRangeError(form)
    if (rangeError) {
      setError(rangeError)
      return
    }
    create.mutate(form)
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex items-center justify-end gap-x-2">
            <FocusModal.Close asChild>
              <Button
                size="small"
                variant="secondary"
                disabled={create.isPending}
              >
                Cancel
              </Button>
            </FocusModal.Close>
            <Button
              size="small"
              onClick={handleSubmit}
              isLoading={create.isPending}
            >
              Add
            </Button>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-1 flex-col items-center overflow-auto py-8">
          <div className="flex w-full max-w-md flex-col gap-y-4">
            <Heading level="h2">Add a Service</Heading>
            <ServiceWindowFields
              form={form}
              setForm={setForm}
              error={error}
              clearError={() => setError(undefined)}
            />
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

// --- Edit (Drawer) --------------------------------------------------------------

const EditServiceWindowDrawer = ({
  serviceWindow,
  onClose,
  onSaved,
}: {
  serviceWindow: ServiceWindow | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (serviceWindow) {
      setForm({
        name: serviceWindow.name,
        day_of_week: serviceWindow.day_of_week,
        start_time: serviceWindow.start_time,
        end_time: serviceWindow.end_time,
        capacity: serviceWindow.capacity,
        duration_minutes: serviceWindow.duration_minutes,
        active: serviceWindow.active,
      })
      setError(undefined)
    }
  }, [serviceWindow])

  const update = useMutation({
    mutationFn: (body: FormState) =>
      sdk.client.fetch(
        `/admin/table-reservation/service-windows/${serviceWindow!.id}`,
        { method: "POST", body }
      ),
    onSuccess: () => {
      onSaved()
      toast.success("Service updated")
      onClose()
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update"),
  })

  const handleSubmit = () => {
    const rangeError = timeRangeError(form)
    if (rangeError) {
      setError(rangeError)
      return
    }
    update.mutate(form)
  }

  return (
    <Drawer open={!!serviceWindow} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit Service</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4">
          <ServiceWindowFields
            form={form}
            setForm={setForm}
            error={error}
            clearError={() => setError(undefined)}
          />
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button size="small" variant="secondary" disabled={update.isPending}>
              Cancel
            </Button>
          </Drawer.Close>
          <Button size="small" onClick={handleSubmit} isLoading={update.isPending}>
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

// --- Shared form fields ---------------------------------------------------------

const ServiceWindowFields = ({
  form,
  setForm,
  error,
  clearError,
}: {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  error?: string
  clearError: () => void
}) => (
  <>
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        Name
      </Label>
      <Input
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
    </div>

    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        Day
      </Label>
      <Select
        value={String(form.day_of_week)}
        onValueChange={(v) =>
          setForm((f) => ({ ...f, day_of_week: Number(v) }))
        }
      >
        <Select.Trigger>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          {WEEKDAYS.map((label, day) => (
            <Select.Item key={day} value={String(day)}>
              {label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </div>

    <div className="grid grid-cols-2 gap-x-3">
      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          Start
        </Label>
        <Input
          type="time"
          value={form.start_time}
          onChange={(e) => {
            setForm((f) => ({ ...f, start_time: e.target.value }))
            clearError()
          }}
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          End
        </Label>
        <Input
          type="time"
          value={form.end_time}
          onChange={(e) => {
            setForm((f) => ({ ...f, end_time: e.target.value }))
            clearError()
          }}
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-x-3">
      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          Capacity (couverts)
        </Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={form.capacity}
          onChange={(e) =>
            setForm((f) => ({ ...f, capacity: Number(e.target.value) }))
          }
        />
      </div>
      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          Occupancy duration (minutes)
        </Label>
        <Input
          type="number"
          min={1}
          step={1}
          value={form.duration_minutes}
          onChange={(e) =>
            setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))
          }
        />
      </div>
    </div>

    {error && (
      <Text size="small" className="text-ui-fg-error">
        {error}
      </Text>
    )}

    <div className="flex items-center gap-x-2">
      <Switch
        checked={form.active}
        onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
      />
      <Label size="small">Active</Label>
    </div>
  </>
)
