# Formules are flat-priced Produits, and Sélections carry no money

A Formule ("Menu Midi : une entrée + un plat, 13,90 €") lets the customer pick several dishes for one price. Medusa v2 has no native bundle concept, so this had to be modelled. We model a Formule as an ordinary **Produit with a single Variante carrying the fixed price**; the customer's picks are recorded as **Sélections on the order line, carrying no price of their own**. Each Formule Composant ("the entrée slot") offers an explicitly curated list of Variantes.

The invariant this protects: **every euro in the system is computed by Medusa's pricing engine, and nothing else.** No code anywhere adds, adjusts, or derives a price. Given that prices are tax-inclusive (TTC), any second place that computes money is a place where VAT arithmetic silently disagrees with itself.

## Considered options

**A variant matrix** — Formule as a Product whose Options are its slots (Option "Entrée" × Option "Plat"), one Variante per combination. This is fully native and would price each combination independently. Rejected because the Formule price is **flat**: the matrix would buy us a pricing capability we have no use for, at the cost of dozens of hand-maintained combinations that grow multiplicatively every time a dish is added to the carte. *If the price ever stops being flat, this becomes the right answer again* — metadata cannot express a price that varies with the choice.

**A bundle module / promotion-based composition** — the customer adds real dishes to the cart and a promotion discounts them to the formule price. Rejected because the customer never sees a thing called "Menu Midi", and the price stops being a number Medusa owns outright.

## Consequences

Composants are **curated, not derived** — a new dish added to the Carte does *not* appear in any Formule until someone explicitly ticks it. This is a permanent, deliberate chore. It was chosen over "all dishes in a category, minus exclusions" because the two fail in different directions: a dish *missing* from a formule is noticed and fixed in seconds, whereas a premium dish silently *appearing* inside a fixed-price formule loses money invisibly.

A Sélection references a **Variante**, never a Produit — "Samoussas" is not something a kitchen can cook; "Samoussas Bœuf" is.
