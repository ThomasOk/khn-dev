# The Mode vitrine never switches itself on or off

The **Mode vitrine** — the state in which the Carte is browsable but nothing can be ordered — is switched on and off **by a human, and only by a human**. It is not derived from the Créneaux, it has no end date, and it never expires. A Carte whose ordering controls are gone is therefore always the result of somebody having decided so, on purpose, a moment ago.

Two obvious automations were considered and both rejected.

## Why the Carte does not hide its ordering when no Créneau is left

The data is right there: `GET /store/pickup-slots` already answers `orders_open`, and it is already false every night after the last créneau and throughout a Fermeture exceptionnelle. Making the Carte read it would remove ordering exactly when ordering is impossible — and it *is* the more frequent case by far, since it happens every single evening. A future reader will find the flag one route away from a page that ignores it and assume it was an oversight. It was not.

The Carte is the page the site is cached on and the page most visitors land on. `orders_open` depends on the current instant and on the Délai de préparation, so it can never be cached at all — reading it from the Carte makes every visit a backend round trip, permanently, to change what the page shows for a few hours each night. The Mode vitrine is read instead, and it has civil-day-or-longer granularity: sixty seconds of staleness cost nothing, so the page stays cached.

The two states also do not deserve the same words. "Plus de créneau aujourd'hui, revenez demain" is a schedule talking; "on ne prend plus de commandes" is the restaurant talking, and only the second one has a Note de vitrine to show. Merging them would leave the storefront unable to tell which sentence it is supposed to say. Meeting the closed-orders state at the créneau picker, where the schedule is the subject, remains the deliberate behaviour.

## Why the Mode vitrine has no expiry date

An Annonce is required to have an end date, and for a good reason (a stale banner burns the credibility of every later one). The symmetry is tempting and it is wrong here.

A Mode vitrine is switched on the moment something breaks, which is precisely the moment nobody knows how long it will last. Demanding a date then means inventing one. And the automation fails in the dangerous direction: an estimate that turns out short **reopens the orders by itself** while the kitchen is still down, and the site starts accepting food nobody can cook — the exact outcome the switch exists to prevent. An estimate that turns out long merely leaves the mode on a little too far, which is visible and costs a click.

## Consequences

**The failure mode is staying closed without noticing**, and it is silent from the restaurant's side: an empty order list looks identical to a quiet day. This is mitigated in the admin UI, not in the domain — a widget states the mode is active on every admin page and offers to switch it off — for the same reason as ADR 0007 and ADR 0009: the mechanisms stay readable, testable and removable on their own, and a human reads the screen that reconciles them.

The count of independent ways to say "you cannot order" set out in ADR 0009 is unchanged at three: Fermeture exceptionnelle, Mode vitrine, Annonce. Nothing here makes any of them agree with the others, and the coherence screen that ADR 0009 promises remains unbuilt and remains the right place to fix it.

The naming in ADR 0009 is superseded: what it calls *Mode catalogue* is the Mode vitrine. "Catalogue" is a banned word in this glossary — it is a synonym for Carte — and the term was settled after that ADR was written.
