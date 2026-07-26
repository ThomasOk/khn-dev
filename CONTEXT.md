# Kim-Hi Noodle

The restaurant's public website: it presents the dishes on offer and lets customers order them online for pickup at the restaurant (click & collect). There is no delivery and no shipping.

## Language

### The offer

**Carte**:
The set of dishes orderable online for pickup. This is the only catalogue the system knows about, and every dish in it is purchasable by definition — though not necessarily *right now* (see Commandes fermées).
_Avoid_: Menu (in English it means the whole carte, in French a Formule — too ambiguous to use for either), catalogue (and never "mode catalogue" for the state in which ordering is switched off — that is the Mode vitrine), boutique, store

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
A period (start date, end date, both inclusive) on which no retrait is possible, overriding the weekly Horaires de retrait — a public holiday (the degenerate case of a one-day period), the August closure, a funeral. Recorded from the admin, never in code. It closes **the retrait and nothing else**: the dining room keeps its own Fermeture de réservation, entered separately (ADR 0007), so the August closure has to be recorded twice, on purpose.
_Avoid_: Fermeture (unqualified — always say which of the two calendars you mean)

**Délai de préparation**:
The minimum time between an order being placed and the earliest créneau offered to that customer — the kitchen needs to cook. Configuration, not a constant in the code: the first value will be wrong and must be fixable without a deploy.
_Avoid_: Lead time, temps de préparation

**Commandes fermées**:
The state in which the Carte is browsable but nothing can be ordered, because no créneau remains today — late at night, or on a Fermeture exceptionnelle. Orders are same-day only: a customer can never order for tomorrow, which is what keeps the carte they ordered from identical to the carte the kitchen is cooking.
It is **derived, never decided**: nobody switches it on, it is what the absence of créneaux *is*. The customer meets it at checkout, where the créneaux are chosen — the Carte itself keeps its ordering controls. The state a human switches on is the Mode vitrine, and the two are deliberately not the same thing.

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

### La réservation de table

**Réservation**:
The restaurant's commitment to seat a stated number of Couverts at a stated Heure de réservation, confirmed to the customer immediately and unconditionally. It is a **promise, not a request**: no human approves it afterwards, and what the site confirms the restaurant owes. It shares nothing with a Commande — no Cart, no payment, no Carte, no Créneau de retrait, and its own separate calendar. Maps to `TableReservation`.
_Avoid_: Commande, réservation de créneau, booking; and beware Medusa's inventory `Reservation`, which holds stock and is an unrelated concept that happens to share the word

**Couvert**:
One seated diner. The unit in which both a Réservation's size and a Service's Capacité are expressed. A Couvert is not a table: the system does not know that tables exist (ADR 0006).
_Avoid_: Personne, place, siège, table

**Service**:
A recurring named window during which the restaurant seats customers — "Déjeuner, mardi, 12h00–14h00". Where an Horaire de retrait is only hours, a Service also carries its **own Capacité and its own Durée d'occupation**, because a Tuesday lunch and a Saturday dinner differ in both. The last bookable Heure is derived from the Service's end, never entered by hand. Maps to `ServiceWindow`.
_Avoid_: Horaire (that is the retrait's weekly pattern), créneau, sitting, `Service` alone in code (a Medusa module's service is a different thing entirely)

**Capacité**:
The number of Couverts a Service can seat simultaneously. **Configuration, not a measurement of the dining room** — it is expected to be set *below* the real number of seats and lowered again the first time a full house was accepted, because counting in Couverts over-accepts small groups (ADR 0006). One number decides whether the whole system is too permissive or too strict.
_Avoid_: Nombre de places, capacity of the restaurant (it belongs to a Service, not to the building)

**Heure de réservation**:
The instant the customer commits to arriving at — "19h30". It is the only thing about the timing the customer chooses. Contrast with a Créneau de retrait, which is an *interval* the customer picks: here the interval is the restaurant's business, not the client's.
_Avoid_: Créneau (that word means the retrait, always), plage horaire

**Durée d'occupation**:
How long a Réservation holds its Couverts, counted from the Heure de réservation. It belongs to the Service and to the restaurant — the customer neither chooses it nor is shown it. It is **copied onto the Réservation** when the Réservation is taken, so that re-tuning a Service later never rewrites the occupancy of tables already promised.
_Avoid_: Turn time, temps de table, durée de réservation (the customer reserves an hour, never a duration)

**Fermeture de réservation**:
A period on which no Réservation is possible, overriding that period's Services. Deliberately **not the same object as a Fermeture exceptionnelle**, which closes the retrait: the two calendars are separate and are entered separately (ADR 0007), which is what lets a privatised evening close the dining room while click & collect carries on.

**Annulation (réservation)**:
The customer releasing their Réservation from the link in their confirmation email, at any moment **up to the Heure de réservation** — there is no cut-off, because a cancellation at 19h25 for 19h30 is still worth infinitely more than an empty table nobody expected. It is the only state change a Réservation ever has: a Réservation is `confirmée` or `annulée`, and nothing else (ADR 0008). Modifying a Réservation is not possible — one cancels and books again.

