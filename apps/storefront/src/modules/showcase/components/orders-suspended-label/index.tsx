// The Mode vitrine's state label (docs/specs/mode-vitrine.md, "Storefront —
// rendu"): sits exactly where an ordering button used to be, on both a
// filled and an empty cart. Unlike ShowcaseNotice, this is not the
// restaurateur's explanation — it never depends on the Note de vitrine and
// shows whenever ordering is suspended, note or no note. Deliberately short
// and non-explanatory: the moment it says *why*, it duplicates the Note and
// becomes the hardcoded fallback sentence the spec's decision 6 forbids.
// No role="status" — this is static markup present on first server render,
// and ShowcaseNotice already owns that role on the same page.
export default function OrdersSuspendedLabel() {
  return (
    <p
      className="text-sm text-neutral-500"
      data-testid="orders-suspended-label"
    >
      Commandes suspendues
    </p>
  )
}
