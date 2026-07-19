import { Metadata } from "next"
import CancelReservation from "@modules/table-reservation/components/cancel-reservation"

export const metadata: Metadata = {
  title: "Annuler ma réservation — Kim-Hi Noodle",
}

type Props = {
  // Fixed URL contract from the backend's cancellation email link
  // (apps/backend/src/lib/reservation/cancellation-link.ts):
  // /table-reservations/cancel?id=...&token=... — query params, not a nested
  // route param, kept independent from the store API's own routing.
  searchParams: Promise<{ id?: string; token?: string }>
}

export default async function CancelReservationPage(props: Props) {
  const { id, token } = await props.searchParams

  return (
    <div className="min-h-screen">
      <div className="bg-stone-900 pt-32 pb-20 small:pt-40 small:pb-28">
        <div className="content-container flex flex-col items-center text-center gap-4">
          <p className="text-orange-500 text-sm font-medium uppercase tracking-widest">
            Kim-Hi Noodle
          </p>
          <h1 className="font-display text-4xl small:text-6xl text-white leading-tight">
            Annuler ma réservation
          </h1>
        </div>
      </div>

      <div className="bg-khn-cream py-20 small:py-28">
        <div className="content-container max-w-lg">
          <CancelReservation id={id} token={token} />
        </div>
      </div>
    </div>
  )
}
