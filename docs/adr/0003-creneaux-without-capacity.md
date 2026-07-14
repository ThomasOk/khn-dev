# Créneaux de retrait have no capacity

A Créneau de retrait ("12h15–12h30") is a **label written on the order**, not a resource that can be sold out. Any number of orders may fall into the same créneau; no créneau ever disappears from the picker for being full. Créneaux are *derived* at request time from the admin-configured Horaires de retrait, minus Fermetures exceptionnelles, minus the Délai de préparation — nothing is stored per-slot.

This is a **deliberate deferral, not an oversight**, and it is recorded because "why can't a slot be full?" is the first question a future reader will ask.

## Why

Capacity is the only thing that protects the kitchen from twenty bowls all due at 12h15, and Kim-Hi Noodle **will** need it eventually — the day the site works is the day the kitchen gets swamped. But the restaurant does not yet know its real click & collect throughput, and a capacity limit guessed before a single order has been taken would throttle a business that isn't busy. The number has to come from observed orders, not from a guess.

Building it now would also cost substantially more than it looks: a créneau with capacity stops being a label and becomes a resource with finite stock, which means counting orders against it and handling two customers racing for the last spot.

## Consequences

The vocabulary is deliberately shaped so that adding capacity later is an extension, not a rewrite: Créneau is already a first-class term, and Horaires de retrait are already admin-editable and **separate from the restaurant's opening hours** (the restaurant may be open and still decline click & collect during a busy service — the system does not know its opening hours at all).

Until capacity exists, the kitchen's only protection is the Délai de préparation. Watch what actually arrives, then set a real limit.
