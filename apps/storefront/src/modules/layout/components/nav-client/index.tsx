"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import NavLinks from "@modules/layout/components/nav-links"
import SideMenu from "@modules/layout/components/side-menu"

type NavClientProps = {
  children: React.ReactNode
  // An external reason to force the nav solid regardless of route — e.g. an
  // Annonce banner sitting right under the (fixed, otherwise transparent)
  // nav, which a transparent header would overlap illegibly. Callers that
  // have no such reason simply omit it.
  opaque?: boolean
}

export default function NavClient({
  children,
  opaque = false,
}: NavClientProps) {
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  // These pages have no dark hero behind the nav (unlike the Carte), so a
  // transparent header either sits on white (illegible white-on-white logo)
  // or directly over a product photo (illegible text-on-image). Force it
  // solid from the start instead of waiting for scroll.
  const forceSolidNav =
    opaque || pathname?.includes("/cart") || pathname?.includes("/products")

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const textClass = "text-white"

  return (
    <div
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
        scrolled || forceSolidNav ? "bg-[#121212]" : "bg-transparent"
      }`}
    >
      <header className="relative h-16 mx-auto">
        <nav className={`content-container flex items-center justify-between w-full h-full transition-colors duration-300 ${textClass}`}>
          <div className="flex-1 flex items-center gap-x-4">
            <div className="small:hidden">
              <SideMenu />
            </div>
            <LocalizedClientLink
              href="/"
              className="hidden small:block"
              data-testid="nav-store-link"
            >
              <Image
                src="/images/khn_logo.png"
                alt="Kim-Hi Noodle"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </LocalizedClientLink>
          </div>

          <div className="flex items-center">
            <LocalizedClientLink
              href="/"
              className="small:hidden"
              data-testid="nav-store-link-mobile"
            >
              <Image
                src="/images/khn_logo.png"
                alt="Kim-Hi Noodle"
                width={100}
                height={34}
                className="h-7 w-auto object-contain"
                priority
              />
            </LocalizedClientLink>
            <NavLinks />
          </div>

          <div className={`flex-1 flex items-center justify-end h-full transition-colors duration-300 ${textClass}`}>
            {children}
          </div>
        </nav>
      </header>
    </div>
  )
}
