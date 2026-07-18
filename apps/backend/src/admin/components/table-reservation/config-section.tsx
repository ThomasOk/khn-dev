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
import type { TableReservationConfig } from "../../lib/table-reservation"

type FormState = {
  min_lead: string
  horizon: string
  step: string
  max_party: string
  margin: string
  phone: string
  email: string
}

type NumericFieldKey = "min_lead" | "horizon" | "step" | "max_party" | "margin"

// The five numeric Configuration fields share the same shape (a label, a
// floor, and a validation message) and drive both the submit-time validation
// and the Drawer's fields from this one list, rather than five near-identical
// copies of each.
const NUMERIC_FIELDS: {
  key: NumericFieldKey
  label: string
  min: number
  message: string
}[] = [
  {
    key: "min_lead",
    label: "Minimum lead time (minutes)",
    min: 0,
    message: "Enter a whole number of minutes (0 or more)",
  },
  {
    key: "horizon",
    label: "Horizon (days)",
    min: 0,
    message: "Enter a whole number of days (0 or more)",
  },
  {
    key: "step",
    label: "Step (minutes)",
    min: 1,
    message: "Enter a whole number of minutes (1 or more)",
  },
  {
    key: "max_party",
    label: "Maximum party size (couverts)",
    min: 1,
    message: "Enter a whole number of couverts (1 or more)",
  },
  {
    key: "margin",
    label: "Last seating margin (minutes)",
    min: 0,
    message: "Enter a whole number of minutes (0 or more)",
  },
]

// Configuration: horizon, délai minimum, pas, taille de groupe maximale,
// marge de dernier départ, téléphone des grands groupes, and the module's own
// notification email (ADR 0007 — it shares nothing with pickup_config). The
// values the seed installs will be wrong; this section is what lets the
// restaurant fix them without a deploy. A change takes effect on the next
// availability request — there is no cache.
export const ConfigSection = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({
    min_lead: "",
    horizon: "",
    step: "",
    max_party: "",
    margin: "",
    phone: "",
    email: "",
  })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  const { data, isLoading } = useQuery({
    queryKey: ["table-reservation-config"],
    queryFn: () =>
      sdk.client.fetch<{ config: TableReservationConfig | null }>(
        "/admin/table-reservation/config"
      ),
  })

  const config = data?.config ?? null

  // Seed the form from the current values whenever the drawer opens.
  useEffect(() => {
    if (open) {
      setForm({
        min_lead: config ? String(config.min_lead_minutes) : "",
        horizon: config ? String(config.horizon_days) : "",
        step: config ? String(config.slot_step_minutes) : "",
        max_party: config ? String(config.max_party_size) : "",
        margin: config ? String(config.last_seating_margin_minutes) : "",
        phone: config?.large_party_phone ?? "",
        email: config?.restaurant_notification_email ?? "",
      })
      setErrors({})
    }
  }, [open, config])

  const save = useMutation({
    mutationFn: (body: {
      min_lead_minutes: number
      horizon_days: number
      slot_step_minutes: number
      max_party_size: number
      last_seating_margin_minutes: number
      large_party_phone: string
      restaurant_notification_email: string | null
    }) =>
      sdk.client.fetch("/admin/table-reservation/config", {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["table-reservation-config"] })
      toast.success("Configuration saved")
      setOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save configuration")
    },
  })

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {}
    const numbers: Record<NumericFieldKey, number> = {
      min_lead: 0,
      horizon: 0,
      step: 0,
      max_party: 0,
      margin: 0,
    }
    for (const { key, min, message } of NUMERIC_FIELDS) {
      const value = Number(form[key])
      numbers[key] = value
      if (!Number.isInteger(value) || value < min) {
        nextErrors[key] = message
      }
    }

    const phone = form.phone.trim()
    const email = form.email.trim()
    if (!phone) {
      nextErrors.phone = "Required"
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    save.mutate({
      min_lead_minutes: numbers.min_lead,
      horizon_days: numbers.horizon,
      slot_step_minutes: numbers.step,
      max_party_size: numbers.max_party,
      last_seating_margin_minutes: numbers.margin,
      large_party_phone: phone,
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
              label="Minimum lead time"
              value={config ? `${config.min_lead_minutes} min` : "Not set yet"}
              hint="How far ahead of now a Heure de réservation must start to be offered."
            />
            <Row
              label="Horizon"
              value={config ? `${config.horizon_days} days` : "Not set yet"}
              hint="How many days ahead a Réservation may be taken."
            />
            <Row
              label="Step"
              value={config ? `${config.slot_step_minutes} min` : "Not set yet"}
              hint="The step a Service's window is sliced into."
            />
            <Row
              label="Maximum party size"
              value={config ? `${config.max_party_size} couverts` : "Not set yet"}
              hint="Above this, the storefront shows the phone number instead of the form."
            />
            <Row
              label="Last seating margin"
              value={
                config ? `${config.last_seating_margin_minutes} min` : "Not set yet"
              }
              hint="Subtracted from a Service's end time to get its last offerable Heure."
            />
            <Row
              label="Large-party phone"
              value={config?.large_party_phone ?? "Not set yet"}
              hint="Shown to parties above the maximum party size."
            />
            <Row
              label="Notification email"
              value={config?.restaurant_notification_email ?? "Not set yet"}
              hint="Where réservation and annulation notifications are sent."
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
            {NUMERIC_FIELDS.map(({ key, label, min }) => (
              <Field
                key={key}
                label={label}
                value={form[key]}
                onChange={(v) => {
                  setForm((f) => ({ ...f, [key]: v }))
                  setErrors((e) => ({ ...e, [key]: undefined }))
                }}
                error={errors[key]}
                min={min}
              />
            ))}
            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Large-party phone
              </Label>
              <Input
                value={form.phone}
                onChange={(e) => {
                  setForm((f) => ({ ...f, phone: e.target.value }))
                  setErrors((err) => ({ ...err, phone: undefined }))
                }}
              />
              {errors.phone && (
                <Text size="small" className="text-ui-fg-error">
                  {errors.phone}
                </Text>
              )}
            </div>
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
