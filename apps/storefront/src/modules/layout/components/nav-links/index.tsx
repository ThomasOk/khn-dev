"use client"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRef, useState } from "react"

type NavLinksProps = {
  categories: HttpTypes.StoreProductCategory[]
  scrolled?: boolean
}

export default function NavLinks({ categories, scrolled = true }: NavLinksProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const rootCategories = categories.filter((c) => !c.parent_category)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(false), 150)
  }

  return (
    <div className="hidden small:flex items-center gap-x-8 h-full">
      <div
        className="relative h-full flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <LocalizedClientLink
          href="/store"
          className="text-sm text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-300 flex items-center gap-1"
        >
          La carte
        </LocalizedClientLink>

        {rootCategories.length > 0 && (
          <div
            className={`absolute top-full left-1/2 -translate-x-1/2 pt-1 z-50 motion-safe:transition-[opacity,transform] motion-safe:duration-150 ease-out origin-top-left ${
              dropdownOpen
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <div className="bg-white rounded-lg shadow-md border border-orange-100 py-1.5 min-w-[180px]">
              {rootCategories.map((cat) => (
                <LocalizedClientLink
                  key={cat.id}
                  href={`/categories/${cat.handle}`}
                  className="block px-4 py-2 text-sm text-neutral-700 transition-colors duration-150 [@media(hover:hover)]:hover:text-orange-600 [@media(hover:hover)]:hover:bg-orange-50"
                  onClick={() => setDropdownOpen(false)}
                >
                  {cat.name}
                </LocalizedClientLink>
              ))}
            </div>
          </div>
        )}
      </div>

      <LocalizedClientLink
        href="/about"
        className="text-sm text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-300"
      >
        À propos
      </LocalizedClientLink>

      <LocalizedClientLink
        href="/table-reservations"
        className="text-sm text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-300"
      >
        Réserver
      </LocalizedClientLink>

      <LocalizedClientLink
        href="/contact"
        className="text-sm text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-300"
      >
        Contact
      </LocalizedClientLink>
    </div>
  )
}
