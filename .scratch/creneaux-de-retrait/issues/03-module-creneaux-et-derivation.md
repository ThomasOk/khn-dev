# 03 — Le module `creneaux` et la dérivation à horloge injectée

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « Le module `creneaux` », § « La dérivation, et le fuseau horaire », § « Seam 2 »
**ADR :** [0003](../../../docs/adr/0003-creneaux-without-capacity.md) — un créneau n'a pas de capacité

**Status:** ready-for-agent

**Blocked by:** 02 (bootstrap des tests) — la dérivation naît test-first, elle n'a pas de sens autrement.

## What to build

Le système ne sait rien de la disponibilité du restaurant : il ignore les **Horaires de retrait**, les **Fermetures exceptionnelles** et le **Délai de préparation**. Ce ticket construit la connaissance qui manque, et le calcul qui en tire les créneaux offrables.

Ce ticket n'a **aucune surface** : il ne se démontre pas dans un navigateur, il se démontre par ses tests. C'est assumé — c'est le cœur de la feature, et la tranche verticale qui l'expose est le ticket 04. Il est sorti à part parce que la dérivation mérite d'être attaquée test-first sans qu'une route vienne brouiller le seam.

**Le module est propriétaire de la configuration du retrait — jamais des créneaux eux-mêmes, qui ne sont pas stockés** (ADR 0003). Un créneau est un label, pas une ressource : il ne peut pas être plein, et rien ne le compte.

Trois modèles :

- **`HoraireRetrait`** — une plage hebdomadaire récurrente : jour de la semaine, heure de début, heure de fin (des **heures locales**, pas des instants), et un drapeau actif. Plusieurs lignes peuvent viser le même jour : c'est ce qui donne le service du midi et celui du soir.
- **`FermetureExceptionnelle`** — une date (un **jour civil**, pas un instant) et un motif optionnel. Écrase les Horaires de ce jour-là, intégralement.
- **`ConfigurationRetrait`** — une ligne unique portant le **Délai de préparation** (minutes) et la **durée d'un créneau** (minutes). La durée d'un créneau n'est pas un concept du domaine : c'est le pas de découpage d'une plage d'Horaires, et sa place est ici, en configuration.

## La contrainte de conception la plus importante du spec

La dérivation est une **fonction pure, isolée du module, à horloge injectée**. Le
code est en anglais (`deriveSlots`), le vocabulaire métier reste français — voir
la correspondance des noms plus bas.

```ts
deriveSlots(input: {
  schedules: PickupScheduleInput[]      // Horaires de retrait
  closures: ClosureInput[]              // Fermetures exceptionnelles
  config: PickupConfigInput             // Configuration du retrait
  now: Date                             // « maintenant » — TOUJOURS injecté, jamais un `new Date()` à l'intérieur
}): Array<{ start: Date; end: Date }>   // les créneaux
```

**Aucun `new Date()`, aucune lecture d'horloge système, nulle part sous cette fonction.** C'est ce qui rend le changement d'heure testable — sans quoi il faudrait attendre le mois d'octobre pour vérifier le bug le plus probable de la fonctionnalité.

**Le fuseau du restaurant fait autorité, et lui seul.** `Europe/Paris` est la référence, exposée comme une **constante unique et partagée**. Le fuseau du navigateur du client ne décide de rien.

Un créneau est offrable si, et seulement si : il tombe dans une plage d'Horaires **active** ; son jour n'est pas une **Fermeture exceptionnelle** ; et son début est postérieur à `maintenant + Délai de préparation`. Les commandes sont **same-day** : la dérivation ne regarde que la journée en cours, jamais demain.

## Correspondance des noms (code en anglais)

Le vocabulaire métier reste français ; le code est en anglais. Ce qui a été construit :

| Domaine (FR) | Code (EN) | Emplacement |
| --- | --- | --- |
| module `creneaux` (config seule) | module `pickup` | `apps/backend/src/modules/pickup/` |
| `HoraireRetrait` | `PickupSchedule` (table `pickup_schedule`) | `models/pickup-schedule.ts` |
| — jour de la semaine / début / fin / actif | `day_of_week` (0=dim..6=sam) / `start_time` / `end_time` / `active` | |
| `FermetureExceptionnelle` | `Closure` (table `pickup_closure`) | `models/closure.ts` |
| — date / motif | `date` (`YYYY-MM-DD`) / `reason` | |
| `ConfigurationRetrait` | `PickupConfig` (table `pickup_config`) | `models/pickup-config.ts` |
| — Délai de préparation / durée d'un créneau | `prep_delay_minutes` / `slot_duration_minutes` | |
| `deriverCreneaux` | `deriveSlots` (fonction pure, hors module) | `apps/backend/src/lib/slots/derive-slots.ts` |
| `Créneau { debut, fin }` | `Slot { start, end }` | |
| `maintenant` | `now` | |
| fuseau `Europe/Paris` | `RESTAURANT_TIMEZONE` | `apps/backend/src/lib/slots/timezone.ts` |

Tests unitaires : `apps/backend/src/lib/slots/__tests__/derive-slots.unit.spec.ts` (hors
`src/modules/*/__tests__/`, réservé au runner `integration:modules`).

## Acceptance criteria

- [x] Les trois modèles existent avec leur migration, et le module ne stocke **aucun créneau** — seulement de la configuration
- [x] `deriveSlots` est une fonction pure, isolée du module, dont `now` est un paramètre ; aucun `new Date()` ni lecture d'horloge système n'existe sous elle
- [x] Le fuseau `Europe/Paris` est exposé comme une constante unique et partagée (`RESTAURANT_TIMEZONE`), pas répété en dur
- [x] Tests unitaires (`TEST_TYPE=unit`), avec `now` injecté, couvrant : un créneau en heure d'**été** et le même en heure d'**hiver** ; **le dimanche du changement d'heure dans les deux sens** (fin mars et fin octobre) ; un créneau **à cheval sur le Délai de préparation** (juste avant / juste après la limite) ; une **Fermeture exceptionnelle** sur le jour courant ; un jour **sans aucun Horaire** ; **deux services** dans la même journée (midi et soir) ; **la fin de service** — le dernier créneau offrable, puis plus rien
- [x] Les tests assertent sur le **comportement observable** (les créneaux rendus), jamais sur les méthodes internes du module
