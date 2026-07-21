# 06 — Le panier reste visible à côté de la Carte sur desktop

**Spec :** [docs/specs/commande-depuis-la-page-carte.md](../../../docs/specs/commande-depuis-la-page-carte.md) — User Stories 19, 20, 21, 22, 23, 24, 25, 36 ; §§ « Le panier latéral et la barre mobile ne créent aucun nouvel état », « La mise en page bascule au point de rupture déjà utilisé dans le storefront »
**Maquette :** [docs/specs/assets/commande-depuis-la-page-carte/maquette.png](../../../docs/specs/assets/commande-depuis-la-page-carte/maquette.png) — colonne « VOTRE PANIER » à droite, avec total et bouton « COMMANDER »

**Status:** ready-for-agent

**Blocked by:** 03 (il faut la Carte avant de lui adjoindre une colonne).

## What to build

Le client compose une commande de plusieurs plats ; il doit voir ce qu'il a déjà mis sans avoir à ouvrir quoi que ce soit. Au-dessus du point de rupture existant du storefront, la Carte passe à deux colonnes : la Carte à gauche, le panier à droite, qui reste visible pendant tout le défilement — jusqu'aux desserts.

Cette colonne affiche le contenu du panier, les Sélections retenues sous chaque Formule, le total, et donne accès au paiement. On peut y retirer un article sans changer de page. Panier vide, elle le dit explicitement plutôt que de rester blanche — une zone vide se lit comme un défaut d'affichage.

**Aucun état client nouveau ne doit être introduit.** Les composants qui rendent le panier et son récapitulatif sont déjà des composants serveur qui lisent le panier courant, et l'ajout au panier invalide déjà l'étiquette de cache dont ils dépendent. Ce ticket les rend dans un nouveau conteneur de mise en page : il n'écrit pas un second panier côté client, et n'ajoute aucun mécanisme de synchronisation. Si un ajout depuis la Carte ne rafraîchit pas la colonne, c'est le câblage qui est faux, pas la preuve qu'il faut un état client.

Le point de rupture est celui que le storefront utilise déjà pour ses colonnes collantes — aucun seuil nouveau n'est introduit. Sous ce point de rupture, la colonne disparaît simplement ; sa remplaçante mobile est le ticket 07.

Et le rafraîchissement ne doit pas coûter les choix en cours : ajouter un plat pendant qu'une Formule est à moitié composée plus bas dans la page ne doit pas réinitialiser cette composition.

## Acceptance criteria

- [ ] Au-dessus du point de rupture, la Carte s'affiche en deux colonnes, panier à droite, et la colonne reste visible pendant tout le défilement
- [ ] La colonne affiche le contenu du panier, le total, et les Sélections sous chaque Formule
- [ ] On peut retirer un article depuis la colonne, sans changer de page
- [ ] La colonne donne accès au paiement
- [ ] Panier vide, la colonne affiche un message explicite
- [ ] Un ajout depuis la Carte met la colonne à jour **sans rechargement de page**
- [ ] Un ajout ne réinitialise aucun choix en cours sur les autres cartes — notamment une Formule à moitié composée
- [ ] Aucun état client de panier n'a été ajouté ni dupliqué ; aucun mécanisme de synchronisation nouveau
- [ ] Sous le point de rupture, la colonne n'apparaît pas et ne laisse pas de trou dans la mise en page
