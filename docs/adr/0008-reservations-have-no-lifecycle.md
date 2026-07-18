# A Réservation has no lifecycle, and large groups go through the phone

A Réservation is `confirmée` or `annulée`. There is no pending state, no approval step, no "arrivée", no "terminée", and **no no-show**. The customer can cancel from a link in their email at any time up to the Heure de réservation; nobody in the restaurant ever clicks anything on a Réservation. Parties above the configured maximum (8) are not bookable online at all — the form sends them to the telephone.

This is the same principle CONTEXT.md already states for the Commande — *"any state a human would have to remember to click during a rush is a state that will be wrong more often than right"* — applied to a feature where it is much less obvious, because every commercial booking product on the market tracks no-shows.

## Why no no-show

A no-show is real and it costs money, so recording it looks free. It is not: a field that a human must remember to set is filled in conscientiously for a month, sporadically for two more, and then never — after which the data is worse than no data, because it looks like a measurement.

The deeper reason is that **the measurement has no lever attached to it**. Everything one would do about repeat no-shows — a deposit, a card imprint, refusing a known offender — needs a durable customer identity, and this domain refuses to require an account ("no account is ever required"). Without identity, a no-show rate is a number nobody can act on.

A usable proxy comes free anyway: the cancellation link yields a **cancellation rate**. A healthy rate means customers are releasing tables they will not use, which is the outcome one actually wants; a rate near zero with a half-empty dining room says there is a no-show problem, without anything having been measured.

## Why large groups do not book online

The alternative was a pending state for large parties, which the restaurant would approve or refuse. It was rejected because it reintroduces exactly the daily obligation this feature was meant to avoid — a queue that must be watched, including on closing day — and because it would put back the second state this ADR just removed.

A party of ten needs a conversation regardless: a set menu, a real arrival time, sometimes a deposit. And a large-group no-show is the one loss the restaurant cannot absorb, so it is precisely the case where a human should be the one saying yes. Refusing them online costs a late-night booking that would have turned into a phone call the next morning in any event.

## Consequences

Modifying a Réservation is not supported: the customer cancels and books again. This is a genuine annoyance in the common case — a party growing from 4 to 5 must give up its 19h30 to find out whether 19h30 is still there — and it is accepted because an in-place modification is a release-and-retake under lock with a rollback, which is the only real concurrency problem this feature would otherwise have. The phone number on the page is the escape hatch, and "we'll pull up a chair" is a sentence the restaurant says without effort.

Cancellation carries no deadline on purpose. A cancel button that greys out at H-2 converts a customer who meant well into a customer who does nothing.
