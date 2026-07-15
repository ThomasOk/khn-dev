# Kim-Hi Noodle

The restaurant's public website: it presents the dishes on offer and lets customers order them online for pickup at the restaurant (click & collect). There is no delivery and no shipping.

## Language

### The offer

**Carte**:
The set of dishes orderable online for pickup. This is the only catalogue the system knows about, and every dish in it is purchasable by definition — though not necessarily *right now* (see Commandes fermées).
_Avoid_: Menu (in English it means the whole carte, in French a Formule — too ambiguous to use for either), catalogue, boutique, store

**Carte sur place**:
The dine-in menu, a hand-made PDF served as a static file. It is not modelled, not stored in the database, and shares no data with the Carte — dishes that exist only for dine-in service (wine, for instance) have no representation in the system at all. The two can drift apart; keeping them consistent is a human habit, not a system guarantee.
_Avoid_: Carte (unqualified — always say "sur place" when you mean the PDF)

**Produit**:
One nameable item on the Carte, as the customer thinks of it — "Samoussas", not "Samoussas bœuf". The umbrella term for anything orderable, whatever section of the carte it sits in. Maps to Medusa's `Product`.
_Avoid_: Plat (means main course specifically — see below), article, item, dish

**Entrée / Plat / Dessert / Boisson**:
The sections a Carte is organised into. "Plat" means main course and nothing else — it is never the umbrella term for a carte item. Map to Medusa's `ProductCategory`.

**Variante**:
A specific, separately-priced form of a Produit that the customer picks between — Samoussas *Légumes* vs Samoussas *Bœuf*. Two variantes of the same produit may have different prices. Every Produit has at least one Variante, even when the customer is offered no choice at all, because price lives on the variante. The variante is the only thing the kitchen can actually cook: "Samoussas" is not an order, "Samoussas Bœuf" is. Maps to Medusa's `ProductVariant`.
_Avoid_: Option (in Medusa an Option is the *axis* of choice — "Garniture" — and the Variante is the combination), déclinaison, SKU

### Formules

**Formule**:
A Produit sold at a single fixed price that buys several dishes the customer picks — "Menu Midi : une entrée + un plat, 13,90 €". The price never varies with what is picked. A Formule is itself a Produit on the Carte, with exactly one Variante carrying the fixed price.
_Avoid_: Menu (means the whole carte in English — never use it for a formule), bundle, combo, pack

**Composant**:
One slot inside a Formule that the customer must fill — the "entrée" slot, the "plat" slot. Each composant offers a curated list of Variantes.

**Sélection**:
The Variantes a customer chose to fill a Formule's composants, recorded on the order line. A sélection carries **no money** — the Formule's price is fixed and owned by Medusa's pricing engine, and nothing about a sélection may alter it. This is the invariant that keeps every price in the system computed in one place.
_Avoid_: Option, supplément (a supplément would change the price — see below)

**Curation (of a composant)**:
Each Formule composant lists the Variantes allowed in it, explicitly ticked one by one. Adding a new dish to the Carte does **not** put it in any Formule until someone adds it there. This is deliberate: a dish missing from a formule is noticed and fixed in seconds, whereas a premium dish silently *appearing* in a fixed-price formule loses money invisibly.

### Le retrait

