const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * 301 redirects from the legacy PrestaShop site (kim-hi-noodle.fr) to their
 * closest equivalent here, so the cutover doesn't drop the domain's existing
 * SEO. Full URL inventory and reasoning: docs/research/2026-08-11-prestashop-redirects.md.
 *
 * Scope decided with the user on 2026-08-11: individual redirects only for
 * pages with real SEO value (menu categories, products, legal/CMS pages,
 * contact). Everything else — account/cart/order utility pages, leftover
 * PrestaShop theme-demo pages, payment-module endpoints — falls back to the
 * home page instead of being mapped one by one.
 */
async function redirects() {
  const legacyMenuCategoryRedirects = [
    { source: "/12-notre-carte", destination: "/fr/store" },
    { source: "/13-entrees", destination: "/fr/store#entrées" },
    { source: "/14-plats", destination: "/fr/store#plats" },
    { source: "/15-desserts", destination: "/fr/store#desserts" },
    { source: "/16-formules", destination: "/fr/store#formules" },
    { source: "/17-boissons", destination: "/fr/store#boissons" },
    // No "suggestions" category on the new menu — closest equivalent is the
    // menu itself.
    { source: "/22-nos-suggestions", destination: "/fr/store" },
    // Disabled in the PrestaShop catalog (absent from the gsitemap export),
    // still indexed and drawing search traffic per Google Search Console —
    // no matching category on the new menu either.
    { source: "/19-plateau-lunch", destination: "/fr/store" },
  ]

  // Static asset, not part of any sitemap/CMS crawl — found via its search
  // traffic in Google Search Console (Performance report). No PDF menu on
  // the new site (the menu is the interactive /store page).
  const legacyMenuPdfRedirect = {
    source: "/img/cms/carte-khn.pdf",
    destination: "/fr/store",
  }

  const legacyProductRedirects = [
    // Individual dish pages (e.g. `/accueil/8-samoussas.html`) have no
    // per-item anchor on the new single-page menu — only categories do (see
    // CarteSection, `id={category.handle}`) — so every old product URL
    // collapses onto the menu itself rather than a specific section.
    { source: "/accueil/:slug", destination: "/fr/store" },
    { source: "/entrees/:slug", destination: "/fr/store" },
  ]

  const legacyCmsRedirects = [
    { source: "/content/2-mentions-legales", destination: "/fr/legal-notice" },
    {
      source: "/content/3-conditions-generales-de-vente",
      destination: "/fr/terms-of-sale",
    },
    {
      source: "/content/6-politique-de-confidentialite",
      destination: "/fr/privacy-policy",
    },
    { source: "/content/4-a-propos", destination: "/fr/about" },
    // Delivery / secure-payment info pages have no equivalent (click &
    // collect only, no delivery) — home rather than a mismatched page.
    { source: "/content/1-livraison", destination: "/fr" },
    { source: "/content/5-paiement-securise", destination: "/fr" },
  ]

  const legacyContactRedirects = [
    { source: "/nous-contacter", destination: "/fr/contact" },
    // Single restaurant — no "magasins" (store locator) on the new site.
    { source: "/magasins", destination: "/fr/contact" },
  ]

  // Long tail with no individual SEO value: account/cart/order utility
  // pages, leftover PrestaShop theme-demo pages ("fashion-manufacturer",
  // "midi" — never real restaurant content), and misc listing pages.
  const legacyCatchAllPaths = [
    "connexion",
    "mon-compte",
    "panier",
    "adresse",
    "adresses",
    "identite",
    "historique-commandes",
    "commande",
    "confirmation-commande",
    "suivi-commande",
    "suivi-commande-invite",
    "avoirs",
    "recuperation-mot-de-passe",
    "marques",
    "fournisseur",
    "1_fashion-manufacturer",
    "1__fashion-supplier",
    "2__midi",
    "meilleures-ventes",
    "nouveaux-produits",
    "promotions",
    "recherche",
    "plan-site",
    "reduction",
  ].map((path) => ({ source: `/${path}`, destination: "/fr" }))

  // Payment/AJAX module endpoints — same pathname regardless of the
  // `?controller=...` query string, never indexed with real content.
  const legacyModuleEndpointRedirect = {
    source: "/index.php",
    destination: "/fr",
  }

  return [
    ...legacyMenuCategoryRedirects,
    legacyMenuPdfRedirect,
    ...legacyProductRedirects,
    ...legacyCmsRedirects,
    ...legacyContactRedirects,
    ...legacyCatchAllPaths,
    legacyModuleEndpointRedirect,
  ].map((redirect) => ({ ...redirect, permanent: true }))
}

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  redirects,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
