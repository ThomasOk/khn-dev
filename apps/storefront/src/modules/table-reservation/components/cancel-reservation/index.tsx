"use client"

import { cancelTableReservation } from "@lib/data/table-reservations"
import { errorMessage } from "@lib/util/error-message"
import InfoCard from "@modules/table-reservation/components/info-card"
import { useEffect, useState } from "react"

type Props = {
  id: string | undefined
  token: string | undefined
}

type State =
  | { status: "loading" }
  | { status: "cancelled" }
  | { status: "invalid" }
  | { status: "error"; message: string }

const CancelReservation = ({ id, token }: Props) => {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    if (!id || !token) {
      setState({ status: "invalid" })
      return
    }

    let cancelled = false

    cancelTableReservation({ id, token })
      .then(() => {
        // Idempotent on the backend: this same 200 covers both "just
        // cancelled" and "already cancelled from a second click on the same
        // link" — so both cases render the identical, unambiguous state.
        if (!cancelled) {
          setState({ status: "cancelled" })
        }
      })
      .catch((err) => {
        if (cancelled) {
          return
        }
        // The backend returns the exact same 404 for an unknown id and for a
        // wrong token, on purpose — the page must not try to tell those
        // apart either.
        setState({
          status: "error",
          message: errorMessage(err, "Could not cancel the reservation."),
        })
      })

    return () => {
      cancelled = true
    }
  }, [id, token])

  if (state.status === "loading") {
    return (
      <p className="text-sm text-stone-500" data-testid="cancel-loading">
        Annulation en cours…
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

  if (state.status === "error") {
    return (
      <InfoCard title="Réservation introuvable" data-testid="cancel-error">
        Aucune réservation ne correspond à ce lien. Il est peut-être
        incorrect ou incomplet — appelez le restaurant si vous pensez qu&apos;il
        s&apos;agit d&apos;une erreur.
      </InfoCard>
    )
  }

  return (
    <InfoCard title="Réservation annulée" data-testid="cancel-success">
      Votre table est libérée. Vous pouvez réserver à nouveau à tout moment
      depuis la page de réservation.
    </InfoCard>
  )
}

export default CancelReservation
