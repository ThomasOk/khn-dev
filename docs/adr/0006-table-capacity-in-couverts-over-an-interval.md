# Table capacity is counted in Couverts over an interval, not in tables

A Réservation consumes `size` **Couverts** for the whole of `[heure, heure + durée d'occupation)`, and is accepted only if no instant in that interval exceeds its Service's Capacité. The dining room's furniture — how many tables there are, how many seats each has, which one a party sits at — is **not modelled at all**. Capacity is one configured number per Service, and occupancy is a sum over overlapping intervals.

The interval is the non-negotiable half. A capacity counted per booking *time* rather than per booking *interval* sells the same table at 19h30, at 20h00 and at 20h30; it is the single most common defect in a home-grown booking system, and it is invisible until a Saturday when three parties are standing at the door.

## Why not tables

Modelling tables is more truthful and was rejected anyway. It does not stop at a list of tables: it immediately requires combining two 2-tops for a party of 4, splitting them again, reassigning parties when a booking is cancelled, and an admin floor plan to edit all of it. That is roughly three times the work, and it buys precision about a constraint that is often not the binding one — on a busy Saturday what runs out first is usually hands in the kitchen, which the table model does not represent any better than the Couvert model does.

## What this gets wrong, and how it is absorbed

Counting in Couverts **over-accepts small parties**: four bookings of 2 are 8 Couverts but occupy four tables, and the system will happily take a fifth while claiming seats remain. The error is known, bounded, and always in the same direction.

It is absorbed by a single dial rather than by a schema: the Capacité is configuration, and the restaurateur is expected to set it *below* the real seat count — 44 real seats configured as 36 — and to lower it again the first time a service was accepted full and did not fit. This is the same posture the Délai de préparation already takes: the first value will be wrong, and it must be fixable without a deploy.

The **Durée d'occupation is snapshotted onto each Réservation** rather than read back from its Service. Otherwise, changing Saturday dinner from 1h45 to 2h00 in the admin would retroactively rewrite the occupancy of every booking already confirmed, and could push a service into overbooking without a single new customer having done anything.

## Why this does not contradict ADR 0003

ADR 0003 refused to give Créneaux de retrait a capacity. This ADR gives the dining room one. The two are consistent because the reason in ADR 0003 was never "capacity is bad" — it was that **the number was unknowable**: the kitchen's real click & collect throughput cannot be guessed before a single order has been taken, and a guessed limit throttles a business that is not busy.

The dining room has no such problem. The number of chairs is a fact the restaurateur has known for years, and a full room is a constraint that already exists whether or not the software represents it. Refusing a booking is not a throttle here — it is the feature. Where ADR 0003 deferred a limit it could not yet know, this ADR records one that was known before the code was written.

## Consequences

Two customers can race for the last Couverts. Acceptance therefore recomputes occupancy and inserts inside one transaction, under a lock on the day concerned; the loser is refused rather than overbooked. This is exactly the cost ADR 0003 declined to pay for the retrait, paid here deliberately.

Adding tables later is **additive**: a table plan becomes a second constraint checked after the Couvert count, not a replacement for it. Nothing in the vocabulary or the schema has to be undone first.
