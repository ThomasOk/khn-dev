import { getBaseURL, isIndexingAllowed } from "@lib/util/env"
import { Metadata } from "next"
import { Inter, Lato, Playfair_Display, Edu_NSW_ACT_Cursive } from "next/font/google"
import "styles/globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
})

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const eduNswActHand = Edu_NSW_ACT_Cursive({
  subsets: ["latin"],
  variable: "--font-cursive",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  // robots.txt alone doesn't guarantee de-indexing (a crawler that ignores
  // it, or already knows the URL, can still index it) — the noindex meta
  // tag is the mechanism search engines actually honor for that. Same
  // NEXT_PUBLIC_ALLOW_INDEXING switch as robots.ts/sitemap.ts, fails safe
  // to noindex when unset.
  robots: isIndexingAllowed()
    ? { index: true, follow: true }
    : { index: false, follow: false },
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-mode="light" className={`${inter.variable} ${lato.variable} ${playfair.variable} ${eduNswActHand.variable} motion-safe:scroll-smooth`}>
      <body className="antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
