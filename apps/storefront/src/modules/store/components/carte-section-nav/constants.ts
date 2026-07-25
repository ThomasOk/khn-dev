import { STICKY_BANNER_OFFSET_VAR } from "@modules/layout/constants"

// Height of the fixed main nav (h-16, 64px) — the base every sticky bar on
// the Carte measures down from.
export const NAV_HEIGHT_PX = 64

// This sticky section-nav bar's own height (~56px: py-4 + one line of text).
export const SECTION_NAV_HEIGHT_PX = 56

// Combined offset every Carte section/sticky element reserves: fixed nav +
// this section-nav bar + whatever the announcement/cart-mismatch banner
// currently measures. The banner's height is published live (0px when it
// isn't rendered) by CarteSectionNav, the one client component in this
// stack that can run a ResizeObserver — everything else here (CarteSection's
// scrollMarginTop, the desktop cart column) is a Server Component and reads
// it back through this `calc()` instead.
export const CARTE_NAV_OFFSET = `calc(${NAV_HEIGHT_PX + SECTION_NAV_HEIGHT_PX}px + var(${STICKY_BANNER_OFFSET_VAR}, 0px))`
