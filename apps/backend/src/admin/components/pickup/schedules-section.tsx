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
import { WEEKDAYS, type PickupSchedule } from "../../lib/pickup"

type FormState = {
  day_of_week: number
  start_time: string
  end_time: string
  active: boolean
}

const EMPTY_FORM: FormState = {
  day_of_week: 1,
  start_time: "11:30",
  end_time: "14:00",
  active: true,
}

// The one client-side rule both the create and edit forms enforce before saving;
// the server re-checks it in the zod schema. Returns an error message, or
// undefined when the range is valid.
const timeRangeError = (form: FormState): string | undefined =>
  form.start_time >= form.end_time
    ? "End time must be after start time"
    : undefined

// Horaires de retrait: the weekly pickup windows. Several windows may share a
// weekday — that is what separates a lunch service from a dinner service. Distinct
// from opening hours: the restaurant can be open and still take no click & collect.
export const SchedulesSection = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<PickupSchedule | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["pickup-schedules"],
    queryFn: () =>
      sdk.client.fetch<{ schedules: PickupSchedule[] }>(
        "/admin/pickup/schedules"
      ),
  })

  const schedules = data?.schedules ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["pickup-schedules"] })

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/pickup/schedules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate()
      toast.success("Pickup window removed")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove"),
  })

  const toggleActive = useMutation({
    mutationFn: (schedule: PickupSchedule) =>
      sdk.client.fetch(`/admin/pickup/schedules/${schedule.id}`, {
        method: "POST",
        body: { active: !schedule.active },
      }),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message || "Failed to update"),
  })

  const handleDelete = async (schedule: PickupSchedule) => {
    const confirmed = await prompt({
      title: "Remove pickup window",
      description: `Remove ${WEEKDAYS[schedule.day_of_week]} ${schedule.start_time}–${schedule.end_time}? It stops being offered right away.`,
      confirmText: "Remove",
      cancelText: "Cancel",
    })
    if (confirmed) {
      remove.mutate(schedule.id)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading level="h2">Pickup hours</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Weekly windows when click &amp; collect is accepted. Add several on a
            day to split lunch and dinner.
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
        ) : schedules.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No pickup hours yet — no slot will be offered until you add one.
          </Text>
        ) : (
          WEEKDAYS.map((label, day) => {
            const rows = schedules.filter((s) => s.day_of_week === day)
            if (rows.length === 0) {
              return null
            }
            return (
              <div key={day} className="flex flex-col gap-y-1">
                <Text size="small" leading="compact" weight="plus">
                  {label}
                </Text>
                {rows.map((schedule) => (
                  <div
                    key={schedule.id}
                    className="bg-ui-bg-subtle flex items-center justify-between rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-x-3">
                      <Text size="small" leading="compact">
                        {schedule.start_time} – {schedule.end_time}
                      </Text>
                      {!schedule.active && (
                        <Badge size="2xsmall" color="grey">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-x-2">
                      <Switch
                        checked={schedule.active}
                        disabled={toggleActive.isPending}
                        onCheckedChange={() => toggleActive.mutate(schedule)}
                      />
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => setEditing(schedule)}
                      >
                        <PencilSquare />
                      </IconButton>
                      <IconButton
                        size="small"
                        variant="transparent"
                        onClick={() => handleDelete(schedule)}
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

      <CreateScheduleModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={invalidate}
      />
      <EditScheduleDrawer
        schedule={editing}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
    </Container>
  )
}

// --- Create (FocusModal) --------------------------------------------------------

const CreateScheduleModal = ({
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
      sdk.client.fetch("/admin/pickup/schedules", { method: "POST", body }),
    onSuccess: () => {
      onSaved()
      toast.success("Pickup window added")
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
            <Heading level="h2">Add a pickup window</Heading>
            <ScheduleFields form={form} setForm={setForm} error={error} clearError={() => setError(undefined)} />
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

// --- Edit (Drawer) --------------------------------------------------------------

const EditScheduleDrawer = ({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: PickupSchedule | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (schedule) {
      setForm({
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        active: schedule.active,
      })
      setError(undefined)
    }
  }, [schedule])

  const update = useMutation({
    mutationFn: (body: FormState) =>
      sdk.client.fetch(`/admin/pickup/schedules/${schedule!.id}`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      onSaved()
      toast.success("Pickup window updated")
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
    <Drawer open={!!schedule} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit pickup window</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4">
          <ScheduleFields form={form} setForm={setForm} error={error} clearError={() => setError(undefined)} />
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

const ScheduleFields = ({
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
