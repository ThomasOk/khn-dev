# The Compte is offered after the payment, never inside the checkout

A **Compte** is never required at Kim-Hi Noodle, and it is never proposed between the Carte and the paid order. It is offered on the confirmation page, once the payment is taken, and its only permanent entry point is a discreet link in the storefront header. Nothing about an account — no step, no link, no prompt — appears inside the checkout.

Medusa ships the whole of it natively: registration, login, a customer dashboard, saved addresses. The decision here is not how to build an account but where to let it interrupt, and the answer is nowhere.

## What a Compte is worth here, and what it is not

The domain gives an account almost nothing to hold. The Commande has no lifecycle, so there is nothing to follow. It is same-day and prepaid, so by the time a client could look at it, it is cooked. The Facture leaves by email the moment the payment is captured and is frozen from then on.

What remains is the retyping. The checkout demands seven required fields, including a full postal address, and it demands them of everyone — not of a professional minority — because a Facture is issued for every order and carries the client's Adresse de facturation. Sparing that is the whole of what a Compte buys, and it buys it from the second Commande onwards.

Fidélité, a one-gesture reorder, and a saved card are the three things that make an account worth a password on a restaurant site, and they are worth it because restaurant custom repeats. None of them is built and none is planned. That is recorded rather than assumed: the day a fidélité scheme is decided — a business decision, not a feature — the Compte finally has a reason to exist that this ADR did not weigh.

## Why nothing is offered inside the checkout

A step placed in the tunnel has to repay itself in the tunnel. Creating an account there repays nothing at all: the client has no history to draw on and is typing, by hand, the very fields the account would have prefilled. Offering it after the payment inverts that — the data is already captured, the account creation collapses to choosing a password, and the benefit can be named at the exact moment the client has just paid for it in effort.

Logging in inside the tunnel *would* repay something, since the checkout already prefills from the Client's `is_default_billing` address. It is refused anyway. A client who has a Compte is logged in before reaching the checkout: the header link is permanent and the account is what he passes on his way to the Carte. A second door inside the tunnel serves only the client who forgot, and it costs an exit from the tunnel to everyone else.

The Compte gates nothing, in either direction. The Carte, its prices and its ordering controls are identical logged in and logged out.

## Why the Adresse de facturation is written silently

Every Commande placed while logged in overwrites the Adresse de facturation held on the Client, and the Compte created after a payment copies the nom, téléphone and adresse from the Commande that produced it. One address, always the last one served, correctable by hand on the profile page.

The "save this address" tick box is the e-commerce standard, and it is a control over an address *book* — a home, an office, a gift recipient. There is no book here: the Client has one Adresse de facturation and it is never shipped to. Left unticked it produces exactly the empty account this decision exists to avoid, and defaults decide everything; ticked by default it is silent writing with an extra control.

Nor is the tick box the data-protection instrument it resembles. The address is already stored on the Commande and already frozen into a Facture kept for ten years. Copying it onto the Client introduces no new category of data and no purpose outside the customer relationship. What that owes is disclosure and erasure, not a checkbox.

## Why the first Commande is claimed through an email

The Compte is created after the payment, so the Commande it was born from was placed as a guest and belongs to nobody. Medusa does not attach it to an account registered afterwards with the same address, and its native transfer flow issues a token delivered to the order's own email.

A custom workflow chaining `requestOrderTransferWorkflow` and `acceptOrderTransferWorkflow` could read that token server-side and drop the email entirely, attaching the order in silence. It was considered and rejected. `GET /store/orders/:id` answers without authentication — that is precisely what makes the guest confirmation page work — so an order id is a key to a name, an address and a basket. The only check left server-side would be that the order's email matches the new account's, and registration verifies no email whatsoever: `@medusajs/auth-emailpass` has no verification concept in 2.16. The transfer email is therefore the single proof of inbox ownership anywhere in this system. Without it, a leaked confirmation link plus a registration under someone else's address hands over that person's postal address — which this same decision then copies onto a profile.

The friction was measured before being accepted, and it is bounded: one click, once, for the first Commande only. From the second onwards the cart carries the `customer_id` from the first dish added, the order is the client's natively, and nothing is ever claimed again.

## What this decision forbids

- No account step and no login link between the Carte and the paid order.
- No Compte required for anything: browsing, prices, ordering, and the Créneau are identical either way.
- No second address. Reintroducing an address book and its picker would reopen a question the domain has settled — the Client has one Adresse de facturation.
- No password that cannot be changed or recovered. Handing out passwords without a reset is a trap that springs on the first client who forgets one, so the reset is part of opening the door, not a later refinement.
