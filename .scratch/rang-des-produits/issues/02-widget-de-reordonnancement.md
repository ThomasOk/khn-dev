# 02 — Le restaurateur réordonne ses plats en les glissant

**Spec :** [docs/specs/rang-des-produits.md](../../../docs/specs/rang-des-produits.md) — User Stories 1 à 15, 25, 26, 27, 28 ; § « L'écriture : dense, par lot, en lecture-modification-écriture », § « Le widget : sur la page de la catégorie, enregistrement au dépôt »

**Décisions amont :** [ADR 0014](../../../docs/adr/0014-carte-rank-in-product-metadata.md) — numérotation dense `0…N-1` réécrite par section, écriture par lot, clé `carte_rank` à la maille Produit, et le tripwire multi-catégories. Ce ticket ne rejoue pas ces choix.

**Status:** ready-for-agent

**Blocked by:** 01. Non pas techniquement — le widget écrirait des Rangs corrects sans lui — mais parce que rien ne les lirait : ce ticket ne serait pas vérifiable.

## What to build

Sur la page d'une catégorie dans l'admin, le restaurateur voit ses plats dans l'ordre où le client les verra, attrape une ligne, la dépose plus haut. C'est enregistré au dépôt, et la Carte suit en moins d'une minute.

**Le geste existe déjà un niveau au-dessus.** L'admin Medusa réordonne les catégories entre elles en glisser-déposer ; c'est le même geste, appliqué aux plats d'une section, sur la page où cette section est déjà éditée. Rien à apprendre.

**La liste montre ce que la Carte montre.** Les plats s'affichent dans l'ordre du comparateur du ticket 01 — donc classés d'abord, non classés ensuite. **Un plat non classé est signalé comme tel** : c'est le seul moyen de repérer une nouveauté qu'on a oublié de placer, et c'est la réponse au fait qu'un nouveau plat atterrit silencieusement en fin de section.

**Un dépôt réécrit toute la section en `0…N-1`, en une seule requête.** La numérotation dense n'est pas un détail d'implémentation : c'est ce qui rend les doublons structurellement impossibles par le widget et garde « non classé » sans ambiguïté — donc ce qui fait tenir le contrat du ticket 01 par construction plutôt que par espoir. La plus grosse section compte douze plats ; écrire douze lignes d'un coup est le comportement voulu, pas une optimisation à éviter.

**La mise à jour d'un Produit remplace `metadata` en entier.** Le widget lit donc la `metadata` existante du plat, y remplace la seule clé de Rang, et renvoie l'objet complet. Sans effet visible aujourd'hui — aucun Produit ne porte d'autre clé — et destructeur le jour où une autre feature écrit au même endroit. C'est gratuit à faire maintenant et coûteux à diagnostiquer plus tard.

**Enregistrement au dépôt, sans étape de validation.** C'est l'idiome des écrans admin déjà en place, dont aucun ne met les modifications en attente. La mise à jour est optimiste ; **en cas d'échec la liste revient à l'ordre du serveur** avec une notification d'erreur. Un ordre affiché que le serveur n'a pas est le seul résultat inacceptable ici.

**La logique d'attribution des Rangs est une fonction pure, hors du composant, et testée.** D'une liste réordonnée vers la charge utile de mise à jour par lot. C'est là que vivent les erreurs d'indice, et c'est le seul endroit de cette feature qu'un test protège : le seam existe déjà dans la bibliothèque partagée des widgets admin du backend, avec les helpers de la Curation des Formules et leur spec unitaire comme prior art directe — mêmes dossier, même forme, même matcher.

**Les dépendances de glisser-déposer sont déclarées explicitement dans le backend**, sur les intervalles que la bibliothèque de composants Medusa déclare déjà elle-même. Ce ne sont pas de nouvelles dépendances de l'arbre : l'installation les apporte déjà, et les déclarer ne fait que les rendre atteignables sous la résolution stricte de pnpm. Il n'y a rien de plus à réutiliser — la bibliothèque de composants n'exporte aucune liste réordonnable, et son propre usage du glisser-déposer porte sur les **colonnes** d'un tableau.

**Le capteur clavier est câblé en même temps.** Quelques lignes quand on y est déjà, et ça ne se rattrape jamais après.

**Une vérification qui ne se déclenche que des semaines plus tard**, et qu'il faut donc faire une fois ici, à la main : créer un plat **après** avoir classé sa section, et constater qu'il arrive en fin de section sans déranger l'ordre des autres.

## Acceptance criteria

- [ ] La page de détail d'une catégorie dans l'admin affiche ses Produits dans l'ordre où le client les verra
- [ ] Glisser un plat et le déposer plus haut change son ordre, et c'est enregistré sans bouton de validation
- [ ] Après un dépôt, les Rangs de la section valent exactement `0…N-1`, sans trou ni doublon
- [ ] La section entière est écrite en **une seule** requête de mise à jour par lot
- [ ] Les autres clés de `metadata` d'un Produit survivent au réordonnancement
- [ ] Réordonner une section ne modifie le Rang d'aucun Produit d'une autre section
- [ ] Un échec d'enregistrement ramène la liste à l'ordre du serveur et affiche une erreur
- [ ] Les plats non classés sont visuellement distingués des plats classés
- [ ] Le réordonnancement fonctionne au clavier et produit le même résultat qu'à la souris
- [ ] La logique d'attribution des Rangs est une fonction pure testée unitairement : liste réordonnée → Rangs denses dans l'ordre, `metadata` préservée, Produit sans `metadata` préalable, section d'un seul Produit, section vide, et charge utile ne contenant que les Produits de la section réordonnée
- [ ] Les dépendances de glisser-déposer sont déclarées dans le `package.json` du backend
- [ ] **Bout en bout** : un plat déposé en deuxième position dans l'admin est deuxième sur la Carte en moins d'une minute, sans redéploiement
- [ ] **Le cas de la nouveauté** : un Produit créé après le classement de sa section arrive en fin de section et ne déplace aucun autre
