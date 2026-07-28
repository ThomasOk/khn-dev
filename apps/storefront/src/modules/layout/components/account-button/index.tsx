import LocalizedClientLink from "@modules/common/components/localized-client-link"

// The route itself renders the login screen or the dashboard depending on
// session state (src/app/[countryCode]/(main)/account/layout.tsx) — this
// link stays the same for every visitor, logged in or not.
export default function AccountButton() {
  return (
    <LocalizedClientLink
      className="relative inline-flex items-center text-white transition-colors duration-200 [@media(hover:hover)]:hover:text-khn-gold"
      href="/account"
      data-testid="nav-account-link"
      aria-label="Mon compte"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </svg>
    </LocalizedClientLink>
  )
}
