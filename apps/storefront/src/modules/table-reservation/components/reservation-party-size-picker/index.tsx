"use client"

// Falls back to 8 — today's documented default max_party_size (ticket 02) —
// until GET /store/table-reservations/settings resolves with the real,
// admin-configured value.
const DEFAULT_MAX_SIZE = 8

type ReservationPartySizePickerProps = {
  selectedSize: number
  onSelect: (size: number) => void
  maxSize?: number
}

const ReservationPartySizePicker = ({
  selectedSize,
  onSelect,
  maxSize = DEFAULT_MAX_SIZE,
}: ReservationPartySizePickerProps) => {
  const sizes = Array.from({ length: maxSize }, (_, index) => index + 1)

  return (
    <div
      role="group"
      aria-label="Nombre de couverts"
      className="flex flex-wrap gap-2"
      data-testid="reservation-party-size-picker"
    >
      {sizes.map((size) => {
        const isSelected = size === selectedSize
        return (
          <button
            key={size}
            type="button"
            onClick={() => onSelect(size)}
            aria-pressed={isSelected}
            data-testid="reservation-party-size-option"
            className={`flex items-center justify-center h-12 w-12 rounded-md border text-sm font-medium transition-colors duration-150 ${
              isSelected
                ? "bg-stone-900 text-white border-stone-900"
                : "border-stone-300 text-stone-700 [@media(hover:hover)]:hover:border-stone-900"
            }`}
          >
            {size}
          </button>
        )
      })}
    </div>
  )
}

export default ReservationPartySizePicker
