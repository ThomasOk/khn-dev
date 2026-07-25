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
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import { todayInRestaurantTimezone } from "../../lib/timezone"
import {
  addDays,
  announcementStatus,
  formatAnnouncementPeriod,
  HEADLINE_MAX_LENGTH,
  type Announcement,
  type AnnouncementStatus,
} from "../../lib/announcement"

type FormState = {
  headline: string
  start_date: string
  end_date: string
}

const EMPTY_FORM: FormState = { headline: "", start_date: "", end_date: "" }

const STATUS_META: Record<
  AnnouncementStatus,
  { label: string; color: "blue" | "green" | "grey" }
> = {
  upcoming: { label: "Upcoming", color: "blue" },
  current: { label: "Current", color: "green" },
  past: { label: "Past", color: "grey" },
}

const YMD = /^\d{4}-\d{2}-\d{2}$/

// The one client-side rule both the create and edit forms enforce before
// saving; the server re-checks it in the zod schema (and, for an edit, in the
// workflow's merge-onto-current check). Returns an error message, or
// undefined when the form is submittable.
const formError = (form: FormState): string | undefined => {
  if (form.headline.trim().length === 0) {
    return "Write a headline"
  }
  if (form.headline.trim().length > HEADLINE_MAX_LENGTH) {
    return `Headline must be ${HEADLINE_MAX_LENGTH} characters or fewer`
  }
  if (!YMD.test(form.start_date) || !YMD.test(form.end_date)) {
    return "Pick a start and end date"
  }
  if (form.end_date < form.start_date) {
    return "End date must be on or after the start date"
  }
  return undefined
}

// Annonces: free text a human writes for the storefront banner, over a civil-
// day Période d'annonce. Never derived from Fermetures, Créneaux or Produits
// (ADR 0009) — this screen doesn't read or link to Closures at all.
export const AnnouncementsSection = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: () =>
      sdk.client.fetch<{ announcements: Announcement[] }>(
        "/admin/announcements"
      ),
  })

  const announcements = data?.announcements ?? []
  const today = todayInRestaurantTimezone()

  // Current first (what the visitor sees right now), then upcoming soonest
  // first, then past most-recently-ended first — so the restaurant always
  // sees "what's live" before scrolling into history or the future.
  const statusRank: Record<AnnouncementStatus, number> = {
    current: 0,
    upcoming: 1,
    past: 2,
  }
  const sorted = [...announcements].sort((a, b) => {
    const rankA = statusRank[announcementStatus(a, today)]
    const rankB = statusRank[announcementStatus(b, today)]
    if (rankA !== rankB) {
      return rankA - rankB
    }
    return rankA === 2
      ? b.start_date.localeCompare(a.start_date)
      : a.start_date.localeCompare(b.start_date)
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["announcements"] })

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate()
      toast.success("Announcement removed")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove"),
  })

  const handleDelete = async (announcement: Announcement) => {
    const confirmed = await prompt({
      title: "Remove announcement",
      description: `Stop showing "${announcement.headline}" to visitors? This can't be undone.`,
      confirmText: "Remove",
      cancelText: "Cancel",
    })
    if (confirmed) {
      remove.mutate(announcement.id)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading level="h2">Announcements</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The banner shown at the top of every public page. Only one is ever
            live at a time.
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
        ) : sorted.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No announcement yet — visitors see no banner.
          </Text>
        ) : (
          sorted.map((announcement) => {
            const status = STATUS_META[announcementStatus(announcement, today)]
            return (
              <div
                key={announcement.id}
                className="bg-ui-bg-subtle flex items-center justify-between rounded-md px-3 py-2"
              >
                <div className="flex items-center gap-x-3">
                  <Badge size="2xsmall" color={status.color}>
                    {status.label}
                  </Badge>
                  <div className="flex flex-col">
                    <Text size="small" leading="compact" weight="plus">
                      {announcement.headline}
                    </Text>
                    <Text
                      size="small"
                      leading="compact"
                      className="text-ui-fg-subtle"
                    >
                      {formatAnnouncementPeriod(announcement)}
                    </Text>
                  </div>
                </div>
                <div className="flex items-center gap-x-2">
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => setEditing(announcement)}
                  >
                    <PencilSquare />
                  </IconButton>
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => handleDelete(announcement)}
                  >
                    <Trash />
                  </IconButton>
                </div>
              </div>
            )
          })
        )}
      </div>

      <CreateAnnouncementModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={invalidate}
      />
      <EditAnnouncementDrawer
        announcement={editing}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
    </Container>
  )
}

// --- Create (FocusModal) --------------------------------------------------------

