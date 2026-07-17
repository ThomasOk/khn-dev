import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { PencilSquare } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import type { PickupConfig } from "../../lib/pickup"

// Configuration: the Délai de préparation and the slot duration. The values the
// seed installs will be wrong; this section is what lets the restaurant fix them
// without a deploy. A change takes effect on the next storefront request — there
// is no cache.
export const ConfigSection = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ prep: "", slot: "", email: "" })
  const [errors, setErrors] = useState<{ prep?: string; slot?: string }>({})

  const { data, isLoading } = useQuery({
    queryKey: ["pickup-config"],
    queryFn: () =>
      sdk.client.fetch<{ config: PickupConfig | null }>("/admin/pickup/config"),
  })

  const config = data?.config ?? null

  // Seed the form from the current values whenever the drawer opens.
  useEffect(() => {
    if (open) {
      setForm({
        prep: config ? String(config.prep_delay_minutes) : "",
        slot: config ? String(config.slot_duration_minutes) : "",
        email: config?.restaurant_notification_email ?? "",
      })
      setErrors({})
    }
  }, [open, config])

  const save = useMutation({
    mutationFn: (body: {
      prep_delay_minutes: number
      slot_duration_minutes: number
      restaurant_notification_email: string | null
    }) =>
      sdk.client.fetch("/admin/pickup/config", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pickup-config"] })
      toast.success("Configuration saved")
      setOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save configuration")
    },
  })

  const handleSubmit = () => {
    const prep = Number(form.prep)
    const slot = Number(form.slot)
    const email = form.email.trim()
    const nextErrors: { prep?: string; slot?: string } = {}
    if (!Number.isInteger(prep) || prep < 0) {
      nextErrors.prep = "Enter a whole number of minutes (0 or more)"
    }
    if (!Number.isInteger(slot) || slot < 1) {
      nextErrors.slot = "Enter a whole number of minutes (1 or more)"
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    save.mutate({
      prep_delay_minutes: prep,
      slot_duration_minutes: slot,
      restaurant_notification_email: email || null,
    })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Configuration</Heading>
        <Button size="small" variant="secondary" onClick={() => setOpen(true)}>
          <PencilSquare />
          Edit
        </Button>
      </div>

      <div className="flex flex-col gap-y-3 px-6 py-4">
        {isLoading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : (
          <>
            <Row
              label="Preparation delay"
              value={
                config ? `${config.prep_delay_minutes} min` : "Not set yet"
              }
              hint="How far ahead of now a slot must start to be offered."
            />
            <Row
              label="Slot duration"
              value={
                config ? `${config.slot_duration_minutes} min` : "Not set yet"
              }
              hint="The step a pickup window is sliced into."
            />
            <Row
              label="Notification email"
              value={config?.restaurant_notification_email ?? "Not set yet"}
              hint="Where order notifications for the restaurant are sent."
            />
          </>
        )}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Edit configuration</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-y-4">
            <Field
              label="Preparation delay (minutes)"
              value={form.prep}
              onChange={(v) => {
                setForm((f) => ({ ...f, prep: v }))
                setErrors((e) => ({ ...e, prep: undefined }))
              }}
              error={errors.prep}
              min={0}
            />
            <Field
              label="Slot duration (minutes)"
              value={form.slot}
              onChange={(v) => {
                setForm((f) => ({ ...f, slot: v }))
                setErrors((e) => ({ ...e, slot: undefined }))
              }}
              error={errors.slot}
              min={1}
            />
            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Notification email
              </Label>
              <Input
                type="email"
                placeholder="restaurant@example.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button
                size="small"
                variant="secondary"
                disabled={save.isPending}
              >
                Cancel
              </Button>
            </Drawer.Close>
            <Button
              size="small"
              onClick={handleSubmit}
              isLoading={save.isPending}
            >
              Save
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

const Row = ({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) => (
  <div className="flex items-start justify-between gap-x-4">
    <div className="flex flex-col">
      <Text size="small" leading="compact" weight="plus">
        {label}
      </Text>
      <Text size="small" leading="compact" className="text-ui-fg-subtle">
        {hint}
      </Text>
    </div>
    <Text size="small" leading="compact">
      {value}
    </Text>
  </div>
)

const Field = ({
  label,
  value,
  onChange,
  error,
  min,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  min: number
}) => (
  <div className="flex flex-col gap-y-2">
    <Label size="small" weight="plus">
      {label}
    </Label>
    <Input
      type="number"
      min={min}
      step={1}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {error && (
      <Text size="small" className="text-ui-fg-error">
        {error}
      </Text>
    )}
  </div>
)
