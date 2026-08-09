"use client"

import { useEffect, useMemo, useState } from "react"
import { HttpTypes } from "@medusajs/types"

import { useActiveSection } from "@lib/hooks/use-active-section"
import { STICKY_BANNER_ID, STICKY_BANNER_OFFSET_VAR } from "@modules/layout/constants"

import { NAV_HEIGHT_PX, SECTION_NAV_HEIGHT_PX } from "./constants"

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

  // The announcement/cart-mismatch banner ((main)/layout.tsx) renders above
  // this bar when present, with a height that varies with its content — a
  // long headline can wrap, cart-mismatch can appear or disappear. Measure
  // it live off its DOM id rather than assuming a fixed size, and publish it
  // as a CSS variable so the Carte's other offset-dependent elements (the
  // desktop cart column, each section's scrollMarginTop), which render as
  // Server Components and can't run this effect themselves, can stack under
  // it too (see CARTE_NAV_OFFSET in ./constants).
  const [bannerOffsetPx, setBannerOffsetPx] = useState(0)

  useEffect(() => {
    const bannerEl = document.getElementById(STICKY_BANNER_ID)

    if (!bannerEl) {
      document.documentElement.style.setProperty(STICKY_BANNER_OFFSET_VAR, "0px")
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      const height = entry.contentRect.height
      setBannerOffsetPx(height)
      document.documentElement.style.setProperty(
        STICKY_BANNER_OFFSET_VAR,
        `${height}px`
      )
    })
    observer.observe(bannerEl)

    return () => {
      observer.disconnect()
      document.documentElement.style.setProperty(STICKY_BANNER_OFFSET_VAR, "0px")
    }
  }, [])

  // rootMargin shrinks the observed viewport to below the fixed nav + this
  // sticky bar + the banner (top) and to the upper half of the screen
  // (bottom), so the section highlighted is the one actually readable under
  // the bars. IntersectionObserver's rootMargin doesn't resolve CSS
  // var()/calc(), so this needs the plain pixel total, not CARTE_NAV_OFFSET.
  const activeId = useActiveSection(
    ids,
    `-${NAV_HEIGHT_PX + SECTION_NAV_HEIGHT_PX + bannerOffsetPx}px 0px -50% 0px`
  )

  if (categories.length === 0) {
    return null
  }

  return (
    <nav
      aria-label="Sections de la carte"
      style={{ top: NAV_HEIGHT_PX + bannerOffsetPx }}
      className="sticky z-40 bg-khn-teal py-4"
    >
      <ul className="flex items-center justify-start small:justify-center gap-8 overflow-x-auto snap-x snap-mandatory px-6 small:px-0 scroll-pl-6 scroll-pr-6 small:scroll-pl-0 small:scroll-pr-0">
        {categories.map((category) => {
          const isActive = category.handle === activeId

          return (
            <li key={category.id} className="shrink-0 snap-start">
              <a
                href={`#${category.handle}`}
                aria-current={isActive ? "location" : undefined}
                className={`inline-block pb-1 text-xs tracking-[0.15em] uppercase border-b transition-[color,border-color,transform] duration-150 motion-safe:active:scale-[0.97] ${
                  isActive
                    ? "text-khn-gold border-khn-gold"
                    : "text-white/70 border-transparent [@media(hover:hover)]:hover:text-khn-gold"
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
