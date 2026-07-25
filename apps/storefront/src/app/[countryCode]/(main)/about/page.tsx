import { Metadata } from "next"
import AboutHero from "@modules/about/components/about-hero"
import OriginsSection from "@modules/about/components/origins-section"
import JourneySection from "@modules/about/components/journey-section"
import PrinciplesSection from "@modules/about/components/principles-section"
import CraftSection from "@modules/about/components/craft-section"
import GallerySection from "@modules/about/components/gallery-section"

export const metadata: Metadata = {
  title: "Notre histoire — Kim-Hi Noodle",
  description:
    "Découvrez l'histoire de Kim-Hi Noodle, restaurant de cuisine asiatique à Castelnau-le-Lez, entre recettes transmises et passion pour l'authenticité.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <AboutHero />
      <OriginsSection />
      <JourneySection />
      <PrinciplesSection />
      <CraftSection />
      <GallerySection />
    </div>
  )
}
