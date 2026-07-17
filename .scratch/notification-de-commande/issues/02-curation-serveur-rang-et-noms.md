# 02 — La Curation résolue côté serveur porte le rang et le nom des Variantes

**Spec :** [docs/specs/notification-de-commande.md](../../../docs/specs/notification-de-commande.md) — User Story 20, § « La Sélection de Formule sur le ticket »
**ADR :** [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — la Sélection vit en clés plates sur `line_item.metadata`

**Status:** ready-for-agent

**Blocked by:** rien — peut démarrer immédiatement. Prefactor : à faire avant le ticket 05, qui en dépend.

## What to build

Prefactor, pas de comportement visible : rendre facile le ticket 05.

`getFormuleCurationForVariant` (`src/lib/formule/get-curation-for-variant.ts`) a été écrit pour les hooks de validation, qui n'ont besoin que de juger une appartenance — d'où une Curation qui ne porte que `key`, `label` et les ids de Variantes curatées. Le Ticket cuisine, lui, doit **afficher** cette Sélection : il lui faut le **rang** de chaque Composant (le spec exige l'ordre de rang, jamais l'ordre technique des clés de `metadata`) et le **nom lisible** de chaque Variante — un cuisinier ne prépare pas un `variant_01H…`.

La Curation résolue côté serveur gagne donc ces deux informations, et une fonction pure les met en forme : à partir de la metadata plate d'une ligne de commande et de la Curation actuelle, elle rend les entrées de la Sélection ordonnées par rang, chacune avec le `label` de son Composant et le nom de sa Variante. Le repli est celui, déjà éprouvé, de `resolveFormuleSelectionEntries` (`src/admin/lib/formule.ts`) : si un Composant ou une Variante ne se résout plus dans la Curation actuelle, l'entrée affiche l'id brut plutôt que de disparaître. Une Sélection illisible que la cuisine peut déchiffrer vaut mieux qu'une Sélection invisible.

C'est bien le pendant serveur de la fonction admin, pas son import : l'admin tourne dans le navigateur et ne partage pas ce code (convention `src/admin/lib/`, cf. `admin/lib/pickup.ts`). Le repli et sa raison sont en revanche identiques, et méritent d'être signalés comme tels dans le code.

Les hooks de validation existants (`workflows/hooks/cart-line-items.ts`, `workflows/hooks/complete-cart.ts`) continuent de fonctionner à l'identique — cet enrichissement s'ajoute, il ne casse pas leur usage.

## Acceptance criteria

- [ ] La Curation résolue par `getFormuleCurationForVariant` porte le rang de chaque Composant et le nom lisible de chaque Variante curatée
- [ ] Une fonction pure — aucune base, aucun container — transforme la metadata d'une ligne + une Curation en entrées de Sélection ordonnées **par rang de Composant**, pas par ordre des clés de `metadata`
- [ ] Un Composant qui ne se résout plus dans la Curation actuelle produit une entrée portant l'id brut, jamais une entrée absente
- [ ] Une Variante qui n'est plus curatée pour son Composant produit une entrée portant l'id brut de la Variante, jamais une entrée absente
- [ ] Test unitaire pur, fixture construite comme dans `src/lib/formule/__tests__/validate-selection.unit.spec.ts` (une Curation, une Sélection dessus)
- [ ] Les tests existants des hooks de validation de Sélection passent toujours
