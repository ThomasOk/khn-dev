import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import {
  Button,
  Container,
  Heading,
  Label,
  Switch,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import {
  NOTE_MAX_LENGTH,
  SHOWCASE_QUERY_KEY,
  SUGGESTED_NOTE,
  useShowcaseConfig,
} from "../../lib/showcase"

// Showcase mode (Mode vitrine): the emergency switch, from the admin, no curl
// needed. The screen seeds itself from the saved state exactly once per
// mount — after that, the form's own state is the source of truth, so
// saving a cleared note doesn't get overwritten by the suggestion on the
// next refetch (spec: "enregistrer un champ vidé enregistre bien pas de
// note, et ne réécrit pas la suggestion").
export const ShowcaseSection = () => {
  const queryClient = useQueryClient()
  const [enabled, setEnabled] = useState(false)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | undefined>()
  const initialized = useRef(false)

  const { data, isLoading } = useShowcaseConfig()

  useEffect(() => {
    if (!data || initialized.current) {
      return
    }
    initialized.current = true
    setEnabled(data.enabled)
    setNote(data.note ?? SUGGESTED_NOTE)
  }, [data])

  const save = useMutation({
    mutationFn: (body: { enabled: boolean; note: string | null }) =>
      sdk.client.fetch("/admin/showcase", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SHOWCASE_QUERY_KEY })
      toast.success("Showcase mode saved")
      setError(undefined)
    },
    onError: (err: Error) => setError(err.message || "Failed to save"),
  })

  const noteLength = note.trim().length
  const overLimit = noteLength > NOTE_MAX_LENGTH

  const handleSubmit = () => {
    if (overLimit) {
      setError(`Note must be ${NOTE_MAX_LENGTH} characters or fewer`)
      return
    }
    save.mutate({ enabled, note: note.trim() || null })
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col px-6 py-4">
        <Heading level="h2">Showcase mode</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Suspend online ordering site-wide. While on, checkout is refused
          and visitors see the note below instead.
        </Text>
      </div>

      <div className="flex flex-col gap-y-4 px-6 py-4">
        {isLoading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : (
          <>
            <div className="flex items-center gap-x-3">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <Label size="small" weight="plus">
                Online ordering suspended
              </Label>
            </div>

            <div className="flex flex-col gap-y-2">
              <div className="flex items-center justify-between">
                <Label size="small" weight="plus">
                  Showcase note
                </Label>
                <Text
                  size="small"
                  leading="compact"
                  className={
                    overLimit ? "text-ui-fg-error" : "text-ui-fg-subtle"
                  }
                >
                  {noteLength}/{NOTE_MAX_LENGTH}
                </Text>
              </div>
              <Textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value)
                  setError(undefined)
                }}
              />
              <Text size="small" className="text-ui-fg-subtle">
                Shown to visitors while the mode is on. Editable either way —
                prepare it ahead of time, or fix it without reopening orders.
              </Text>
            </div>

            {error && (
              <Text size="small" className="text-ui-fg-error">
                {error}
              </Text>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end px-6 py-4">
        <Button
          size="small"
          onClick={handleSubmit}
          isLoading={save.isPending}
          disabled={isLoading}
        >
          Save
        </Button>
      </div>
    </Container>
  )
}
