# 02 — Le client compose une Formule sur la fiche produit et l'ajoute au panier

**Spec :** [docs/specs/formules.md](../../../docs/specs/formules.md) — § « Une nouvelle route Store expose la Curation au client », § « L'ajout au panier écrit la Sélection en clés plates »
**ADR :** [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) — la Sélection est une clé plate par Composant sur `line_item.metadata`

**Status:** ready-for-agent

**Blocked by:** 01 (a besoin d'une Curation existante à afficher et à consommer).

## What to build

La Curation existe et s'administre (ticket 01), mais rien côté client ne la lit encore. Ce ticket construit le chemin qui va de « voir une Formule sur la Carte » à « l'avoir dans son panier avec ses choix ».

**Côté Store, une route en lecture seule** : pour un Produit Formule donné, la liste ordonnée de ses Composants (`key`, `label`, `rank`) et, pour chacun, les Variantes curées (id, titre, prix résolu par le pricing engine comme n'importe quelle Variante). Elle ne fait que projeter la Curation — elle n'écrit rien et ne connaît aucune Sélection.

**Côté storefront, un sélecteur sur la page produit** : un contrôle par Composant, qui n'offre que ses Variantes curées. Le bouton d'ajout au panier reste désactivé tant qu'un Composant n'a pas de choix — contrainte d'UI, pas seulement de validation serveur (la validation serveur est le ticket 04). Le prix affiché reste celui de la Formule, fixe, et ne varie jamais selon les choix faits.

**L'ajout au panier écrit la Sélection.** Une clé plate par Composant sur `line_item.metadata`, exactement `formule_<key>_variant_id: "<variant_id>"` — jamais d'objet ni de tableau imbriqué. Une Variante peut être choisie dans deux Composants différents de la même Formule ; rien ne l'interdit.

Ce ticket ne rejette pas encore une Sélection incohérente côté serveur (c'est le ticket 04) : il construit le chemin heureux, démontrable en ajoutant une Formule correctement composée au panier et en vérifiant que la ligne porte la bonne Sélection.

## Acceptance criteria

- [ ] Une route Store expose, pour un Produit Formule, ses Composants ordonnés et les Variantes curées par Composant (nom, id, prix)
- [ ] La page produit d'une Formule affiche un sélecteur par Composant, limité à ses Variantes curées
- [ ] Le bouton d'ajout au panier est désactivé tant qu'un Composant n'a pas de choix
- [ ] Le prix affiché est celui de la Formule (fixe), quel que soit ce qui est sélectionné
- [ ] L'ajout au panier écrit `metadata: { formule_<key>_variant_id: "<variant_id>", … }` — une clé par Composant, valeur `string`, jamais objet ni tableau
- [ ] Choisir la même Variante dans deux Composants différents d'une même Formule est possible, pas bloqué
- [ ] Vérifié au minimum par un test d'intégration HTTP : ajouter une Formule correctement composée au panier, relire la ligne, et constater que sa metadata porte exactement la Sélection envoyée
