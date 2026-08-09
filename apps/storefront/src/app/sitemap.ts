import { MetadataRoute } from "next"
import { getBaseURL, isIndexingAllowed } from "@lib/util/env"

const COUNTRY_CODE = process.env.NEXT_PUBLIC_DEFAULT_REGION || "fr"

// Real customer-facing pages only — mirrors the exclusions in robots.ts.
const STATIC_ROUTES = [
  "",
  "/store",
  "/about",
  "/contact",
  "/table-reservations",
  "/legal-notice",
  "/terms-of-sale",
  "/privacy-policy",
]

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexingAllowed()) {
    return []
  }

  const baseUrl = getBaseURL()

  return STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}/${COUNTRY_CODE}${route}`,
    lastModified: new Date(),
  }))
}
