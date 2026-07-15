import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { Plus, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import type { Closure } from "../../lib/pickup"

// "YYYY-MM-DD" -> "DD/MM/YYYY", for display only (never parsed back).
const formatCivilDay = (day: string) => {
  const [year, month, dayOfMonth] = day.split("-")
  return `${dayOfMonth}/${month}/${year}`
}

// A single closed day (start_date === end_date, the bank-holiday case) shows as
// one date; a genuine period shows as a range.
const formatClosurePeriod = (closure: Pick<Closure, "start_date" | "end_date">) =>
  closure.start_date === closure.end_date
    ? formatCivilDay(closure.start_date)
    : `${formatCivilDay(closure.start_date)} – ${formatCivilDay(closure.end_date)}`

// Fermetures exceptionnelles: a civil-day period on which no slot is offered — a
// bank holiday (a single day), the August break (a range) — with an optional
// reason. A closure wipes that period's pickup hours entirely.
export const ClosuresSection = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ["pickup-closures"],
    queryFn: () =>
      sdk.client.fetch<{ closures: Closure[] }>("/admin/pickup/closures"),
  })

  const closures = data?.closures ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["pickup-closures"] })

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/pickup/closures/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate()
      toast.success("Closure removed")
    },
    onError: (error: Error) => toast.error(error.message || "Failed to remove"),
  })

  const handleDelete = async (closure: Closure) => {
    const confirmed = await prompt({
      title: "Remove closure",
      description: `Reopen pickup on ${formatClosurePeriod(closure)}?`,
      confirmText: "Remove",
      cancelText: "Cancel",
    })
    if (confirmed) {
      remove.mutate(closure.id)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading level="h2">Exceptional closures</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Days with no pickup, whatever the weekly hours say.
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
        ) : closures.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No closures declared.
          </Text>
        ) : (
          closures.map((closure) => (
            <div
              key={closure.id}
              className="bg-ui-bg-subtle flex items-center justify-between rounded-md px-3 py-2"
            >
              <div className="flex flex-col">
                <Text size="small" leading="compact" weight="plus">
                  {formatClosurePeriod(closure)}
                </Text>
                {closure.reason && (
                  <Text
                    size="small"
                    leading="compact"
                    className="text-ui-fg-subtle"
                  >
                    {closure.reason}
                  </Text>
                )}
              </div>
              <IconButton
                size="small"
                variant="transparent"
                onClick={() => handleDelete(closure)}
              >
                <Trash />
              </IconButton>
            </div>
          ))
        )}
      </div>

      <CreateClosureModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={invalidate}
      />
    </Container>
  )
}

const CreateClosureModal = ({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) => {
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (open) {
      setStartDate("")
      setEndDate("")
      setReason("")
      setError(undefined)
    }
  }, [open])

  const create = useMutation({
    mutationFn: (body: {
      start_date: string
      end_date: string
      reason?: string
    }) => sdk.client.fetch("/admin/pickup/closures", { method: "POST", body }),
    onSuccess: () => {
      onSaved()
      toast.success("Closure declared")
      onOpenChange(false)
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to declare closure"),
  })

  const YMD = /^\d{4}-\d{2}-\d{2}$/

  const handleSubmit = () => {
    if (!YMD.test(startDate) || !YMD.test(endDate)) {
      setError("Pick a start and end date")
      return
    }
    if (endDate < startDate) {
      setError("End date must be on or after the start date")
      return
    }
    const trimmed = reason.trim()
    create.mutate({
      start_date: startDate,
      end_date: endDate,
      reason: trimmed ? trimmed : undefined,
    })
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
            <Heading level="h2">Declare a closure</Heading>
            <div className="flex gap-x-4">
              <div className="flex flex-1 flex-col gap-y-2">
                <Label size="small" weight="plus">
                  Start date
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setError(undefined)
                  }}
                />
              </div>
              <div className="flex flex-1 flex-col gap-y-2">
                <Label size="small" weight="plus">
                  End date
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setError(undefined)
                  }}
                />
              </div>
            </div>
            {error && (
              <Text size="small" className="text-ui-fg-error">
                {error}
              </Text>
            )}
            <Text size="small" className="text-ui-fg-subtle">
              A single day is a start and end date that are the same.
            </Text>
            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Reason (optional)
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Bank holiday, August break…"
              />
            </div>
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}
