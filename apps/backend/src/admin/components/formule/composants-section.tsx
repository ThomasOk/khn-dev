import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Badge,
  Button,
  Drawer,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { PencilSquare, Plus } from "@medusajs/icons"
import { sdk } from "../../lib/sdk"
import { Formule, FormuleComposant, variantDisplayName } from "../../lib/formule"
import { CurationModal } from "./curation-modal"

type Props = {
  formule: Formule
}

// Composants of a Formule, listed by label, each with its curated Variantes
// by name (spec §"La Curation : écran sur la fiche du Produit Formule").
export const ComposantsSection = ({ formule }: Props) => {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<FormuleComposant | null>(null)
  const [curating, setCurating] = useState<FormuleComposant | null>(null)

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["formule-curation", formule.product_id],
    })

  const composants = [...formule.composants].sort((a, b) => a.rank - b.rank)

  return (
    <div className="flex flex-col divide-y">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading level="h2">Composants</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The slots this Formule's customer must fill.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setCreateOpen(true)}>
          <Plus />
          Add Composant
        </Button>
      </div>

      <div className="flex flex-col gap-y-2 px-6 py-4">
        {composants.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No Composant yet — add one (e.g. "Entrée") to start curating it.
          </Text>
        ) : (
          composants.map((composant) => (
            <div
              key={composant.id}
              className="bg-ui-bg-subtle flex flex-col gap-y-2 rounded-md px-3 py-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <Text size="small" leading="compact" weight="plus">
                    {composant.label}
                  </Text>
                  <Badge size="2xsmall" color="grey">
                    {composant.key}
                  </Badge>
                </div>
                <div className="flex items-center gap-x-2">
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setCurating(composant)}
                  >
                    Curate
                  </Button>
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => setEditing(composant)}
                  >
                    <PencilSquare />
                  </IconButton>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {composant.product_variants.length === 0 ? (
                  <Text size="small" className="text-ui-fg-subtle">
                    No Variante curated yet.
                  </Text>
                ) : (
                  composant.product_variants.map((variant) => (
                    <Badge key={variant.id} size="2xsmall">
                      {variantDisplayName(variant)}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <CreateComposantModal
        productId={formule.product_id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={invalidate}
        nextRank={composants.length}
      />
      <EditComposantDrawer
        productId={formule.product_id}
        composant={editing}
        onClose={() => setEditing(null)}
        onSaved={invalidate}
      />
      <CurationModal
        productId={formule.product_id}
        composant={curating}
        onOpenChange={(open) => !open && setCurating(null)}
        onSaved={invalidate}
      />
    </div>
  )
}

// --- Create (FocusModal) --------------------------------------------------------

type CreateForm = { key: string; label: string; rank: number }

const CreateComposantModal = ({
  productId,
  open,
  onOpenChange,
  onSaved,
  nextRank,
}: {
  productId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  nextRank: number
}) => {
  const [form, setForm] = useState<CreateForm>({
    key: "",
    label: "",
    rank: nextRank,
  })
  const [error, setError] = useState<string | undefined>()

  useEffect(() => {
    if (open) {
      setForm({ key: "", label: "", rank: nextRank })
      setError(undefined)
    }
  }, [open, nextRank])

  const create = useMutation({
    mutationFn: (body: CreateForm) =>
      sdk.client.fetch(`/admin/formules/${productId}/composants`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      onSaved()
      toast.success("Composant added")
      onOpenChange(false)
    },
    onError: (err: Error) => toast.error(err.message || "Failed to add Composant"),
  })

  const handleSubmit = () => {
    if (!form.key.trim() || !form.label.trim()) {
      setError("Key and label are required")
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
              <Button size="small" variant="secondary" disabled={create.isPending}>
                Cancel
              </Button>
            </FocusModal.Close>
            <Button size="small" onClick={handleSubmit} isLoading={create.isPending}>
              Add
            </Button>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-1 flex-col items-center overflow-auto py-8">
          <div className="flex w-full max-w-md flex-col gap-y-4">
            <Heading level="h2">Add a Composant</Heading>

            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Key
              </Label>
              <Text size="small" className="text-ui-fg-subtle">
                Stable, English, cannot be changed after creation — e.g.
                "starter", "main".
              </Text>
              <Input
                value={form.key}
                onChange={(e) => {
                  setForm((f) => ({ ...f, key: e.target.value }))
                  setError(undefined)
                }}
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Label
              </Label>
              <Text size="small" className="text-ui-fg-subtle">
                Displayed name, e.g. "Entrée".
              </Text>
              <Input
                value={form.label}
                onChange={(e) => {
                  setForm((f) => ({ ...f, label: e.target.value }))
                  setError(undefined)
                }}
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <Label size="small" weight="plus">
                Rank
              </Label>
              <Input
                type="number"
                value={form.rank}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rank: Number(e.target.value) }))
                }
              />
            </div>

            {error && (
              <Text size="small" className="text-ui-fg-error">
                {error}
              </Text>
            )}
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  )
}

// --- Edit (Drawer) --------------------------------------------------------------

type EditForm = { label: string; rank: number }

const EditComposantDrawer = ({
  productId,
  composant,
  onClose,
  onSaved,
}: {
  productId: string
  composant: FormuleComposant | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [form, setForm] = useState<EditForm>({ label: "", rank: 0 })

  useEffect(() => {
    if (composant) {
      setForm({ label: composant.label, rank: composant.rank })
    }
  }, [composant])

  const update = useMutation({
    mutationFn: (body: EditForm) =>
      sdk.client.fetch(
        `/admin/formules/${productId}/composants/${composant!.id}`,
        { method: "POST", body }
      ),
    onSuccess: () => {
      onSaved()
      toast.success("Composant updated")
      onClose()
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update"),
  })

  return (
    <Drawer open={!!composant} onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Edit Composant</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4">
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Key
            </Label>
            <Text size="small" className="text-ui-fg-subtle">
              {composant?.key} — immutable, cannot be changed here.
            </Text>
          </div>
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Label
            </Label>
            <Input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-y-2">
            <Label size="small" weight="plus">
              Rank
            </Label>
            <Input
              type="number"
              value={form.rank}
              onChange={(e) =>
                setForm((f) => ({ ...f, rank: Number(e.target.value) }))
              }
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button size="small" variant="secondary" disabled={update.isPending}>
              Cancel
            </Button>
          </Drawer.Close>
          <Button
            size="small"
            onClick={() => update.mutate(form)}
            isLoading={update.isPending}
          >
            Save
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
