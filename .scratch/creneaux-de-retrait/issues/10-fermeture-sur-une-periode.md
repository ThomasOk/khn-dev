# 10 — La Fermeture exceptionnelle sur une période

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « Le module `creneaux` », § « L'admin »
**Glossaire :** [CONTEXT.md](../../../CONTEXT.md) — entrée « Fermeture exceptionnelle »

**Status:** ready-for-agent

**Blocked by:** 03 (le module — c'est son modèle qu'on étend), 05 (la page de réglages admin — c'est son UI qu'on modifie).

## Contexte

Le ticket 05 a livré une Fermeture exceptionnelle portant **une seule date**. Le spec et le glossaire citent pourtant *« la fermeture d'août »* comme exemple d'usage — une période de plusieurs jours, pas un jour isolé. Aujourd'hui, fermer deux semaines demande de créer quatorze lignes indépendantes une par une dans l'admin : ça marche, mais ces quatorze lignes ne savent pas qu'elles appartiennent à la même fermeture, et rien ne permet de les éditer ou de les supprimer d'un geste.

Ce ticket aligne le modèle sur l'usage réel : une Fermeture exceptionnelle devient une **période** (date de début, date de fin), le jour isolé — un jour férié — restant le cas dégénéré où les deux dates sont identiques.

## What to build

### Le modèle

`Closure` perd sa colonne `date` (unique) au profit de deux colonnes :

- `start_date` — jour civil `YYYY-MM-DD`, comme aujourd'hui.
- `end_date` — jour civil `YYYY-MM-DD`, toujours postérieur ou égal à `start_date`.

Un jour férié reste représentable : `start_date === end_date`.

Aucune donnée existante à préserver — le seed ne crée aucune Fermeture, la migration peut remplacer la colonne sans logique de reprise.

### La dérivation

`deriveSlots` (`src/lib/slots/derive-slots.ts`) compare aujourd'hui `closures.some(c => c.date === todayKey)`. Le remplacer par un test d'intervalle, bornes incluses : `todayKey >= c.start_date && todayKey <= c.end_date`.

Les jours civils restent des chaînes `YYYY-MM-DD` : leur ordre lexicographique est leur ordre chronologique, donc la comparaison reste une comparaison de chaînes — **aucun `Date` construit**, la règle la plus importante du spec ne bouge pas.

### La validation d'un chevauchement

Le ticket 05 a ajouté, dans le workflow de création (`src/workflows/pickup/manage-closures.ts`), un contrôle qui rejette une seconde Fermeture sur une date déjà fermée, avec un message clair plutôt qu'une erreur Postgres brute. Ce contrôle doit devenir un test de **chevauchement de périodes** : deux intervalles `[a, b]` et `[c, d]` se chevauchent si et seulement si `a <= d && c <= b`. Même emplacement, même esprit — un check-then-insert dans le step, pas une contrainte base de données : l'admin est mono-opérateur, la fenêtre de course n'est pas un risque réel ici.

### L'admin

- `middlewares.ts` (`src/api/admin/pickup/`) : `CreateClosureSchema` porte `start_date` et `end_date` (au lieu de `date`), avec un `.refine` qui rejette `end_date < start_date` — le même garde-fou que celui déjà posé sur les Horaires de retrait pour `start_time`/`end_time`.
- `closures-section.tsx` : la modale de création affiche deux champs de date (début, fin) plutôt qu'un seul. L'affichage d'une Fermeture existante distingue les deux cas : `15/08/2026` pour un jour isolé, `01/08/2026 – 15/08/2026` pour une période.
- La suppression reste un geste unique : une période est une ligne, sa suppression rouvre toute la période d'un coup.

### La documentation

L'entrée « Fermeture exceptionnelle » de `CONTEXT.md` décrit aujourd'hui *« a specific date »* — à corriger pour décrire une période, en gardant les exemples existants (jour férié, fermeture d'août, où le jour férié illustre le cas dégénéré).

## Correspondance des noms (code en anglais)

| Domaine (FR) | Code (EN) |
| --- | --- |
| Fermeture exceptionnelle — début / fin de la période | `Closure.start_date` / `Closure.end_date` |

## Testing Decisions

Même répartition que le reste du spec — pas de nouvelle infra, on étend les seams existants :

- **Seam 2 (unitaire, `deriveSlots`)** : adapter le cas de Fermeture déjà couvert au nouveau contrat `{ start_date, end_date }` ; ajouter une Fermeture **multi-jours** couvrant aujourd'hui ; ajouter les deux bornes — le jour **juste avant** le début de la période (encore ouvert) et le jour **juste après** la fin (de nouveau ouvert).
- **Seam 1 (intégration HTTP, `pickup-slots.spec.ts`)** : le test existant `pickup().createClosures({ date: parisDateKey(now) })` passe à `{ start_date: parisDateKey(now), end_date: parisDateKey(now) }`.
- **L'admin** reste vérifié à la main, conformément au spec : aucune infra de test React n'existe et il n'en est pas mis en place ici.

## Acceptance criteria

- [ ] `Closure` porte `start_date` et `end_date` (jours civils) au lieu d'une `date` unique ; un jour isolé est le cas dégénéré `start_date === end_date`
- [ ] `deriveSlots` considère aujourd'hui fermé si `todayKey` tombe dans `[start_date, end_date]`, bornes incluses — sans construire de `Date`
- [ ] La création d'une Fermeture rejette tout chevauchement avec une Fermeture existante, avec un message explicite plutôt qu'une erreur de contrainte brute
- [ ] L'admin permet de déclarer une Fermeture sur une période (date de début, date de fin, motif optionnel) et de la supprimer en un seul geste
- [ ] Les tests unitaires de `deriveSlots` couvrent une Fermeture multi-jours et ses deux bornes
- [ ] Le test d'intégration HTTP de la Fermeture est adapté au nouveau contrat et reste vert
- [ ] `CONTEXT.md` décrit la Fermeture exceptionnelle comme une période, pas une date unique
- [ ] Vérification à la main de l'admin, conformément au spec : aucune infra de test React n'existe et il n'en est pas mis en place ici
