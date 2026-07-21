# 02 — Les sélecteurs d'achat deviennent utilisables ailleurs que sur une page produit

**Spec :** [docs/specs/commande-depuis-la-page-carte.md](../../../docs/specs/commande-depuis-la-page-carte.md) — User Stories 32, 33, 34, 35 ; § « La synchronisation d'URL de la sélection de Variante devient optionnelle », § « Les cartes consomment le Produit déjà chargé »

**Status:** ready-for-agent

**Blocked by:** rien — peut démarrer immédiatement. Prefactor : à faire avant les tickets 03 et 05, qui en dépendent tous les deux.

## What to build

Prefactor, aucun comportement visible : rendre faisables les tickets 03 et 05.

`ProductActions` a été écrit en supposant qu'il est **seul sur sa page**. Trois choses en découlent, et toutes les trois cassent dès qu'on en affiche N sur une même page :

**Il écrit la Variante choisie dans l'URL courante** et relit ce paramètre au montage. Sur une page produit c'est la fonctionnalité — un lien partageable pointant vers une Variante précise. Sur une grille, toutes les instances partagent la même URL : chaque sélection écrase celle des autres cartes, et la relecture fait repartir une carte sur le choix d'une autre. Ce comportement passe derrière une option du composant, **activée par défaut** pour que la page produit ne change pas d'un iota, et désactivable pour l'usage en grille. Désactivée, la sélection redevient un état purement local à l'instance.

**Il recharge le Produit pour son propre compte.** L'aiguillage `ProductActionsWrapper` ne connaît que l'identifiant du Produit — il doit donc le charger, ce qui est le seul choix possible sur une page produit. Sur une grille, le Produit a déjà été chargé par la page, avec exactement les champs dont le sélecteur a besoin : prix calculés et quantités en stock de chaque Variante. Le sélecteur doit donc pouvoir recevoir un Produit déjà chargé plutôt que d'en réclamer un second. Sans ça, afficher la Carte coûterait un aller-retour serveur par Produit — c'est ce qui rendrait la page unique intenable (ticket 03).

**Il rend des actions flottantes en bas d'écran** quand sa zone d'action sort du champ de vision. Une par carte donnerait N barres empilées, et de toute façon la barre de panier persistante (ticket 07) occupera cet emplacement. Ce rendu doit pouvoir être désactivé.

`FormuleActions` n'a aucun de ces trois défauts : son état de Sélection est déjà entièrement local et ne touche ni l'URL ni aucun paramètre de recherche. Il n'a pas besoin d'être modifié ici — le vérifier fait partie du travail, pas le changer par symétrie.

Le seul juge de ce ticket est la **non-régression de la page produit** : à la fin, elle se comporte exactement comme avant, y compris son lien partageable par Variante.

## Acceptance criteria

- [ ] `ProductActions` accepte un Produit déjà chargé, sans en déclencher un second chargement
- [ ] La synchronisation de la Variante avec l'URL est derrière une option **activée par défaut** ; désactivée, le composant n'écrit ni ne lit aucun paramètre de recherche
- [ ] Le rendu des actions flottantes de bas d'écran est désactivable
- [ ] **Non-régression de la page produit** : sur un Produit à plusieurs Variantes, choisir une Variante met toujours à jour l'URL, et ouvrir cette URL restitue bien la Variante sélectionnée
- [ ] **Non-régression de la page produit** : une Formule s'y compose et s'y ajoute au panier exactement comme avant, Sélection comprise
- [ ] `FormuleActions` n'a pas été modifié — vérifié comme déjà local, pas rendu local
