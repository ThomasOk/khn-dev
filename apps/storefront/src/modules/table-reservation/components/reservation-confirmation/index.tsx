import { TableReservationConfirmation } from "@lib/data/table-reservations"
import {
  formatReservationDateLong,
  formatReservationTime,
} from "@lib/util/reservation-format"
import PhoneLink from "@modules/table-reservation/components/phone-link"

type Props = {
  confirmation: TableReservationConfirmation
  customerName: string
  phone: string | null
}

const ReservationConfirmation = ({ confirmation, customerName, phone }: Props) => {
  return (
    <div
      className="flex flex-col gap-8 bg-white border border-stone-200 rounded-lg p-8 small:p-12"
      data-testid="reservation-confirmation"
    >
      <div className="flex flex-col gap-2">
        <p className="text-orange-600 text-xs font-semibold uppercase tracking-widest">
          Réservation confirmée
        </p>
        <h2 className="font-display text-3xl text-stone-900">
          Merci, {customerName} !
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-6 py-6 border-y border-stone-200">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Date
          </p>
          <p className="text-sm text-stone-800 capitalize">
            {formatReservationDateLong(confirmation.date)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Heure
          </p>
          <p className="text-sm text-stone-800">
            {formatReservationTime(confirmation.time)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Couverts
          </p>
          <p className="text-sm text-stone-800">{confirmation.party_size}</p>
        </div>
      </div>

      <p className="text-sm text-stone-600 leading-relaxed">
        Un email de confirmation vient de partir avec ce récapitulatif et un
        lien pour annuler votre table si besoin.
      </p>

      <div className="flex flex-col gap-2 bg-khn-cream p-5 rounded-md">
        <p className="text-sm text-stone-700 leading-relaxed">
          {phone ? (
            <>
              Besoin particulier ? Appelez-nous au <PhoneLink phone={phone} />.
            </>
          ) : (
            "Besoin particulier ? Appelez le restaurant."
          )}
        </p>
      </div>
    </div>
  )
}

export default ReservationConfirmation
