import { getBaseURL } from "@lib/util/env"
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
