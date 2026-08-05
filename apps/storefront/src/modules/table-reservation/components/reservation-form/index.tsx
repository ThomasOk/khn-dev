"use client"

import {
  createTableReservation,
  getReservationAvailability,
  getReservationOpenDays,
  getReservationSettings,
  ReservationAvailability,
  ReservationSettings,
  TableReservationConfirmation,
} from "@lib/data/table-reservations"
import { errorMessage } from "@lib/util/error-message"
import {
  groupReservationTimesByService,
  reservationDayOptionsFromDates,
  todayInRestaurantTimezone,
} from "@lib/util/timezone"
import ErrorMessage from "@modules/checkout/components/error-message"
import InfoCard from "@modules/table-reservation/components/info-card"
import PhoneLink from "@modules/table-reservation/components/phone-link"
import ReservationConfirmation from "@modules/table-reservation/components/reservation-confirmation"
import ReservationDatePicker from "@modules/table-reservation/components/reservation-date-picker"
import ReservationPartySizePicker from "@modules/table-reservation/components/reservation-party-size-picker"
import { useCallback, useEffect, useMemo, useState } from "react"

const AVAILABILITY_DEBOUNCE_MS = 350

const ReservationForm = () => {
  const [partySize, setPartySize] = useState(2)

  const [settings, setSettings] = useState<ReservationSettings | null>(null)

  // Days come from the backend already filtered to "has at least one
  // offerable Heure for partySize" (GET .../open-days) — no client-side
  // horizon generation, and `date` stays null until that first response
  // picks a default (see the effect below).
  const [openDays, setOpenDays] = useState<string[] | null>(null)
  const [openDaysLoading, setOpenDaysLoading] = useState(true)
  const [openDaysError, setOpenDaysError] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)

  const dayOptions = useMemo(
    () => reservationDayOptionsFromDates(openDays ?? []),
    [openDays]
  )

  const [availability, setAvailability] = useState<ReservationAvailability | null>(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)

  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [note, setNote] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<TableReservationConfirmation | null>(null)

  useEffect(() => {
    getReservationSettings()
      .then(setSettings)
      .catch(() => {
        // Non-fatal: the couverts picker and the phone line just keep their
        // fallbacks until a re-render succeeds.
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    setOpenDaysLoading(true)
    setOpenDaysError(null)

    getReservationOpenDays({ party_size: partySize })
      .then((result) => {
        if (cancelled) {
          return
        }
        setOpenDays(result.open_dates)
        // Keep the current date if it's still open at this party_size,
        // otherwise fall back to the first open day (or none at all).
        setDate((current) =>
          current && result.open_dates.includes(current)
            ? current
            : result.open_dates[0] ?? null
        )
      })
      .catch((err) => {
        if (!cancelled) {
          setOpenDaysError(errorMessage(err, "Could not load available dates."))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOpenDaysLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [partySize])

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
    if (!date) {
      // No open day for the current party_size — clear out whatever the
      // previous date's fetch left behind so its InfoCard/time grid doesn't
      // linger under "Aucune date n'est disponible" above.
      setAvailability(null)
      setAvailabilityError(null)
      setSelectedTime(null)
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
    if (!selectedTime || !date) {
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

  const restaurantPhone = settings?.large_party_phone ?? availability?.large_party_phone ?? null
  const partySizeTooLarge =
    availability?.max_party_size != null && partySize > availability.max_party_size

  return (
    <div className="flex flex-col gap-8">
      {restaurantPhone && (
        <p className="text-sm text-stone-600">
          Un empêchement, un grand groupe, une question ? Appelez-nous au{" "}
          <PhoneLink phone={restaurantPhone} />.
        </p>
      )}

      <div className="bg-white border border-stone-200 rounded-md p-6 small:p-8 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Sélectionnez une date
          </span>

          {openDaysLoading && !openDays ? (
            <p
              className="text-sm text-stone-500"
              data-testid="reservation-open-days-loading"
            >
              Chargement des dates disponibles…
            </p>
          ) : openDaysError ? (
            <ErrorMessage
              error={openDaysError}
              data-testid="reservation-open-days-error"
            />
          ) : openDays && openDays.length === 0 ? (
            <InfoCard
              flat
              title="Aucune date n'est disponible actuellement à la réservation en ligne."
              data-testid="reservation-no-open-days"
            >
              Essayez de nouveau plus tard{restaurantPhone && ", ou appelez-nous au "}
              {restaurantPhone && <PhoneLink phone={restaurantPhone} />}.
            </InfoCard>
          ) : (
            date && (
              <ReservationDatePicker
                days={dayOptions}
                selectedDate={date}
                onSelect={setDate}
              />
            )
          )}
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

        {availability && !availabilityError && (
          <>
            {partySizeTooLarge ? (
              <InfoCard
                flat
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
                flat
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
                flat
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
              <fieldset className="flex flex-col gap-5">
                <legend className="text-xs font-semibold uppercase tracking-wider text-stone-500 pb-2">
                  Sélectionnez un créneau
                </legend>
                {groupReservationTimesByService(availability.times).map((group) => (
                  <div key={group.label} className="flex flex-col gap-3">
                    <span className="text-xs font-semibold uppercase tracking-widest text-khn-gold">
                      {group.label}
                    </span>
                    <div
                      className="grid grid-cols-2 xsmall:grid-cols-4 small:grid-cols-6 gap-2"
                      data-testid="reservation-time-picker"
                    >
                      {group.times.map((time) => {
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
                  </div>
                ))}
              </fieldset>
            )}
          </>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-md p-6 small:p-8 flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Nombre de couverts
        </span>
        <ReservationPartySizePicker
          selectedSize={partySize}
          onSelect={setPartySize}
          maxSize={settings?.max_party_size ?? undefined}
        />
      </div>

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
              className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-khn-gold"
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
              className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-khn-gold"
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
              className="h-11 px-3 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-khn-gold"
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
              className="px-3 py-2 border border-stone-300 rounded-md text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-khn-gold"
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
  )
}

export default ReservationForm
