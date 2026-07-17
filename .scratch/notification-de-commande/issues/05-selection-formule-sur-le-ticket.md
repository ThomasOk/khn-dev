# 05 — Le ticket montre la Sélection sous chaque Formule commandée

**Spec :** [docs/specs/notification-de-commande.md](../../../docs/specs/notification-de-commande.md) — User Stories 15 et 20, § « La Sélection de Formule sur le ticket », Testing Decisions Seam 1 (deux dernières assertions)
**ADR :** [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — la Sélection vit en clés plates sur `line_item.metadata`
**Voisin :** [.scratch/formules/issues/05-widget-admin-commande.md](../../formules/issues/05-widget-admin-commande.md) — même résolution, même repli, côté navigateur

**Status:** ready-for-agent

**Blocked by:** 02 (la Curation serveur doit porter le rang et le nom des Variantes) et 04 (il faut un ticket où afficher la Sélection).

## What to build

Une ligne « Menu Midi » sur un ticket ne dit pas à la cuisine quoi préparer. Sous le nom de la Formule, le ticket affiche donc, groupée juste en dessous et indentée, la **Sélection retenue pour chaque Composant** — quelle entrée, quel plat — dans l'**ordre de rang des Composants**, jamais l'ordre technique des clés de `metadata`. C'est ce que CONTEXT.md exige du Ticket cuisine : chaque Variante par son nom, et chaque Sélection à l'intérieur d'une Formule.

La Sélection se lit directement sur la metadata des lignes de la commande (clés plates, une par Composant, ADR 0005) — qui ne porte jamais le `label` du Composant ni le nom de la Variante : ceux-là vivent dans la Curation. Contrairement au widget admin de la commande, qui tourne dans le navigateur et doit repasser par une route HTTP, ce code tourne côté serveur avec un accès direct au container : il résout la Curation via `getFormuleCurationForVariant`, déjà écrit pour les hooks de validation et enrichi par le ticket 02. Pas de nouvel appel réseau, pas de duplication de cette résolution.

Le **repli** est celui du ticket 02, et sa raison mérite d'être comprise : la Curation peut changer entre le paiement — où la Sélection a été validée pour la dernière fois — et la génération du ticket. Fenêtre étroite mais réelle. Si un Composant ou une Variante ne se résout plus, le ticket affiche l'**id brut** plutôt que de faire disparaître la ligne. Une Sélection illisible que la cuisine peut encore déchiffrer vaut mieux qu'une Sélection invisible qu'elle ne peut pas deviner.

## Acceptance criteria

- [ ] Une ligne de Formule affiche le nom de la Formule, puis, indentée juste en dessous et dans le même bloc, le `label` de chaque Composant et le nom de la Variante choisie
- [ ] Les Composants s'affichent **dans l'ordre de leur rang**, pas dans l'ordre des clés de `metadata` — le test le prouve avec une fixture dont les deux ordres diffèrent
- [ ] Une Sélection dont la Curation ne répond plus affiche l'**id brut** de la Variante ; la ligne n'est jamais absente du ticket
- [ ] Une ligne de commande ordinaire (pas une Formule) s'affiche exactement comme au ticket 04 — aucune régression
- [ ] Tests unitaires purs, fixture de Curation construite comme dans `src/lib/formule/__tests__/validate-selection.unit.spec.ts`, jamais une base réelle