**Retrait**:
The customer collecting their paid order at the restaurant counter. The only way an order ever reaches a customer — there is no delivery and no shipping, and no address is ever shipped to. Maps to Medusa's pickup Shipping Option — the *where*, and the only part of Retrait Medusa natively models.
_Avoid_: Livraison, expédition, shipping (Medusa's `shipping_*` fields exist but never mean delivery here), click & collect (the name of the service, not of the act)

**Créneau de retrait**:
The interval the customer commits to collecting in — "12h15–12h30". Chosen at checkout and written on the order. A créneau is a **label**, not a resource: it cannot be full and cannot be sold out, so any number of orders may fall in the same one. Capacity is a property créneaux deliberately do not have yet — the kitchen's real throughput is unknown until orders start arriving, and a guessed limit would throttle a business that isn't busy. Unlike Retrait, which maps to a Medusa pickup Shipping Option, a Créneau has no native Medusa concept of its own — it rides on the order's metadata instead (ADR 0004). Do not assume it lives anywhere near the shipping method.
_Avoid_: Slot, horaire (means the schedule — see below), réservation (that's a table, a different thing entirely)

**Horaires de retrait**:
The weekly pattern of windows during which retraits are possible, editable from the admin. **Not the restaurant's opening hours** — the restaurant may be open and still not take click & collect (a Saturday-night kitchen with no hands to spare for takeaway). The system does not know the restaurant's opening hours at all, and shouldn't.
_Avoid_: Opening hours, heures d'ouverture

**Fermeture exceptionnelle**:
A period (start date, end date, both inclusive) on which no retrait is possible, overriding the weekly Horaires de retrait — a public holiday (the degenerate case of a one-day period), the August closure, a funeral. Recorded from the admin, never in code.

**Délai de préparation**:
The minimum time between an order being placed and the earliest créneau offered to that customer — the kitchen needs to cook. Configuration, not a constant in the code: the first value will be wrong and must be fixable without a deploy.
_Avoid_: Lead time, temps de préparation

**Commandes fermées**:
The state in which the Carte is browsable but nothing can be ordered, because no créneau remains today — late at night, or on a Fermeture exceptionnelle. Orders are same-day only: a customer can never order for tomorrow, which is what keeps the carte they ordered from identical to the carte the kitchen is cooking.

### La commande et ses documents

**Commande**:
A paid order for a Carte's variantes, to be collected at a chosen Créneau de retrait. It has **no lifecycle**: nobody marks it "prête" or "retirée". It arrives, it is cooked, it is handed over. Any state a human would have to remember to click during a rush is a state that will be wrong more often than right.
_Avoid_: Réservation, panier (that's the Cart, before payment)

**Ticket cuisine**:
The production document: what the kitchen cooks from. Printed on the receipt printer when the order arrives. Carries the customer's name, the Créneau, and exactly what to cook — each Variante by name, and every Sélection inside a Formule. Prices are permitted but carry no meaning here. Its binding constraint is **width**: 80mm of paper, so every line printed must earn its place.
_Avoid_: Ticket de caisse (in French that is the *customer's* receipt — which the customer never gets, since they get a Facture. The receipt printer is the medium, not the document), bon de commande

**Notification de commande**:
The email sent to the restaurant when an order arrives, carrying the Ticket cuisine as an attachment to be printed. It is a **convenience, not the record** — email lands in spam, arrives late, and goes unread during a rush. The **Medusa admin order list is the source of truth**, and checking it before service is what catches the notification that never arrived.

**Facture**:
The customer's document: proof of purchase. Carries prices, TVA and the billing address, and nothing a cook would need. Sent to the customer; never printed for the kitchen. The Facture and the Ticket cuisine are generated from the same Commande but are not two renderings of one template — a document that served both the cook and the accountant would serve neither.
_Avoid_: Reçu, ticket, note, addition

**Facture — issued and frozen**:
A Facture is issued when the payment is taken, and is **immutable from that moment**. It is never edited, never deleted, never regenerated, and its number is never reused. This is not a preference: customers use these to reclaim VAT. A Facture that silently changed is a problem with teeth. Orders are same-day and pre-paid, so nothing can legitimately change after payment anyway — freezing costs nothing.
_Avoid_: "Stale invoice", regenerating a PDF to correct it — the correction mechanism is an Avoir, not a re-render

**Numéro de facture**:
A dedicated sequential counter — chronological, no gaps. Not Medusa's `display_id`, not the order id, not a UUID. Gaps are what an inspection looks for.

**Avoir**:
A credit note: a separate, separately-numbered document that cancels an issued Facture. The **only** legal way to undo one. Refunds are rare enough at Kim-Hi Noodle that avoirs are **written by hand and filed with the facture** — there is no credit-note module, no avoir counter, and no admin UI, by decision. The concept lives here so that the next person to face a refund reaches for an avoir instead of regenerating the PDF.

**Annulation (remboursement)**:
Cancelling the Commande **in the Medusa admin** — which refunds the captured payment through Stripe automatically (`cancelOrderWorkflow` → `refundCapturedPaymentsWorkflow`). The refund is a *consequence* of the cancellation, never the trigger: refunding directly in the Stripe dashboard leaves Medusa unaware, and the subsequent cancellation would ask Stripe to refund a second time. Cancelling an order does **not** touch its Facture.

### Le client

**Client**:
The person collecting the order. May order as a guest — no account is ever required, because a hungry person at 11h50 abandons a signup form. An account is offered, never imposed.
_Avoid_: Utilisateur, compte (an account is optional and is not the client)

**Adresse de facturation**:
The client's postal address, collected for the Facture — some clients are professionals reclaiming VAT. **It is never shipped to.** Medusa's `shipping_address` field holds it, because Medusa's model assumes delivery and this one has none. No address in this system is ever a delivery address.
_Avoid_: Adresse de livraison, shipping address (the field is named that; the concept is not)

**Nom / Email / Téléphone**:
The three things a Commande genuinely needs. The **nom** is what gets called across the counter. The **email** carries the Facture. The **téléphone** is the one nobody values until the kitchen runs out of bœuf at 12h05 and must reach the client *before* the Créneau, not after.

### Not in the domain

**Supplément**:
A paid add-on to a dish (+1 € œuf). **Does not exist at Kim-Hi Noodle today**, and nothing should be built for it. Recorded here because it is the obvious thing to assume a restaurant has: it would be the first concept to put a price *outside* Medusa's pricing engine, so if it ever arrives, it needs a deliberate decision, not an ad-hoc field.
