# 05 — La page de réglages admin : Horaires, Fermetures exceptionnelles, Configuration

**Spec :** [docs/specs/creneaux-de-retrait.md](../../../docs/specs/creneaux-de-retrait.md) — § « L'admin »

**Status:** ready-for-agent

**Blocked by:** 03 (le module — c'est sa configuration qu'on édite).

## What to build

Le restaurateur règle lui-même ses **Horaires de retrait** de la semaine, ses **Fermetures exceptionnelles** et sa **Configuration** (Délai de préparation, durée d'un créneau) depuis l'admin.

C'est ce ticket, et lui seul, qui rend vraie la phrase du glossaire : *« Configuration, not a constant in the code : the first value will be wrong and must be fixable without a deploy. »* Le Délai de préparation par défaut installé au ticket 04 **sera faux** — le restaurateur découvrira sa vraie valeur en encaissant des commandes, et il doit pouvoir la corriger un mardi midi, pas attendre un déploiement.

Ce que la page doit permettre :

- Définir les Horaires de retrait **pour chaque jour de la semaine**, avec **plusieurs plages possibles dans une même journée** — c'est ce qui sépare le service du midi de celui du soir.
- Les Horaires de retrait sont **distincts des heures d'ouverture** : le restaurant peut être ouvert et refuser le click & collect (un samedi soir sans mains pour le comptoir). Le système ne connaît pas les heures d'ouverture et ne doit pas les demander.
- Déclarer une **Fermeture exceptionnelle** sur une date, avec un motif optionnel : un jour férié, la fermeture d'août.
- Régler le **Délai de préparation** et la **durée d'un créneau**.

Aucun cache : la configuration est relue à chaque dérivation, donc une modification prend effet **immédiatement** sur le site. Le restaurateur ne doit jamais continuer à vendre des créneaux qu'il vient de supprimer.

Le fuseau du restaurant fait autorité ici aussi : les heures saisies sont des **heures locales** du restaurant, pas des instants.

## Acceptance criteria

- [ ] Une page de réglages dans l'admin permet de créer, modifier et supprimer des Horaires de retrait, avec **plusieurs plages sur un même jour**
- [ ] Elle permet de déclarer et de supprimer une Fermeture exceptionnelle sur une date, avec un motif optionnel
- [ ] Elle permet de régler le Délai de préparation et la durée d'un créneau
- [ ] Les valeurs saisies sont persistées et relues telles quelles après un rechargement de la page
- [ ] La configuration est relue à chaque dérivation (aucun cache) : une plage supprimée cesse d'être proposée sans redémarrage ni déploiement
- [ ] Vérification à la main : conformément au spec, aucune infra de test React n'existe et il n'en est pas mis en place ici
