# 03 — La Sélection survit jusqu'à la commande et s'affiche dans le panier

**Spec :** [docs/specs/formules.md](../../../docs/specs/formules.md) — User Stories 11 et 13, § Testing Decisions « Seam 2 »
**ADR :** [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — la chaîne panier → commande, et la non-fusion de deux Formules aux Sélections différentes

**Status:** ready-for-agent

**Blocked by:** 02 (il faut que la Sélection s'écrive avant de pouvoir prouver qu'elle survit et de l'afficher).

## What to build

Le panier peut déjà contenir une Formule avec sa Sélection (ticket 02), mais rien ne la rend visible au client, et rien ne prouve encore — sur une vraie base, pas seulement sur une lecture de code — qu'elle traverse le paiement intacte.

**L'affichage dans le panier.** Chaque ligne de Formule dans le panier affiche, lisiblement, ce qui a été choisi par Composant (`label` → nom de la Variante) — pas la metadata brute.

**Le test le plus précieux de ce ticket.** Une Sélection valide survit **verbatim** jusqu'à `order.items[].metadata` au passage `POST /store/carts/:id/complete` — le mécanisme est natif (`completeCartWorkflow` recopie `cart.items[].metadata` sans le toucher, ADR 0005), mais c'est ici qu'on le vérifie contre une vraie base disposable plutôt que de le supposer.

**Le second test qui compte autant.** Deux Formules identiques (même Produit, même Variante de Formule) mais aux Sélections différentes, ajoutées au même panier, restent **deux lignes distinctes** — jamais fusionnées en une ligne `quantity: 2` qui perdrait l'une des deux Sélections. C'est le point que la recherche a vérifié en JS pur ; ce ticket le vérifie en conditions réelles.

## Acceptance criteria

- [ ] Le panier affiche, par ligne de Formule, la Sélection lisiblement (Composant → nom de Variante), jamais la metadata brute
- [ ] Test d'intégration HTTP : une Formule avec une Sélection valide, complétée en commande, porte la même Sélection **verbatim** sur `order.items[].metadata`
- [ ] Test d'intégration HTTP : deux Formules identiques aux Sélections différentes dans le même panier restent deux lignes distinctes après complétion (jamais fusionnées, jamais l'une des deux Sélections perdue)
- [ ] Les tests interrogent les routes et regardent ce qui a été persisté ; ils n'assertent ni sur les méthodes internes du module, ni sur l'ordre des étapes du workflow
