# 01 — Une vraie Carte dans le backend, à la place du seed Medusa par défaut

**Spec :** [docs/specs/commande-depuis-la-page-carte.md](../../../docs/specs/commande-depuis-la-page-carte.md) — User Stories 40 et 41, § « Les sections sont les catégories racines », Further Notes « Il n'existe aucune Carte à afficher aujourd'hui »

**Status:** blocked-on-user — **à faire par Thomas depuis l'admin Medusa, pas par un agent.** Les données sont métier (vrais plats, vrais prix, vraies Formules) ; personne d'autre ne peut les inventer.

**Blocked by:** rien — peut démarrer immédiatement.

## What to build

Pas de code : des données. Le backend contient encore le seed Medusa par défaut — des catégories Shirts, Sweatshirts, Pants, Merch. Tant que c'est le cas, aucun des tickets suivants n'est vérifiable : ils s'affichent tous sur une Carte qui n'existe pas.

Ce ticket est clos quand l'admin Medusa contient une Carte représentative, c'est-à-dire une Carte qui exerce chacun des cas que les tickets suivants doivent gérer :

- **des catégories racines**, une par section de la Carte — Formules, Entrées, Plats, Desserts, Boissons — **explicitement ordonnées** par glisser-déposer dans l'admin, dans l'ordre où elles doivent apparaître. C'est ce rang que le ticket 03 lit ; s'il n'a jamais été posé à la main, on ne saura pas distinguer un tri qui marche d'un ordre accidentel qui tombe juste ;
- **au moins un Produit à Variante unique** (le cas le plus courant de la Carte : un plat sans choix, qui doit s'ajouter au panier en une seule action) ;
- **au moins un Produit à plusieurs Variantes** — typiquement des Samoussas Légumes / Bœuf — pour exercer le sélecteur de Variante et le garde-fou qui empêche l'ajout tant que rien n'est choisi ;
- **au moins deux Formules**, chacune avec ses Composants et leur Curation posée depuis l'écran d'admin existant. Deux, pas une : le risque de régression du ticket 05 est précisément que deux Formules composées côte à côte se mélangent, et il ne se teste pas avec une seule ;
- **au moins un Produit rangé dans une sous-catégorie** plutôt qu'à la racine. C'est le seul moyen de prouver que la remontée des descendants du ticket 03 fonctionne — sans lui, on livrerait un garde-fou que rien ne vérifie.

Les Produits doivent porter les champs que la Carte affiche : un titre, une description courte, une image, et un prix par Variante dans la région du storefront.

## Acceptance criteria

- [ ] Les catégories racines de la Carte existent et leur ordre a été posé à la main dans l'admin (glisser-déposer), pas laissé au hasard de leur création
- [ ] Au moins un Produit à Variante unique existe, avec un prix
- [ ] Au moins un Produit à plusieurs Variantes existe, chaque Variante ayant son propre prix
- [ ] Au moins deux Formules existent, chacune avec ses Composants et leur Curation renseignée
- [ ] Au moins un Produit est rangé dans une sous-catégorie d'une section, et pas à la racine de cette section
- [ ] Les Produits portent titre, description et image — la carte de grille les affiche, une Carte sans eux ne se juge pas
