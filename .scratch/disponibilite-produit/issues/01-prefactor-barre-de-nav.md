# 01 — Prefactor : la barre de nav ne liste que les sections réellement présentes

**Spec :** [docs/specs/disponibilite-produit.md](../../../docs/specs/disponibilite-produit.md) — § « Le storefront : Carte, page produit, barre de nav », User Story 15
**ADR :** [0013](../../../docs/adr/0013-product-availability-evaluated-at-now.md) — § *Consequences*, « The Carte's section nav must be fixed with this feature »

**Status:** ready-for-agent

**Blocked by:** aucun — peut démarrer immédiatement.

## What to build

La barre de navigation de la Carte est construite à partir de **toutes** les catégories racines, avant de savoir si la moindre section rendra quelque chose. Une section sans produit ne rend rien — `CarteSection` retourne déjà `null` — mais son entrée reste dans la barre, et un clic dessus ne fait rien : l'ancre n'existe pas dans le DOM, et le scrollspy surveille un élément absent.

Ce ticket répare ça **avant** que la feature de disponibilité n'arrive, et il est vérifiable seul, aujourd'hui : il suffit d'une catégorie racine sans produit publié. Une fois passé, une section vidée par un Horaire de disponibilité ne demandera aucun travail supplémentaire côté navigation — c'est tout l'intérêt de le faire en premier.

La correction se fait **dans la barre**, qui est déjà un composant client mesurant le DOM et observant ces ancres : elle ne garde que les entrées dont la section est effectivement présente. Il ne faut **pas** décider au niveau de la page quelles sections rendront — ça obligerait à charger les produits de toutes les sections dans le shell et détruirait le streaming par `<Suspense>` que la spec *Commander depuis la page Carte* a construit exprès.

Attention aux deux comportements existants à ne pas casser : la stabilité référentielle de la liste d'ancres (sinon l'`IntersectionObserver` se réabonne à chaque surlignage au défilement), et la mesure vivante du bandeau qui publie son décalage en variable CSS pour les éléments serveur.

## Acceptance criteria

- [ ] Une catégorie racine dont aucun Produit n'est rendu n'apparaît pas dans la barre de navigation des sections
- [ ] Les catégories qui rendent au moins un Produit apparaissent, dans le même ordre qu'aujourd'hui
- [ ] Le surlignage de la section en cours de lecture fonctionne toujours, sur les seules entrées restantes
- [ ] L'`IntersectionObserver` ne se réabonne pas à chaque changement de section active (pas de nouvelle instabilité référentielle introduite)
- [ ] Le décalage du bandeau (variable CSS) est toujours publié correctement
- [ ] Le streaming par `<Suspense>` des sections est intact : aucun chargement de Produits n'a été remonté dans le shell de la page
- [ ] Vérification à la main, dev server, avec une catégorie racine vide
