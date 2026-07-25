import { Metadata } from "next"
import ContactHero from "@modules/contact/components/contact-hero"
import CoordinatesSection from "@modules/contact/components/coordinates-section"
import OpeningHoursSection from "@modules/contact/components/opening-hours-section"
import FindUsSection from "@modules/contact/components/find-us-section"
import ReservationCtaSection from "@modules/contact/components/reservation-cta-section"

export const metadata: Metadata = {
  title: "Contact & Informations — Kim-Hi Noodle",
  description:
    "Horaires, adresse, transport et informations pratiques du restaurant Kim-Hi Noodle à Castelnau-le-Lez.",
}

export default function ContactPage() {
  return (
    <div className="min-h-screen">

      <ContactHero />

      <CoordinatesSection />

      <OpeningHoursSection />

      <FindUsSection />

      <ReservationCtaSection />

    </div>
  )
}
