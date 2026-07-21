"use client"

import { ChevronDownMini } from "@medusajs/icons"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRef, useState } from "react"

const DELIVERY_PLATFORMS = [
  {
    name: "Uber Eats",
    href: "https://www.ubereats.com/store/kim-hi-noodle/yM9hQfPEUeaaTSyLWAy_MQ?diningMode=DELIVERY",
  },
  {
    name: "Deliveroo",
    href: "https://deliveroo.fr/fr/menu/Montpellier/castelnau-le-lez/kim-hi-noodle",
  },
]

const linkClass =
  "text-xs tracking-[0.15em] uppercase text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-orange-300"

export default function NavLinks() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setDropdownOpen(true)
  }

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setDropdownOpen(false), 150)
  }

  return (
    <div className="hidden small:flex items-center gap-x-8 h-full">
      <LocalizedClientLink href="/store" className={linkClass}>
        La carte
      </LocalizedClientLink>

      <LocalizedClientLink href="/about" className={linkClass}>
        Notre histoire
      </LocalizedClientLink>

      <LocalizedClientLink href="/contact" className={linkClass}>
        Contact
      </LocalizedClientLink>

      <div
        className="relative h-full flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          className={`${linkClass} flex items-center gap-1`}
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          Livraison
          <ChevronDownMini
            className={`transition-transform duration-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        <div
          className={`absolute top-full right-0 pt-2 z-50 motion-safe:transition-[opacity,transform] motion-safe:duration-150 ease-out origin-top-right ${
            dropdownOpen
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <div className="bg-white rounded-lg shadow-md border border-orange-100 py-1.5 min-w-[160px]">
            {DELIVERY_PLATFORMS.map((platform) => (
              <a
                key={platform.name}
                href={platform.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-2 text-sm text-neutral-700 transition-colors duration-150 [@media(hover:hover)]:hover:text-orange-600 [@media(hover:hover)]:hover:bg-orange-50"
              >
                {platform.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
