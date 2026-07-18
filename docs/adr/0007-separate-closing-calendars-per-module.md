# The retrait and the dining room keep separate closing calendars

The `pickup` module owns Horaires de retrait and Fermetures exceptionnelles; the `table-reservation` module owns its own Services and its own Fermetures de réservation. **They share no table, no row and no code.** Closing the restaurant for the August holiday means recording it twice, in two admin screens.

## Why

Each module owning its own opening rules is what makes either of them readable, testable and removable on its own, and it is the repo's standing rule that modules never reach into one another (`AGENTS.md`: "No direct cross-module access"). A closure table read by two modules would be a shared mutable dependency between two features that otherwise have nothing to do with each other.

It also happens to be more expressive, and in the direction the restaurant actually needs. The two channels close for different reasons far more often than they close together: a privatised evening takes the dining room while click & collect carries on, a short-staffed kitchen drops takeaway while table service continues normally. A single shared calendar cannot say either of those things.

A scoped closure — one row with a `retrait | salle | les deux` field — was considered and would have been equally expressive. It was rejected for the ownership reason above, not for a functional one: it would have forced the Fermeture out of `pickup` into some shared "restaurant" module that no other concept needs, coupling the two features through a table neither of them fully owns.

## Consequences

The cost is real and it is a **silent** one: someone records the August closure on the retrait, forgets the dining room, and the site keeps taking bookings for a shuttered restaurant. Nobody finds out until a customer is standing outside. This is the failure mode this decision buys, and it is worth stating plainly because it will happen.

It is mitigated **in the admin UI, not in the domain** — a single "Fermetures" page showing both calendars side by side and flagging a period present in one and absent from the other. That keeps the coupling where it belongs, in a screen a human reads, rather than putting back the shared table this decision just removed.

The vocabulary was sharpened to match: *Fermeture exceptionnelle* now explicitly means the retrait's closure and nothing else, and *Fermeture de réservation* is a separate glossary term. "Fermeture" unqualified is ambiguous from now on and should not be used.
