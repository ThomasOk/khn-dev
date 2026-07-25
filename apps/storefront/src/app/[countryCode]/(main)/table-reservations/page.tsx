import { Metadata } from "next"
import RevealWrapper from "@modules/common/components/reveal-wrapper"
import ReservationForm from "@modules/table-reservation/components/reservation-form"
import ReservationHero from "@modules/table-reservation/components/reservation-hero"

export const metadata: Metadata = {
  title: "Réserver une table — Kim-Hi Noodle",
  description:
    "Réservez votre table au restaurant Kim-Hi Noodle à Castelnau-le-Lez : choisissez une date, un nombre de couverts, et confirmez en ligne.",
}

export default function TableReservationsPage() {
  return (
    <div className="min-h-screen">
      <ReservationHero />

      <div className="bg-khn-cream py-20 small:py-28">
        <div className="content-container max-w-3xl">
          <RevealWrapper direction="up">
            <div className="flex items-center gap-4 mb-10 small:mb-14">
              <h2 className="font-display text-3xl small:text-4xl uppercase tracking-wide text-stone-900">
                Choisir un créneau
              </h2>
              <span className="h-0.5 flex-1 max-w-16 bg-khn-gold" />
            </div>
            <ReservationForm />
          </RevealWrapper>
        </div>
      </div>
    </div>
  )
}
