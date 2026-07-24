"use client"

import {
  cancelTableReservation,
  getTableReservation,
  TableReservationLookup,
} from "@lib/data/table-reservations"
import { errorMessage } from "@lib/util/error-message"
import {
  formatReservationDateLong,
  formatReservationTime,
} from "@lib/util/reservation-format"
import ErrorMessage from "@modules/checkout/components/error-message"
import InfoCard from "@modules/table-reservation/components/info-card"
import { useEffect, useState } from "react"

type Props = {
  id: string | undefined
  token: string | undefined
}

type State =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "not_found" }
  | { status: "confirming"; reservation: TableReservationLookup }
  | { status: "cancelling"; reservation: TableReservationLookup }
  | { status: "cancel_error"; reservation: TableReservationLookup; message: string }
  | { status: "cancelled" }

const CancelReservation = ({ id, token }: Props) => {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    if (!id || !token) {
      setState({ status: "invalid" })
      return
    }

    let cancelled = false

    getTableReservation({ id, token })
      .then((reservation) => {
        if (cancelled) {
          return
        }
        // Already cancelled (a second visit to the same link, or the
        // customer confirmed on another tab) — nothing left to confirm.
        setState(
          reservation.status === "cancelled"
            ? { status: "cancelled" }
            : { status: "confirming", reservation }
        )
      })
      .catch(() => {
        // Same identical-404 contract as the cancel route: an unknown id and
        // a wrong token must read the same, so this never tries to tell them
        // apart either.
        if (!cancelled) {
          setState({ status: "not_found" })
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, token])

  const handleConfirm = async () => {
    if (state.status !== "confirming" || !id || !token) {
      return
    }

    const { reservation } = state
    setState({ status: "cancelling", reservation })

    try {
      await cancelTableReservation({ id, token })
      setState({ status: "cancelled" })
    } catch (err) {
      setState({
        status: "cancel_error",
        reservation,
        message: errorMessage(err, "Could not cancel the reservation."),
      })
    }
  }

  if (state.status === "loading") {
    return (
      <p className="text-sm text-stone-500" data-testid="cancel-loading">
        Chargement de votre réservation…
      </p>
    )
  }

  if (state.status === "invalid") {
    return (
      <InfoCard title="Lien incomplet" data-testid="cancel-invalid">
        Ce lien d&apos;annulation est incomplet. Utilisez le lien tel qu&apos;il
        apparaît dans l&apos;email de confirmation, ou appelez le restaurant.
      </InfoCard>
    )
  }

  if (state.status === "not_found") {
    return (
      <InfoCard title="Réservation introuvable" data-testid="cancel-not-found">
        Aucune réservation ne correspond à ce lien. Il est peut-être
        incorrect ou incomplet — appelez le restaurant si vous pensez qu&apos;il
        s&apos;agit d&apos;une erreur.
      </InfoCard>
    )
  }

  if (state.status === "cancelled") {
    return (
      <InfoCard title="Réservation annulée" data-testid="cancel-success">
        Votre table est libérée. Vous pouvez réserver à nouveau à tout moment
        depuis la page de réservation.
      </InfoCard>
    )
  }

  const { reservation } = state

  return (
    <div
      className="flex flex-col gap-6 bg-white border border-stone-200 rounded-lg p-8 small:p-12"
      data-testid="cancel-confirm"
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm text-stone-600">
          Voulez-vous annuler cette réservation ?
        </p>
        <p className="font-display text-2xl text-stone-900">
          {formatReservationDateLong(reservation.date)} à{" "}
          {formatReservationTime(reservation.time)}
        </p>
        <p className="text-sm text-stone-600">
          {reservation.party_size} couvert
          {reservation.party_size > 1 ? "s" : ""}
        </p>
      </div>

      {state.status === "cancel_error" && (
        <ErrorMessage error={state.message} data-testid="cancel-submit-error" />
      )}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={state.status === "cancelling"}
        data-testid="cancel-confirm-button"
        className="inline-flex items-center justify-center min-h-[44px] px-8 py-3 bg-stone-900 text-white text-sm font-medium uppercase tracking-widest transition-colors duration-200 disabled:opacity-50 [@media(hover:hover)]:hover:bg-stone-700"
      >
        {state.status === "cancelling"
          ? "Annulation en cours…"
          : "Annuler cette réservation"}
      </button>
    </div>
  )
}

export default CancelReservation
