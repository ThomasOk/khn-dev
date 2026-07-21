# 04 — Une barre collante permet de sauter d'une section à l'autre de la Carte

**Spec :** [docs/specs/commande-depuis-la-page-carte.md](../../../docs/specs/commande-depuis-la-page-carte.md) — User Stories 2, 3, 4, 5, 18 ; § « Une page unique pour toute la Carte, les sections en ancres »
**Maquette :** [docs/specs/assets/commande-depuis-la-page-carte/maquette.png](../../../docs/specs/assets/commande-depuis-la-page-carte/maquette.png) — la barre « NOS FORMULES / ENTRÉES / PLATS / DESSERTS / BOISSONS », section courante soulignée

**Status:** ready-for-agent

**Blocked by:** 03 (il faut des sections avant de pouvoir naviguer entre elles).

## What to build

La navigation de la Carte. Une barre qui reste visible pendant tout le défilement liste les sections ; cliquer l'une d'elles y fait défiler. Ce sont des **ancres dans la page, jamais des liens vers des routes** : on ne recharge rien, et les choix en cours sur les autres cartes survivent au saut (User Story 4). C'est la contrepartie directe de la page unique — sans elle, une Carte longue se parcourt uniquement à la molette.

La barre **met en évidence la section en cours de lecture**, et ce repère suit le défilement : le client doit pouvoir savoir où il se trouve dans une carte longue sans réfléchir.

Deux détails sans lesquels cette barre se retourne contre le client, et qui sont donc du travail à part entière, pas de la finition :

**La compensation de la hauteur de la barre.** Une ancre amène par défaut la section en haut du cadre — c'est-à-dire *sous* une barre collante, qui masque le titre. Le client saute à « Desserts » et atterrit sur des plats sans savoir lesquels. Chaque section doit réserver la hauteur de la barre au-dessus de son titre.

**Le défilement horizontal sur mobile.** Cinq sections ne tiennent pas en largeur sur un téléphone. La barre doit y défiler horizontalement — la rangée de pastilles de catégories actuelle le fait déjà, c'est le comportement à reprendre plutôt qu'à réinventer.

## Acceptance criteria

- [ ] La barre des sections reste visible pendant tout le défilement de la Carte
- [ ] Cliquer une section y fait défiler **sans recharger la page** ; les Variantes déjà choisies sur d'autres cartes sont intactes après le saut
- [ ] La section en cours de lecture est mise en évidence dans la barre, et ce repère suit le défilement
- [ ] Sauter à une section affiche son **titre visible**, jamais masqué sous la barre collante
- [ ] Sur mobile, la barre défile horizontalement et toutes les sections restent atteignables
- [ ] La rangée de pastilles de catégories que la Carte affichait n'est plus là — la barre la remplace, elle ne s'y ajoute pas
