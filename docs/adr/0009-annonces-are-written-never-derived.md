# An Annonce is written, never derived

An Annonce is free text a human types. It is **not generated from anything the system already knows** — not from a Fermeture exceptionnelle, not from the `plat-du-moment` collection, not from the state of the Créneaux. Announcing the August closure means writing a sentence, in a screen that has no connection to the one where the closure was recorded, in addition to recording the closure itself.

## Why this is surprising enough to record

A future reader will find `pickup_closure` carrying a `reason` field, and a `plat-du-moment` collection already driving a whole section of the home page, and will reasonably conclude that the bandeau should simply render them. It could have. That option was considered first and rejected, so the reasoning needs to survive.

## Why an Annonce is not a rendered Fermeture

**The two periods are not the same period, and never can be.** A closure running 10–20 August must be announced from the 1st, and must stay on screen *through* the closure for the customer arriving on the 15th. Its Période d'annonce is 1–20 while the Fermeture is 10–20. A derived bandeau would therefore need its own announcement window bolted onto the Fermeture — at which point the Fermeture is carrying two unrelated periods and the derivation has bought nothing.

**Not every closure is worth saying out loud, and not everything worth saying is a closure.** A single Tuesday off does not deserve a sitewide bandeau; a recruitment notice, a new dish, a change of hours deserve one and correspond to no closure at all. Derivation makes the first case impossible to suppress and the second impossible to express.

**`reason` is an internal note, not a sentence addressed to a customer.** It exists so the person editing the calendar in six months knows why a period is closed — "congés", "décès". Promoting it to public copy would silently change what it is for, and the first person to type "chiant mais obligé" into it would find out publicly.

The deeper distinction: a Fermeture exceptionnelle is an **operational fact** that removes créneaux, and an Annonce is an **act of speech**. Tying speech to a fact means the restaurant can only say things the system already believes.

## Why the mise en valeur of a dish is not one either

That need is already met, by different machinery: `plat-du-moment` is a Medusa Collection rendered as a full section of the home page (`apps/storefront/src/modules/home/components/dish-of-moment/`), with the photo, the price and a link to order. It is better at that job than a one-line bandeau will ever be. The Annonce's optional link points *at* that work rather than duplicating it.

## Consequences

Three independent mechanisms can now say "you cannot order": the **Fermeture exceptionnelle** (removes the créneaux), the **Mode catalogue** (disables the panier), and an **Annonce** that says so in words. Nothing keeps them in agreement. It is entirely possible to display "Fermé le 15 août" over a working panier, or to disable ordering with nothing on screen explaining why.

This is the same shape of cost as ADR 0007, taken knowingly for the same reason: each mechanism stays readable, testable and removable on its own. And as in ADR 0007, it is mitigated **in the admin UI rather than in the domain** — one screen showing the three states together, so a human can see the disagreement — not by making one of them derive from another.

The failure is silent from the storefront's side, which is why it is written down here.

---

> **Note (2026-07-26)** — the *Mode catalogue* named above is now called the **Mode vitrine**: "catalogue" is a banned synonym for Carte in the glossary, and the term was settled after this ADR was accepted. See [ADR 0010](./0010-mode-vitrine-is-switched-by-a-human-only.md). The reasoning above is unaffected.
