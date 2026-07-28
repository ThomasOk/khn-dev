# 02 — Le module `availability` et la dérivation

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « Un module `availability` », § « La dérivation : une fonction pure partagée », § « Testing Decisions / Seam 1 »
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — la disponibilité s'évalue sur l'instant présent, jamais sur le Créneau ; la règle a une seule implémentation

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement.

## What to build

Le socle : de quoi enregistrer qu'un Produit n'est proposé qu'à certaines heures, et la fonction qui répond « est-il à la carte à cet instant ? ». Aucune surface client, aucune surface admin dans ce ticket — c'est 03 et 04.

**Le module.** Un module Medusa `availability` avec un unique modèle `AvailabilitySchedule`, une ligne par (Produit, jour, plage horaire), et sa migration :

| champ | type | note |
| --- | --- | --- |
| `id` | id | préfixe dédié, cohérent avec `formule` / `fcomp` |
| `product_id` | text | **colonne simple, pas de Module Link** — une ligne appartient à un Produit et à un seul, comme `Formule.product_id`. Le Link reste réservé au vrai many-to-many de la Curation |
| `day_of_week` | number | `0` = dimanche … `6` = samedi, convention `Date.getDay()`, identique à `pickup_schedule` |
| `start_time` | text | `"HH:MM"` locale `Europe/Paris`, **jamais un instant** |
| `end_time` | text | idem |
| `active` | boolean | défaut `true` |

**La dérivation.** Une fonction pure `isOnCarteAt({ schedules, now })`, sans conteneur et sans base, avec son horloge en paramètre — sur le modèle exact de `deriveSlots`. C'est la **seule** définition de la règle dans tout le système : la route Store (ticket 04) et les deux hooks de validation (ticket 07) la consommeront tous les trois, pour la même raison que `getOfferableSlots` est partagée entre la route des Créneaux et le hook de complétion — deux dérivations séparées finissent par diverger en silence.

La règle, exactement :

- `schedules` vide (aucune ligne pour ce Produit) ⇒ **à la carte**. C'est le défaut de presque toute la Carte.
- Une ligne `active: false` est ignorée.
- Une ligne compte si son `day_of_week` est le jour civil **parisien** de `now`, et si les minutes-depuis-minuit de `now` vérifient `start_time <= now < end_time` — **borne de début incluse, borne de fin exclue**. À 11h30:00 pile le Produit est à la carte ; à 14h00:00 pile il est hors carte. Cohérent avec `deriveSlots`, qui n'offre aucun créneau commençant à `end_time`.
- Plusieurs lignes ⇒ **union** : à la carte si au moins une correspond.

## Acceptance criteria

- [ ] Le modèle `AvailabilitySchedule` existe avec sa migration, dans un module `availability` dédié — ni dans `pickup` (qui porte le retrait) ni dans `formule` (la règle est attachée au Produit, pas aux Formules)
- [ ] `product_id` est une colonne texte simple ; aucun Module Link vers `Product` n'a été créé
- [ ] `isOnCarteAt` est pure : pas de conteneur, pas d'accès base, horloge passée en paramètre
- [ ] Seam 1 — tests unitaires en `*.unit.spec.ts`, sur le modèle de `derive-slots.unit.spec.ts`, couvrant : aucun horaire ⇒ à la carte ; instant **exactement** à `start_time` ⇒ à la carte ; instant **exactement** à `end_time` ⇒ hors carte ; une minute avant chaque borne ; bon jour vs jour suivant à la même heure ; ligne `active: false` ignorée, y compris seule ; deux plages le même jour dont l'union couvre un instant qu'aucune ne couvre seule
- [ ] Un test en heure d'hiver **et** un en heure d'été prouvent que `"11:30"` reste 11h30 des deux côtés du changement d'heure
- [ ] Les tests unitaires vivent sous `src/**/__tests__/*.unit.spec.ts` et **pas** sous `src/modules/*/__tests__/` (AGENTS.md — ce chemin est déjà pris par le matcher `integration:modules`)
- [ ] `pnpm test` passe
