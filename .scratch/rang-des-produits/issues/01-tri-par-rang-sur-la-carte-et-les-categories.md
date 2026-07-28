# 01 — La Carte et les pages de catégorie obéissent au Rang

**Spec :** [docs/specs/rang-des-produits.md](../../../docs/specs/rang-des-produits.md) — User Stories 16, 17, 18, 19, 20, 21, 22, 23, 24, 29, 30 ; § « Le comparateur, et ses trois règles », § « Le tri est en mémoire, jamais dans la requête », § « Les deux surfaces obéissent, et le sélecteur de tri gagne une entrée », § « Une valeur de fraîcheur bornée sur les Produits »

**Décisions amont :** [ADR 0014](../../../docs/adr/0014-carte-rank-in-product-metadata.md) — le Rang vit dans `product.metadata` sous la clé `carte_rank`, à la maille Produit. Ce ticket ne rejoue pas ce choix.

**Status:** ready-for-agent

**Blocked by:** rien — peut démarrer immédiatement.

## What to build

Un Produit qui porte un Rang s'affiche à la place que ce Rang lui donne, sur la Carte **et** sur la page de sa catégorie. Aucune interface d'édition dans ce ticket : le Rang se pose à la main, et c'est suffisant pour tout démontrer.

**Ce ticket est démontrable seul**, et c'est ce qui en fait une tranche complète plutôt qu'une couche : le formulaire `metadata` natif de l'admin édite les valeurs primitives, donc un nombre. On ouvre un plat, on lui pose son Rang à la main, on recharge la Carte, il a bougé. C'est aussi la manière dont on vérifie toutes les règles ci-dessous avant que le widget du ticket 02 n'existe.

**Trois règles, et elles forment le contrat que le ticket 02 supposera acquis.** Un Rang numérique l'emporte, croissant. Un Rang absent **ou non numérique** est traité comme absent : le Produit part **en fin de section** — une valeur aberrante dégrade un plat, elle ne dérègle jamais la section autour de lui. À Rang égal, départage sur la date de création, c'est-à-dire l'ordre qui gouverne aujourd'hui. Cette troisième règle n'est pas de la prudence en trop : le formulaire `metadata` natif reste accessible et rien n'impose l'unicité, donc les doublons existeront.

**Un seul comparateur pour les deux surfaces.** La Carte et les pages de catégorie ne partagent aujourd'hui aucun code de tri — la Carte ne trie pas du tout, les pages de catégorie trient par prix ou par date. Les faire diverger sur le Rang voudrait dire déplacer un plat, le voir bouger sur une page et le retrouver ailleurs sur l'autre. Le comparateur est écrit une fois et appelé des deux côtés.

**Le tri se fait en mémoire, jamais dans la requête.** Demander l'ordre au serveur sur une clé de `metadata` ne fonctionne pas : Medusa découpe une chaîne d'`order` sur le point et lit `metadata.carte_rank` comme une *relation* nommée `metadata`. Ça ne coûte rien — les deux surfaces chargent déjà l'intégralité de ce qu'elles affichent avant de le rendre, la Carte parce que la spec Carte lui a retiré la pagination, les pages de catégorie parce qu'elles trient déjà en mémoire avant de paginer.

**Sur les pages de catégorie, le sélecteur de tri gagne une entrée** — « Ordre de la carte » — qui devient le **défaut** à la place de la date de création. Les entrées existantes restent : le client peut toujours demander autre chose, c'est le défaut qui change. Sans cette entrée, le sélecteur proposerait trois tris dont aucun n'est celui qu'on regarde.

**Les pages de collection héritent du même changement, et c'est assumé.** Elles partagent le composant de grille paginée des pages de catégorie : changer le tri par défaut là le change ici, sans branche à écrire. C'est la bonne conséquence — deux surfaces qui listent des Produits n'ont aucune raison de les ordonner différemment — mais elle doit être vue et vérifiée, pas découverte. Les exclure coûterait une branche pour produire une incohérence.

**Ce qui ne bouge pas, et pourquoi il ne faut pas essayer de l'y ajouter.** Le plat du moment, les rails de la page d'accueil et « Vous aimerez aussi » passent leur propre liste de champs, laquelle **écrase** celle par défaut — `metadata` comprise. Ces trois surfaces ne reçoivent donc pas le Rang du tout. Ce n'est pas un oubli : elles listent par collection ou par étiquette, pas par section, et un Rang est une place dans une section. Le noter ici parce que le mode de défaillance est muet — y appliquer le comparateur sans corriger les champs demandés ne produirait aucune erreur, juste un tri qui ne fait rien.

**Une borne de fraîcheur de soixante secondes sur les lectures de Produits**, et c'est la partie qu'on n'a pas le droit de repousser. Le storefront met les Produits en cache sous une étiquette construite à partir d'un identifiant **par visiteur**, donc rien côté serveur ne peut énumérer les étiquettes à invalider, et la seule invalidation existante part d'un changement de langue. Sans borne, un changement de Rang n'atteindrait jamais le site — et le serveur de développement ne met pas en cache de cette façon, donc tout fonctionnerait parfaitement pendant tout le développement pour cesser de fonctionner au premier déploiement. C'est une mitigation, pas une correction : l'étiquetage par visiteur reste un défaut, hors périmètre ici.

**Le juge de ce ticket est qu'on ne voie rien.** Aucun Produit ne porte de `metadata` aujourd'hui : tout retombe sur le départage par date, et la Carte doit s'afficher exactement comme avant la modification. Si quelque chose bouge sans qu'on ait posé un Rang, c'est un bug, pas la feature.

## Acceptance criteria

- [ ] Un `carte_rank` numérique posé à la main sur un Produit le place à ce rang dans sa section de la Carte
- [ ] Le même Produit est à la même place sur la page de sa catégorie
- [ ] Le comparateur est écrit une seule fois et appelé par les deux surfaces
- [ ] Un Produit sans `carte_rank` se range en fin de section
- [ ] Un `carte_rank` non numérique (chaîne de caractères) est traité comme absent : ce Produit part en fin de section et **les autres gardent leur ordre**
- [ ] Deux Produits de même `carte_rank` gardent un ordre stable d'un rechargement à l'autre, départagé par la date de création
- [ ] Les pages de catégorie proposent « Ordre de la carte » dans le sélecteur de tri, et c'est le tri par défaut
- [ ] Les tris existants du sélecteur (prix croissant, prix décroissant, date) fonctionnent toujours
- [ ] Les pages de collection, qui partagent la même grille paginée, obéissent au Rang et proposent la même entrée de tri — vérifié, pas seulement supposé
- [ ] Les lectures de Produits du storefront portent une revalidation de soixante secondes
- [ ] **Non-régression, le critère principal** : aucun Rang posé nulle part, la Carte et les pages de catégorie s'affichent exactement comme avant ce ticket
- [ ] **Non-régression de la spec Carte** : afficher la Carte complète ne déclenche toujours pas un chargement de Produit par carte — vérifié au nombre de requêtes serveur
