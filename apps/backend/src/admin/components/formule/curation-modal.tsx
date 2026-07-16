import { useEffect, useMemo, useState } from "react"
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  Button,
  DataTable,
  DataTablePaginationState,
  DataTableRowSelectionState,
  FocusModal,
  Heading,
  Text,
  createDataTableColumnHelper,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { sdk } from "../../lib/sdk"
import { FormuleComposant, variantDisplayName } from "../../lib/formule"

// HttpTypes.AdminProductVariant doesn't declare product_id/product — they're
// only present at runtime because we ask for them via `fields` below.
type VariantRow = {
  id: string
  title: string
  product_id: string
  product?: { title: string } | null
}

type Props = {
  productId: string
  composant: FormuleComposant | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

// La Curation d'un Composant : toutes les Variantes de la Carte, cochées une
// par une (ADR 0001). Excludes the Formule's own Produit — curating a Menu
// into one of its own slots isn't a thing the domain models.
export const CurationModal = ({
  productId,
  composant,
  onOpenChange,
  onSaved,
}: Props) => {
  const open = !!composant
  const queryClient = useQueryClient()

  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>(
    {}
  )
  const [searchValue, setSearchValue] = useState("")
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  useEffect(() => {
    if (composant) {
      const initial: DataTableRowSelectionState = {}
      for (const variant of composant.product_variants) {
        initial[variant.id] = true
      }
      setRowSelection(initial)
      setSearchValue("")
      setPagination({ pageIndex: 0, pageSize: 10 })
    }
  }, [composant])

  const limit = pagination.pageSize
  const offset = pagination.pageIndex * limit

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.admin.productVariant.list({
        limit,
        offset,
        q: searchValue || undefined,
        fields: "id,title,product_id,product.title",
      }),
    queryKey: ["formule-curation-variants", limit, offset, searchValue],
    enabled: open,
    placeholderData: keepPreviousData,
  })

  const availableVariants = useMemo(
    () =>
      ((data?.variants ?? []) as unknown as VariantRow[]).filter(
        (v) => v.product_id !== productId
      ),
    [data?.variants, productId]
  )

  const save = useMutation({
    mutationFn: (variant_ids: string[]) =>
      sdk.client.fetch(
        `/admin/formules/${productId}/composants/${composant!.id}/variants`,
        { method: "POST", body: { variant_ids } }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formule-curation", productId] })
      toast.success(`Curation updated for "${composant!.label}"`)
      onSaved()
      onOpenChange(false)
    },
    onError: (error: Error) =>
      toast.error(error.message || "Failed to update curation"),
  })

  const columns = useVariantColumns()

  const table = useDataTable({
    data: availableVariants,
    columns,
    getRowId: (row) => row.id,
    rowCount: data?.count ?? 0,
    isLoading,
    rowSelection: {
      state: rowSelection,
      onRowSelectionChange: setRowSelection,
    },
    search: {
      state: searchValue,
      onSearchChange: setSearchValue,
    },
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  })

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <div className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header>
            <div className="flex items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button
                  size="small"
                  variant="secondary"
                  disabled={save.isPending}
                >
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button
                size="small"
                onClick={() => save.mutate(Object.keys(rowSelection))}
                isLoading={save.isPending}
              >
                Save
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="flex items-start justify-center overflow-auto">
            <div className="w-full max-w-3xl py-8">
              <div className="flex flex-col gap-y-6">
                <Heading level="h2">
                  Curate "{composant?.label}"
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Tick the Variantes allowed in this Composant. Adding a dish
                  to the Carte never adds it here automatically.
                </Text>
                <DataTable instance={table}>
                  <DataTable.Toolbar>
                    <DataTable.Search placeholder="Search dishes..." />
                  </DataTable.Toolbar>
                  <DataTable.Table />
                  <DataTable.Pagination />
                </DataTable>
              </div>
            </div>
          </FocusModal.Body>
        </div>
      </FocusModal.Content>
    </FocusModal>
  )
}

const columnHelper = createDataTableColumnHelper<VariantRow>()

const useVariantColumns = () => {
  return useMemo(
    () => [
      columnHelper.select(),
      columnHelper.accessor("title", {
        header: "Variante",
        cell: ({ row }) => variantDisplayName(row.original),
      }),
    ],
    []
  )
}
