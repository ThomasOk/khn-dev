import { MetadataRoute } from "next"
import { getBaseURL, isIndexingAllowed } from "@lib/util/env"

// Account, cart, checkout, and order pages are functional, not content —
// keep them out of crawl budget regardless of environment. Product/collection
// detail pages exist as routes but aren't linked from the real customer
// journey ("La Carte" handles everything on one page), so they're excluded
// too rather than indexed as orphaned duplicates.
const DISALLOWED_PATHS = [
  "/*/account",
  "/*/cart",
  "/*/checkout",
  "/*/order",
  "/*/forgot-password",
  "/*/reset-password",
  "/*/verify-account",
  "/*/products",
  "/*/collections",
  "/*/categories",
]

export default function robots(): MetadataRoute.Robots {
  if (!isIndexingAllowed()) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    }
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: DISALLOWED_PATHS,
    },
    sitemap: `${getBaseURL()}/sitemap.xml`,
  }
}
