"use client"

import {
  createTableReservation,
  getReservationAvailability,
  ReservationAvailability,
  TableReservationConfirmation,
} from "@lib/data/table-reservations"
import { errorMessage } from "@lib/util/error-message"
import { todayInRestaurantTimezone } from "@lib/util/timezone"
import ErrorMessage from "@modules/checkout/components/error-message"
import InfoCard from "@modules/table-reservation/components/info-card"
import PhoneLink from "@modules/table-reservation/components/phone-link"
import ReservationConfirmation from "@modules/table-reservation/components/reservation-confirmation"
import { useCallback, useEffect, useState } from "react"

const AVAILABILITY_DEBOUNCE_MS = 350

function parsePartySize(raw: string): number | null {
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : null
}

const ReservationForm = () => {
  const [date, setDate] = useState(() => todayInRestaurantTimezone())
  const [partySizeInput, setPartySizeInput] = useState("2")
  const partySize = parsePartySize(partySizeInput)

  const [availability, setAvailability] = useState<ReservationAvailability | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(true)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [note, setNote] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<TableReservationConfirmation | null>(null)

  const fetchAvailability = useCallback((forDate: string, forPartySize: number) => {
    setAvailabilityLoading(true)
    setAvailabilityError(null)

    getReservationAvailability({ date: forDate, party_size: forPartySize })
      .then((result) => {
        setAvailability(result)
      })
      .catch((err) => {
        setAvailabilityError(errorMessage(err, "Could not load availability."))
      })
      .finally(() => {
        setAvailabilityLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!date || partySize === null) {
      return
    }

    setSelectedTime(null)

    const timeout = setTimeout(() => {
      fetchAvailability(date, partySize)
    }, AVAILABILITY_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, partySize, fetchAvailability])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedTime || partySize === null) {
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      const result = await createTableReservation({
        date,
        time: selectedTime,
        party_size: partySize,
        name,
        email,
        phone: customerPhone,
        note: note.trim() ? note.trim() : undefined,
      })
      setConfirmation(result)
    } catch (err) {
      setSubmitError(errorMessage(err, "Could not create the reservation."))
      // The failure is very often someone else having just taken the last
      // seat at this Heure — refresh so the stale time drops off the list
      // instead of letting the customer retry into the same conflict.
      fetchAvailability(date, partySize)
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <ReservationConfirmation
        confirmation={confirmation}
        customerName={name}
        phone={availability?.large_party_phone ?? null}
      />
    )
  }

  const restaurantPhone = availability?.large_party_phone ?? null
  const partySizeTooLarge =
    partySize !== null &&
    availability?.max_party_size != null &&
    partySize > availability.max_party_size

  return (
    <div className="flex flex-col gap-10">
      {restaurantPhone && (
        <p className="text-sm text-stone-600">
          Un empêchement, un grand groupe, une question ? Appelez-nous au{" "}
          <PhoneLink phone={restaurantPhone} />.
        </p>
      )}

      <div className="grid grid-cols-1 xsmall:grid-cols-2 gap-6 max-w-md">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Date
          </span>
          <input
            type="date"
            value={date}
            min={todayInRestaurantTimezone()}
            onChange={(e) => setDate(e.target.value)}
            required
            data-testid="reservation-date-input"
            className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Couverts
          </span>
          <input
            type="number"
            min={1}
            step={1}
            value={partySizeInput}
            onChange={(e) => setPartySizeInput(e.target.value)}
            required
            data-testid="reservation-party-size-input"
            className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </label>
      </div>

      {availabilityLoading && !availability && (
        <p
          className="text-sm text-stone-500"
          data-testid="reservation-availability-loading"
        >
          Chargement des disponibilités…
        </p>
      )}

      {availabilityError && (
        <ErrorMessage
          error={availabilityError}
          data-testid="reservation-availability-error"
        />
      )}

      {availability && partySize !== null && !availabilityError && (
        <>
          {partySizeTooLarge ? (
            <InfoCard
              title={`Au-delà de ${availability.max_party_size} couverts, la réservation en ligne n'est pas possible.`}
              data-testid="reservation-large-party"
            >
              {restaurantPhone ? (
                <>
                  Appelez-nous directement au <PhoneLink phone={restaurantPhone} />{" "}
                  : c&apos;est le meilleur moyen de composer un grand groupe —
                  et le bon réflexe si un groupe déjà réservé s&apos;agrandit.
                </>
              ) : (
                "Appelez le restaurant pour composer un grand groupe."
              )}
            </InfoCard>
          ) : !availability.open ? (
            <InfoCard
              title="Aucune réservation n'est possible à cette date."
              data-testid="reservation-closed"
            >
              Le restaurant est peut-être fermé ce jour-là, ou la date est
              hors de la période ouverte à la réservation en ligne. Essayez
              une autre date{restaurantPhone && ", ou appelez-nous au "}
              {restaurantPhone && <PhoneLink phone={restaurantPhone} />}.
            </InfoCard>
          ) : availability.times.length === 0 ? (
            <InfoCard
              title="Plus aucune heure disponible pour ce nombre de couverts à cette date."
              data-testid="reservation-no-times"
            >
              {date === todayInRestaurantTimezone()
                ? "Le service est peut-être déjà terminé ou complet aujourd'hui."
                : "Ce service est complet pour cette date."}{" "}
              Essayez une autre date ou un autre horaire
              {restaurantPhone && ", ou appelez-nous au "}
              {restaurantPhone && <PhoneLink phone={restaurantPhone} />}.
            </InfoCard>
          ) : (
            <div className="flex flex-col gap-8">
              <fieldset className="flex flex-col gap-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-stone-500 pb-2">
                  Heure de réservation
                </legend>
                <div
                  className="grid grid-cols-3 xsmall:grid-cols-4 small:grid-cols-6 gap-2"
                  data-testid="reservation-time-picker"
                >
                  {availability.times.map((time) => {
                    const isSelected = selectedTime === time
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        data-testid="reservation-time-option"
                        className={`h-11 rounded-md border text-sm font-medium transition-colors duration-150 ${
                          isSelected
                            ? "bg-stone-900 text-white border-stone-900"
                            : "border-stone-300 text-stone-700 [@media(hover:hover)]:hover:border-stone-900"
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              {selectedTime && (
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-4 max-w-md"
                  data-testid="reservation-contact-form"
                >
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Nom
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      data-testid="reservation-name-input"
                      className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="reservation-email-input"
                      className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Téléphone
                    </span>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      data-testid="reservation-phone-input"
                      className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Note (facultatif)
                    </span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      data-testid="reservation-note-input"
                      className="px-3 py-2 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </label>

                  <ErrorMessage error={submitError} data-testid="reservation-submit-error" />

                  <button
                    type="submit"
                    disabled={submitting}
                    data-testid="reservation-submit-button"
                    className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 bg-stone-900 text-white text-sm font-medium uppercase tracking-widest transition-colors duration-200 disabled:opacity-50 [@media(hover:hover)]:hover:bg-stone-700"
                  >
                    {submitting ? "Confirmation en cours…" : "Confirmer la réservation"}
                  </button>
                </form>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ReservationForm
