# 03 — Le restaurateur saisit ses Horaires de disponibilité

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « L'admin : un widget sur la fiche Produit », User Stories 1–11
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — § *Consequences*, « A new `availability` module, edited from a widget on the Produit's detail page » ; [0007](../../../docs/adr/0007-separate-closing-calendars-per-module.md) — les calendriers ne se dérivent pas les uns des autres

**Status:** ready-for-agent

**Blocked by:** 02 (le modèle `AvailabilitySchedule` doit exister).

## What to build

De quoi saisir, depuis l'admin, les heures auxquelles un Produit est proposé — sans redéploiement et sans republier le Produit.

**Où.** Un widget sur la fiche de détail d'un Produit, sur **tous** les Produits et pas seulement les Formules. La règle est attachée au Produit ; la restreindre aux Formules serait un couplage arbitraire à défaire au premier plat du midi hors formule. « Aucun horaire » reste le défaut, donc le widget ne coûte rien aux dizaines de Produits qui n'en auront jamais.

Ce n'est **pas** une page de réglages globale : la spec Formules a déjà tracé cette ligne pour la Curation — « contrairement aux Horaires de retrait (configuration globale du restaurant), la Curation est une propriété d'une Formule précise » — et un Horaire de disponibilité tombe du même côté. La question « quand est servi le Menu Midi ? » se pose là où on regarde le Menu Midi.

**Quoi.** Lister les plages groupées par jour, dans l'ordre jour puis heure de début. Créer, modifier, supprimer, activer/désactiver. Plusieurs plages le même jour sont permises — c'est ce qui exprime un produit servi au déjeuner **et** au dîner.

**Comment.** La forme et l'ergonomie recopient la section des Horaires de retrait du module `pickup`, `Select` mono-jour compris. Deux écrans qui font la même chose doivent se manipuler de la même façon ; inventer ici une saisie multi-jours créerait deux ergonomies pour un seul geste, et l'écran voisin resterait en arrière. Le prix — sept lignes pour « tous les jours » — est celui que les Horaires de retrait paient déjà.

**Les routes**, sur le modèle de celles de la Curation (`/admin/formules/[product_id]/composants`) :

- `GET | POST /admin/availability/[product_id]/schedules`
- `POST | DELETE /admin/availability/[product_id]/schedules/[id]`

Les écritures passent par des **workflows**, sur le modèle de ceux qui gèrent les Horaires de retrait — pas d'appels de service enchaînés dans une route.

**La validation** recopie celle des Horaires de retrait : `day_of_week` entier 0–6, `start_time` / `end_time` sur la regex `HH:MM` 24h, `active` booléen optionnel, et le refus de `end_time <= start_time`. Les **chevauchements sont autorisés** et simplement unis — contrairement aux Périodes d'annonce, refusées à la saisie : deux Annonces qui se chevauchent s'annulent l'une l'autre sans que ce soit diagnosticable, alors que deux Horaires qui se chevauchent donnent exactement ce que le restaurateur voit.

## Acceptance criteria

- [ ] Un widget sur la fiche de détail de **tout** Produit liste ses Horaires de disponibilité, groupés par jour, triés par jour puis heure de début
- [ ] Créer, modifier, supprimer et activer/désactiver une plage fonctionnent depuis ce widget
- [ ] Plusieurs plages sur le même jour sont acceptées
- [ ] Une plage dont l'heure de fin est antérieure **ou égale** à l'heure de début est refusée, avec un message lisible
- [ ] Des plages qui se chevauchent sont acceptées
- [ ] Une plage désactivée reste visible et modifiable dans l'admin
- [ ] Les écritures passent par des workflows, jamais par des appels de service directs depuis une route
- [ ] Les modifications sont prises en compte sans redéploiement et sans republier le Produit
- [ ] Vérification à la main dans l'admin (dev server) — pas de test HTTP automatisé pour ce CRUD, même précédent que le module `pickup` et que l'écran de Curation
