# 05 — Une Formule se compose et s'ajoute au panier depuis la Carte

**Spec :** [docs/specs/commande-depuis-la-page-carte.md](../../../docs/specs/commande-depuis-la-page-carte.md) — User Stories 11, 12, 13, 14, 15, 37, 39 ; §§ « Deux présentations de carte », « Les cartes consomment le Produit déjà chargé » (partie Curation)
**ADR :** [0001](../../../docs/adr/0001-formules-as-flat-priced-produits.md) (prix fixe, Curation explicite jamais dérivée) et [0005](../../../docs/adr/0005-formule-curation-via-module-selection-via-metadata.md) (la Sélection en clés plates sur `line_item.metadata`)
**Maquette :** [docs/specs/assets/commande-depuis-la-page-carte/maquette.png](../../../docs/specs/assets/commande-depuis-la-page-carte/maquette.png) — section « NOS FORMULES », cartes sans image portant le prix et la liste des Composants

**Status:** ready-for-agent

**Blocked by:** 03 (il faut la Carte et sa grille avant d'y composer une Formule).

## What to build

La section Formules devient commandable. Le client remplit chaque Composant — « une entrée au choix », « un plat au choix » — directement sur la carte de la Formule, et l'ajoute au panier sans ouvrir sa page dédiée.

**Une Formule ne se présente pas comme un plat.** Un plat se choisit sur une image et une description ; une Formule se choisit sur ce qu'elle contient. Sa carte met donc en avant son **prix fixe** et la **liste de ses Composants**, là où celle d'un plat met son image et sa description. Les deux partagent la même ossature et la même zone d'action — seule la présentation diffère, jamais le mécanisme. Le client doit comprendre au premier coup d'œil qu'il s'apprête à **composer**, pas à choisir (User Story 39).

**Le prix affiché est celui de la Formule, et il ne bouge jamais** selon ce qui est choisi dans ses Composants. C'est l'invariant d'ADR 0001 : tout l'argent du système est calculé par le pricing engine de Medusa, une Sélection n'en porte aucun. Rien dans ce ticket ne doit dériver un prix d'une Sélection.

**Chaque Composant ne propose que les Variantes curées pour lui**, exactement comme sur la page dédiée : la Carte n'ouvre aucun choix que la Curation ferme. Le bouton d'ajout reste indisponible tant qu'un Composant n'est pas rempli, et la Sélection part en clés plates sur la ligne de panier, selon le contrat d'ADR 0005 déjà en place — ce ticket ne le modifie pas.

**La Curation se charge par carte, derrière sa propre frontière de chargement**, jamais une frontière unique autour de la Carte entière : les cartes apparaissent au fur et à mesure que leurs Curations arrivent, plutôt que d'attendre la plus lente. C'est aussi cette lecture qui répond à « ce Produit est-il une Formule ? ». **Ne pas déduire qu'un Produit est une Formule depuis sa catégorie** : une Formule rangée ailleurs que dans la section Formules s'afficherait alors silencieusement comme un plat ordinaire, sans sélecteur de Composants. Si le coût de ces lectures devient un problème, la correction est une route Store de lecture groupée, pas cette déduction.

**Le risque de régression est la contamination entre cartes** : deux Formules composées côte à côte doivent rester étanches. C'est le cas à vérifier en priorité, et il ne se teste pas avec une seule Formule en base — d'où les deux exigées au ticket 01.

## Acceptance criteria

- [ ] La carte d'une Formule affiche son prix fixe et la liste de ses Composants, dans une présentation distincte de celle d'un plat
- [ ] Chaque Composant propose **uniquement** les Variantes curées pour lui — aucune Variante hors Curation n'est proposable
- [ ] Le bouton d'ajout reste indisponible tant que tous les Composants ne sont pas remplis
- [ ] Le prix affiché ne change jamais selon la Sélection
- [ ] **Le cas qui porte le risque** : deux Formules composées en parallèle sur la Carte, puis ajoutées l'une après l'autre, arrivent au panier chacune avec sa propre Sélection ; choisir sur l'une ne change rien sur l'autre ni sur aucune carte de plat de la page
- [ ] La Sélection arrivée au panier est lisible dans le panier, Composant par Composant
- [ ] La Curation de chaque Formule se charge derrière sa propre frontière de chargement — une Formule lente n'empêche pas les autres cartes de s'afficher
- [ ] Le fait qu'un Produit soit une Formule n'est **jamais** déduit de sa catégorie
- [ ] Aucun contrat serveur n'a été modifié : mêmes routes, mêmes hooks de validation, même forme de metadata
