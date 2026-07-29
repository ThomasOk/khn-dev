import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DotsSix } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Badge, IconButton, Text, clx } from "@medusajs/ui"

type Props = {
  product: HttpTypes.AdminProduct
  unranked: boolean
}

// The drag handle mirrors the one Medusa's own category-tree reorder already
// uses (DotsSix, transparent IconButton, cursor-grab) — "the gesture exists
// one level up" (spec §"What to build"), applied here to a flat list of
// Produits instead of a tree of Sections.
export const ProductRankRow = ({ product, unranked }: Props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clx(
        "bg-ui-bg-base flex items-center gap-x-3 border-y px-3 py-2 first:border-t-0",
        { "z-10 opacity-50": isDragging }
      )}
    >
      <IconButton
        size="small"
        variant="transparent"
        type="button"
        className="cursor-grab"
        {...attributes}
        {...listeners}
      >
        <DotsSix />
      </IconButton>
      {product.thumbnail ? (
        <img
          src={product.thumbnail}
          alt=""
          className="h-8 w-8 rounded object-cover"
        />
      ) : (
        <div className="bg-ui-bg-subtle h-8 w-8 rounded" />
      )}
      <Text size="small" leading="compact" className="flex-1 truncate">
        {product.title}
      </Text>
      {unranked && (
        <Badge size="2xsmall" color="orange">
          Unranked
        </Badge>
      )}
    </div>
  )
}
