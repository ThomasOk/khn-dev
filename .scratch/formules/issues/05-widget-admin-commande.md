# 05 — Le restaurateur voit la Sélection lisiblement sur une commande

**Spec :** [docs/specs/formules.md](../../../docs/specs/formules.md) — User Story 17
**ADR :** [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — § « Consequences » (l'admin ne lit jamais nativement la metadata d'un line item)

**Status:** ready-for-agent

**Blocked by:** 03 (il faut qu'une Sélection soit persistée sur une commande pour avoir quelque chose à afficher).

## What to build

La carte Metadata de l'admin ne lit que `order.metadata`, jamais celle d'une ligne, et aucune route native n'édite ou n'affiche la metadata d'un line item. Sans ce ticket, la Sélection d'une Formule commandée existe en base mais reste invisible pour le restaurateur — sauf à ouvrir le JSON brut de la commande, ce qui contredit CONTEXT.md quand il dit que l'admin est la source de vérité.

Un widget admin sur la fiche de commande (`order.details.before`, même emplacement que le widget Créneau déjà existant, `order-pickup-slot.tsx`) lit `order.items[].metadata`, reconnaît les clés `formule_<key>_variant_id`, et affiche pour chaque ligne de Formule le nom du Composant (son `label`, retrouvé via le Composant dont le `key` correspond) et le nom de la Variante choisie. La commande charge déjà `*items` avec sa metadata — aucun appel réseau supplémentaire n'est nécessaire.

## Acceptance criteria

- [ ] Un widget sur `order.details.before` affiche, pour chaque ligne de commande qui est une Formule, la Sélection lisiblement : `label` du Composant → nom de la Variante choisie
- [ ] Le widget ne fait aucun appel réseau supplémentaire (les données proviennent de `*items` déjà chargé par la page)
- [ ] Une commande sans Formule n'affiche pas le widget, ou l'affiche vide sans erreur
- [ ] Vérification à la main dans l'admin (dev server) — même précédent que le widget Créneau