**Feuille de service**:
The dining room's production document: one day's Réservations by ascending Heure, with the nom, the number of Couverts and the téléphone. The counterpart of the Ticket cuisine — read standing up, carries no prices, and is a rendering of **the day**, never of a single Réservation.
_Avoid_: Livre de réservations (that is the whole register, not one day's), plan de salle (that would be tables, which are not modelled)

### L'annonce

**Annonce**:
A free message the restaurant shows to visitors on the storefront — an upcoming Fermeture exceptionnelle, a new dish, a recruitment notice. It is **written by a human and owes nothing to the rest of the system**: it derives from no Fermeture, no Produit and no Créneau, and when it happens to say something the system already knows, that is a coincidence, not a link. It changes nothing a client can do — an Annonce that says "fermé le 15 août" does not close anything, and the Fermeture exceptionnelle that actually does is entered separately.
It **cannot be dismissed**: there is no close button, and a visitor who returns during the Période d'annonce sees it again every time. That is a deliberate trade of comfort for reach, and it is what makes a short Période d'annonce a requirement rather than a preference — an unremovable bandeau is only tolerable while it is brief.
_Avoid_: Notification (that is the email sent to the restaurant when an order arrives), bannière (the placement, not the thing), actualité, news, promotion, popup

**Accroche / Corps**:
An Annonce is two pieces. The **accroche** is one short sentence, always displayed, and its length is capped by the domain rather than by the design: past two lines the eye reads a bandeau as a block of content and skips it, so a longer accroche does not communicate more, it communicates less. The **corps** is optional, of any length, and the client opens it only if the accroche earned the click. Most Annonces have no corps at all. A corps has **no address of its own** — it is not a page, cannot be linked to, and is not indexed: anything meant to be shared elsewhere is written again, for that channel.
_Avoid_: Titre (an accroche is a sentence, not a label), article, contenu, "en savoir plus" as a concept (it is a control, not a term)

**Période d'annonce**:
The civil days, both bounds inclusive, during which an Annonce is displayed. **Both bounds are mandatory** — there is no Annonce without an end. The stale banner is the failure mode with teeth here: an Annonce left up past its moment does not merely stop being useful, it teaches every visitor that this bandeau never says anything worth reading, and the credibility it burns is spent on all the later ones. An Annonce that expires too early costs nothing by comparison — the site simply looks normal — so the asymmetry is settled in favour of expiry.
It is **not** the period it talks about: an August closure running 10–20 is announced from the 1st and stays up through the closure itself, so its Période d'annonce is 1–20. The two never coincide, which is one more reason an Annonce cannot be derived from a Fermeture.

**Une seule à la fois**:
At most one Annonce is displayed, ever. Two stacked bandeaux each destroy the other's authority — two "important" messages side by side are zero important messages — and a rotating one loses its audience after the first slide. So overlapping Périodes d'annonce are **refused at entry**, in the admin, rather than silently resolved in favour of one of them: an Annonce that was published and never appeared is not diagnosable from the storefront.

### La vitrine

**Mode vitrine**:
The state a human switches on to stop taking orders **immediately**, whatever the Horaires de retrait and the Créneaux would otherwise allow — a broken fryer, a cook who did not come in, a delivery that never arrived. The Carte stays entirely browsable, prices included; every way of ordering disappears, and no payment can go through, not even from a page that was already open. It suspends **the click & collect and nothing else**: the dining room keeps taking Réservations, and closing it is a Fermeture de réservation, a separate gesture (ADR 0007).
It is **decided, never derived** — it reads no Créneau, no Fermeture and no Annonce — and it neither switches itself on nor off (ADR 0010).
_Avoid_: Mode catalogue (catalogue is a banned word — see Carte; ADR 0009 used it before the term was settled), mode maintenance, boutique fermée, and Commandes fermées, which is the *derived* state and a different thing

**Note de vitrine**:
The optional sentence the restaurant writes to explain a Mode vitrine — "Les commandes ne sont pas possibles pour le moment". It is shown only while the mode is on, in the page and next to the ordering it replaces, and it dies with the switch.
It is **not an Annonce**: no period, no corps, no link, never sitewide, and it speaks about one thing only — the ordering that just disappeared. A restaurant with something else to say writes an Annonce, which the Mode vitrine neither reads nor writes. Nothing forces the note to exist: a Mode vitrine with no note is a Carte with no ordering and no explanation, which is allowed and is the reason the admin form offers a sentence rather than demanding one.
_Avoid_: Annonce, bandeau, message

### Not in the domain

**Table (le meuble)**:
The actual furniture, its seats, and which Réservation sits at it. **Not modelled, deliberately** — capacity is counted in Couverts over an interval instead (ADR 0006). Recorded here because "where is the table plan?" is the first question a future reader will ask, and because the answer is a decision, not a gap.

**No-show**:
A Réservation whose customer never came. It happens, it costs money, and the system **does not record it** (ADR 0008): a measurement is only worth taking when something can be done with it, and every lever against no-shows (deposit, blacklist) needs a durable customer identity that this domain refuses to require.

**Supplément**:
A paid add-on to a dish (+1 € œuf). **Does not exist at Kim-Hi Noodle today**, and nothing should be built for it. Recorded here because it is the obvious thing to assume a restaurant has: it would be the first concept to put a price *outside* Medusa's pricing engine, so if it ever arrives, it needs a deliberate decision, not an ad-hoc field.
