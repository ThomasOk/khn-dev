// DOM id of the (main) layout's sticky announcement/cart-mismatch banner
// wrapper (see app/[countryCode]/(main)/layout.tsx). Its height varies with
// content and it can be absent entirely, so anything that needs to stack a
// sticky/offset element under it measures off this id instead of assuming a
// fixed size.
export const STICKY_BANNER_ID = "sticky-banner"

// CSS custom property carrying that banner's live measured height (unset,
// i.e. falls back to 0px, when the banner isn't rendered). Whoever measures
// the banner publishes it here; any Server Component elsewhere in the tree
// that can't run the measuring effect itself can still read it in a
// `calc()`.
export const STICKY_BANNER_OFFSET_VAR = "--khn-sticky-banner-offset"
