import { Metadata } from "next"
import RevealWrapper from "@modules/common/components/reveal-wrapper"
import ReservationForm from "@modules/table-reservation/components/reservation-form"

export const metadata: Metadata = {
  title: "Réserver une table — Kim-Hi Noodle",
  description:
    "Réservez votre table au restaurant Kim-Hi Noodle à Castelnau-le-Lez : choisissez une date, un nombre de couverts, et confirmez en ligne.",
}

export default function TableReservationsPage() {
  return (
    <div className="min-h-screen">
      <div className="bg-stone-900 pt-32 pb-20 small:pt-40 small:pb-28">
        <div className="content-container flex flex-col items-center text-center gap-4">
          <p className="text-orange-500 text-sm font-medium uppercase tracking-widest">
            Kim-Hi Noodle
          </p>
          <h1 className="font-display text-4xl small:text-6xl text-white leading-tight">
            Réserver une table
          </h1>
        </div>
      </div>

      <div className="bg-khn-cream py-20 small:py-28">
        <div className="content-container max-w-3xl">
          <RevealWrapper direction="up">
            <ReservationForm />
          </RevealWrapper>
        </div>
      </div>
    </div>
  )
}
