import { useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import { HttpTypes } from "@medusajs/types"
import { Container, Heading, Text, toast } from "@medusajs/ui"
import { sdk } from "../lib/sdk"
import {
  buildCarteRankBatchUpdate,
  compareByCarteRank,
  isUnranked,
} from "../lib/carte-rank"
import { ProductRankRow } from "../components/carte-rank/product-rank-row"

type Props = DetailWidgetProps<HttpTypes.AdminProductCategory>

// The Carte order lives on the category detail page (spec §"Le widget : sur
// la page de la catégorie, enregistrement au dépôt") — this is where the
// Section is already defined and where its own Rang is already dragged.
const CarteRankWidget = ({ data: category }: Props) => {
  const queryClient = useQueryClient()
  const queryKey = ["carte-rank", category.id]

  const { data, isLoading } = useQuery({
    queryFn: () =>
      sdk.admin.product.list({
        category_id: [category.id],
        limit: 100,
        order: "created_at",
        fields: "id,title,thumbnail,status,metadata,created_at",
      }),
    queryKey,
  })

  // The list shown here must match what the Carte shows (spec §"What to
  // build"), so the fetched Produits are sorted once with the same
  // comparator the storefront uses before becoming the draggable order.
  const [items, setItems] = useState<HttpTypes.AdminProduct[]>([])

  useEffect(() => {
    if (data?.products) {
      setItems([...data.products].sort(compareByCarteRank))
    }
  }, [data])

  const reorder = useMutation({
    mutationFn: (products: HttpTypes.AdminProduct[]) =>
      sdk.admin.product.batch({
        update: buildCarteRankBatchUpdate(products),
      }),
    onSuccess: () => {
      toast.success("Carte order saved")
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = items.findIndex((product) => product.id === active.id)
    const newIndex = items.findIndex((product) => product.id === over.id)
    if (oldIndex === -1 || newIndex === -1) {
      return
    }

    const previous = items
    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered)

    reorder.mutate(reordered, {
      onError: (error: Error) => {
        // A failed save must never leave the screen showing an order the
        // server doesn't have (spec §"Enregistrement au dépôt, sans étape
        // de validation"). Reverting to this snapshot is only a guess at
        // "the server's order" — exactly right for one drag at a time, but
        // a second drag started before this one settled would have taken
        // its own snapshot from this optimistic (unconfirmed) state. The
        // invalidation below is what actually earns "revient à l'ordre du
        // serveur": it refetches and overwrites this guess with the truth.
        setItems(previous)
        queryClient.invalidateQueries({ queryKey })
        toast.error(error.message || "Failed to save the new order")
      },
    })
  }

  if (isLoading) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col px-6 py-4">
        <Heading level="h2">Carte order</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Drag a dish to change the order customers see on the Carte.
        </Text>
      </div>
      <div className="px-6 py-4">
        {items.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No product in this category.
          </Text>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((product) => product.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col">
                {items.map((product) => (
                  <ProductRankRow
                    key={product.id}
                    product={product}
                    unranked={isUnranked(product)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CarteRankWidget
