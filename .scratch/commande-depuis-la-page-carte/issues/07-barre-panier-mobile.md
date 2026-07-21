# 07 — Sur mobile, une barre en bas d'écran porte le panier et l'ouvre en plein écran

**Spec :** [docs/specs/commande-depuis-la-page-carte.md](../../../docs/specs/commande-depuis-la-page-carte.md) — User Stories 26, 27, 28 ; §§ « Le panier latéral et la barre mobile ne créent aucun nouvel état », « La mise en page bascule au point de rupture déjà utilisé dans le storefront »

**Status:** ready-for-agent

**Blocked by:** 06 (c'est la même décision de mise en page, vue de l'autre côté du point de rupture ; le panier collant doit exister avant qu'on lui donne son pendant mobile).

## What to build

Sur un téléphone, une colonne latérale est illisible — mais le besoin qu'elle sert ne disparaît pas : le client qui parcourt une longue Carte doit garder son panier sous les yeux.

Sous le point de rupture, une barre fixée en bas de l'écran affiche le **nombre d'articles** et le **total**, et reste visible pendant tout le défilement. Un appui l'ouvre en **plein écran**, avec le même contenu que le panier d'aujourd'hui — c'est ce contenu qui est réutilisé, pas une seconde version du panier à maintenir en parallèle.

**La fermeture doit rendre la Carte telle qu'on l'a laissée.** Le client qui ouvre son panier au niveau des desserts et le referme doit se retrouver aux desserts, pas en haut de page. C'est le détail qui décide si la barre est utile ou pénible : un panier qui coûte la position de défilement ne s'ouvre qu'une fois.

Comme au ticket 06, **aucun état client de panier n'est introduit** — la barre lit le panier courant et se rafraîchit par l'invalidation de cache que l'ajout déclenche déjà.

Attention à l'empilement : les actions flottantes de bas d'écran de `ProductActions` occupaient cet emplacement et ont été désactivées sur la Carte au ticket 02. Vérifier qu'elles ne réapparaissent pas sous la barre.

## Acceptance criteria

- [ ] Sous le point de rupture, une barre fixée en bas d'écran affiche le nombre d'articles et le total, et reste visible pendant tout le défilement
- [ ] Un appui ouvre le panier en plein écran, avec le même contenu que le panier existant
- [ ] Le panier plein écran se referme, et la Carte est retrouvée **à la position de défilement où on l'avait laissée**
- [ ] Un ajout depuis la Carte met la barre à jour sans rechargement de page
- [ ] Aucun état client de panier n'a été ajouté ; le panier plein écran réutilise le contenu existant plutôt que d'en créer une seconde version
- [ ] Aucune action flottante de `ProductActions` ne s'empile avec la barre sur la Carte
- [ ] Au-dessus du point de rupture, la barre n'apparaît pas — c'est la colonne du ticket 06 qui sert
