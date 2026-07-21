"use client"

import { useMemo } from "react"
import { HttpTypes } from "@medusajs/types"

import { useActiveSection } from "@lib/hooks/use-active-section"

import { CARTE_NAV_OFFSET_PX } from "./constants"

// Sticky anchor bar for the Carte (docs/specs/commande-depuis-la-page-carte.md,
// "Une page unique pour toute la Carte, les sections en ancres"). Entries are
// plain in-page anchors, never route links: a click must never reload the
// page or the Variante/Sélection choices in progress on other cards.
export default function CarteSectionNav({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) {
  // useMemo keeps this array referentially stable across the re-renders
  // that useActiveSection's own setActiveId triggers — otherwise the
  // hook's effect would tear down and resubscribe its IntersectionObserver
  // on every scroll-driven highlight change.
  const ids = useMemo(
    () => categories.map((category) => category.handle),
    [categories]
  )
  // rootMargin shrinks the observed viewport to below the fixed nav + this
  // sticky bar (top) and to the upper half of the screen (bottom), so the
  // section highlighted is the one actually readable under the bars.
  const activeId = useActiveSection(ids, `-${CARTE_NAV_OFFSET_PX}px 0px -50% 0px`)

  if (categories.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Sections de la carte"
      className="sticky top-16 z-40 bg-white border-b border-neutral-200 py-3"
    >
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => {
          const isActive = category.handle === activeId

          return (
            <li key={category.id} className="shrink-0">
              <a
                href={`#${category.handle}`}
                aria-current={isActive ? "location" : undefined}
                className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150 ${
                  isActive
                    ? "bg-orange-600 text-white border-orange-600"
                    : "border-neutral-200 text-neutral-700 [@media(hover:hover)]:hover:border-orange-300 [@media(hover:hover)]:hover:text-orange-600"
                }`}
              >
                {category.name}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
