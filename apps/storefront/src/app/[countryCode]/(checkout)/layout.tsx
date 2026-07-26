import { redirect } from "next/navigation"

import { retrieveShowcaseFresh } from "@lib/data/showcase"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ChevronDown from "@modules/common/icons/chevron-down"
import MedusaCTA from "@modules/layout/components/medusa-cta"

export default async function CheckoutLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params

  // Checked fresh at the entry of the whole (checkout) route group, not
  // neutralized step by step: a client already mid-tunnel when the switch
  // flips is sent back to the cart page, the one surface that both explains
  // the suspension and still holds their cart intact (docs/specs/mode-vitrine.md,
  // "Storefront — rendu").
  const showcase = await retrieveShowcaseFresh()

  if (showcase.showcase_mode) {
    redirect(`/${countryCode}/cart`)
  }

  return (
    <div className="w-full bg-white relative small:min-h-screen">
      <div className="h-16 bg-white border-b ">
        <nav className="flex h-full items-center content-container justify-between">
          <LocalizedClientLink
            href="/store"
            className="text-small-semi text-ui-fg-base flex items-center gap-x-2 uppercase flex-1 basis-0"
            data-testid="back-to-cart-link"
          >
            <ChevronDown className="rotate-90" size={16} />
            <span className="mt-px hidden small:block txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base ">
              Retour à la carte
            </span>
            <span className="mt-px block small:hidden txt-compact-plus text-ui-fg-subtle hover:text-ui-fg-base">
              Retour
            </span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/"
            className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
            data-testid="store-link"
          >
            Medusa Store
          </LocalizedClientLink>
          <div className="flex-1 basis-0" />
        </nav>
      </div>
      <div className="relative" data-testid="checkout-container">{children}</div>
      <div className="py-4 w-full flex items-center justify-center">
        <MedusaCTA />
      </div>
    </div>
  )
}