const CreateAnnouncementModal = ({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  // Whether the restaurateur has edited the end date themselves — once they
  // have, the +14-days default stops overwriting their choice.
  const [endDateTouched, setEndDateTouched] = useState(false)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setEndDateTouched(false)
      setError(undefined)
    }
  }, [open])

  const create = useMutation({
    mutationFn: (body: FormState) =>
      sdk.client.fetch("/admin/announcements", {
        method: "POST",
        body: {
          headline: body.headline.trim(),
          start_date: body.start_date,
          end_date: body.end_date,
        },
      }),
    onSuccess: () => {
      onSaved()
      toast.success("Announcement published")
      onOpenChange(false)
    },
    // The 409 overlap response names the conflicting period in its message —
    // surfaced inline, next to the fields it's about, not as a generic toast.
    onError: (err: Error) => setError(err.message || "Failed to publish"),
  })

  const handleSubmit = () => {
    const validationError = formError(form)
    if (validationError) {
      setError(validationError)
      return
    }
    create.mutate(form)
  }

  const handleStartDateChange = (value: string) => {
    setForm((f) => ({
      ...f,
      start_date: value,
      end_date:
        !endDateTouched && YMD.test(value) ? addDays(value, 14) : f.end_date,
    }))
    setError(undefined)
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
              Publish
            </Button>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-1 flex-col items-center overflow-auto py-8">
          <div className="flex w-full max-w-md flex-col gap-y-4">
            <Heading level="h2">Write an announcement</Heading>
            <AnnouncementFields
              form={form}
              setForm={setForm}
              onStartDateChange={handleStartDateChange}
              onEndDateChange={() => setEndDateTouched(true)}
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

const EditAnnouncementDrawer = ({
  announcement,
  onClose,
  onSaved,
}: {
  announcement: Announcement | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (announcement) {
      setForm({
        headline: announcement.headline,
        start_date: announcement.start_date,
        end_date: announcement.end_date,
      })
      setError(undefined)
    }
  }, [announcement])

  const update = useMutation({
    mutationFn: (body: FormState) =>
      sdk.client.fetch(`/admin/announcements/${announcement!.id}`, {
        method: "POST",
        body: {
          headline: body.headline.trim(),
          start_date: body.start_date,
          end_date: body.end_date,
        },
      }),
    onSuccess: () => {
      onSaved()
      toast.success("Announcement updated")
      onClose()
    },
    onError: (err: Error) => setError(err.message || "Failed to update"),
  })

  const handleSubmit = () => {
    const validationError = formError(form)
    if (validationError) {
      setError(validationError)
      return
    }
    update.mutate(form)
  }

  return (
    <Drawer open={!!announcement} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit announcement</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4">
          <AnnouncementFields
            form={form}
            setForm={setForm}
            onStartDateChange={(value) => {
              setForm((f) => ({ ...f, start_date: value }))
              setError(undefined)
            }}
            onEndDateChange={() => {}}
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

const AnnouncementFields = ({
  form,
  setForm,
  onStartDateChange,
  onEndDateChange,
  error,
  clearError,
}: {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  onStartDateChange: (value: string) => void
  onEndDateChange: () => void
  error?: string
  clearError: () => void
}) => {
  // Counts the trimmed length, matching what formError and the submit
  // payload both check — typing leading/trailing whitespace shouldn't show
  // "over the limit" for a headline that will actually submit fine.
  const headlineLength = form.headline.trim().length
  const overLimit = headlineLength > HEADLINE_MAX_LENGTH

  return (
    <>
      <div className="flex flex-col gap-y-2">
        <div className="flex items-center justify-between">
          <Label size="small" weight="plus">
            Headline
          </Label>
          <Text
            size="small"
            leading="compact"
            className={overLimit ? "text-ui-fg-error" : "text-ui-fg-subtle"}
          >
            {headlineLength}/{HEADLINE_MAX_LENGTH}
          </Text>
        </div>
        <Input
          value={form.headline}
          onChange={(e) => {
            setForm((f) => ({ ...f, headline: e.target.value }))
            clearError()
          }}
          placeholder="Closed for the summer break, back on August 21"
        />
        <Text size="small" className="text-ui-fg-subtle">
          One short sentence — this is all the banner shows unless a visitor
          opens it for more.
        </Text>
      </div>

      <div className="flex flex-col gap-y-2">
        <Label size="small" weight="plus">
          Announcement period
        </Label>
        <div className="grid grid-cols-2 gap-x-3">
          <div className="flex flex-col gap-y-2">
            <Label size="small">Start</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label size="small">End</Label>
            <Input
              type="date"
              value={form.end_date}
              onChange={(e) => {
                onEndDateChange()
                setForm((f) => ({ ...f, end_date: e.target.value }))
                clearError()
              }}
            />
          </div>
        </div>
        <Text size="small" className="text-ui-fg-subtle">
          This is when the banner shows — not necessarily the period it talks
          about. A closure from Aug 10–20 should run on an announcement period
          of Aug 1–20: warn visitors before the 10th, and keep the banner up
          through the closure for anyone who shows up on the 15th.
        </Text>
      </div>

      {error && (
        <Text size="small" className="text-ui-fg-error">
          {error}
        </Text>
      )}
    </>
  )
}
