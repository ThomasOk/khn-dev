# Rang des Produits sur la Carte

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — cette spec ne les rejoue pas :
[ADR 0014](../adr/0014-carte-rank-in-product-metadata.md) (le Rang vit dans `product.metadata`, à la maille Produit et non à la maille placement ; pourquoi ce choix diverge d'ADR 0005 ; le tripwire multi-catégories et la sortie),
[ADR 0005](../adr/0005-formule-curation-via-module-selection-via-metadata.md) (la Curation mérite un module — le raisonnement dont ADR 0014 explique l'inversion),
la [spec Commander depuis la page Carte](./commande-depuis-la-page-carte.md) (les sections sont les catégories racines, ordonnées par leur `rank` ; la Carte ne pagine pas ; les cartes consomment le Produit déjà chargé),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md) — **Rang**, Carte, Produit, Variante, Formule, Entrée / Plat / Dessert / Boisson.

Vocabulaire français du glossaire → identifiants anglais, comme partout ailleurs dans le repo :
`Rang → rank`, clé de stockage `carte_rank`, `Section → catégorie racine (root ProductCategory)`, `Produit non classé → unranked`.

## Problem Statement

Le restaurateur décide déjà de l'ordre des sections de la Carte : les Entrées avant les Plats, les Desserts après, en glisser-déposer dans l'admin Medusa. À l'intérieur d'une section, il ne décide de rien. Les Produits sortent dans l'ordre par défaut de Medusa, c'est-à-dire dans l'ordre où ils ont été saisis dans l'admin.

Ce que ça produit concrètement : la Carte est ordonnée par l'historique de la saisie. Le plat ajouté en dernier est en dernier, celui qu'on a créé pour tester est en premier, et corriger cet ordre demande de supprimer et recréer des Produits — c'est-à-dire de perdre leurs images, leurs Variantes et leur place dans la Curation des Formules. Personne ne fera ça, donc l'ordre reste faux.

Or l'ordre d'une carte de restaurant n'est pas cosmétique. Le plat signature se met en premier, celui qu'on veut vendre à hauteur d'œil, et l'Assiette découverte au-dessus des nems simples quel que soit l'alphabet ou le prix. Aucune règle automatique — titre, prix, date — n'exprime ça : trier par le prix ou par le titre remplacerait simplement un ordre accidentel par un autre. La spec *Commander depuis la page Carte* a déjà tranché cet argument un cran au-dessus, pour les sections ; il vaut identiquement pour les plats.

L'échelle rend le manque immédiat : la Carte compte aujourd'hui 34 Produits répartis sur six sections, dont douze dans les Plats — assez pour que l'ordre se voie, trop peu pour qu'il se corrige en supprimant des lignes.

## Solution

**Chaque Produit porte un Rang, et le restaurateur le règle en glissant le plat à sa place.** Sur la page d'une catégorie dans l'admin, les Produits de cette catégorie s'affichent dans l'ordre où le client les verra ; on attrape une ligne, on la dépose plus haut, c'est enregistré. C'est exactement le geste que l'admin Medusa propose déjà pour réordonner les catégories entre elles — le même geste, un niveau plus bas.

**La Carte et les pages de catégorie obéissent au même Rang.** `/store` et `/categories/plats` affichent les mêmes plats ; les laisser diverger voudrait dire déplacer un plat, le voir bouger sur une page et le retrouver ailleurs sur l'autre, sans que rien à l'écran l'explique.

**Rien ne bouge tant que le restaurateur n'a rien bougé.** Aucun Produit ne porte de Rang aujourd'hui. Un Produit sans Rang se range en fin de section, dans l'ordre actuel — donc le jour de la mise en ligne, la Carte s'affiche exactement comme avant. Le premier glisser-déposer est le premier changement visible.

**Un nouveau plat arrive en fin de section**, jusqu'à ce qu'on le place. C'est le seul endroit prévisible : le mettre en tête placerait automatiquement chaque nouveauté devant le plat que le restaurateur a délibérément mis en premier.

**Pour le système.** Un entier par Produit dans `product.metadata`, écrit par lot pour toute une section, et un tri en mémoire côté storefront — là où les deux surfaces chargent déjà l'intégralité de ce qu'elles affichent avant de le rendre. Aucun module nouveau, aucune migration de base, aucune route Store nouvelle.

## User Stories

**Le restaurateur — ordonner la Carte**

1. En tant que restaurateur, je veux décider de l'ordre dans lequel les plats apparaissent à l'intérieur d'une section, afin que ma Carte se lise comme je l'ai pensée et non comme je l'ai saisie.
2. En tant que restaurateur, je veux réordonner mes plats en les glissant à leur place, afin de ne jamais avoir à calculer ni à saisir un numéro.
3. En tant que restaurateur, je veux retrouver ce réglage sur la page de la catégorie que je suis en train d'éditer, afin de ne pas chercher un écran séparé pour une décision qui appartient à cette section.
4. En tant que restaurateur, je veux voir les plats dans l'admin exactement dans l'ordre où le client les verra, afin de juger de l'ordre sans ouvrir le storefront à côté.
5. En tant que restaurateur, je veux que mon déplacement soit enregistré dès que je lâche le plat, afin de ne pas perdre un réordonnancement pour avoir oublié un bouton.
6. En tant que restaurateur, je veux être averti si l'enregistrement échoue et voir la liste revenir à l'ordre réellement enregistré, afin de ne jamais croire à un ordre que le serveur n'a pas.
7. En tant que restaurateur, je veux que déplacer un plat dans une section ne touche à aucune autre section, afin de travailler ma Carte section par section.
8. En tant que restaurateur, je veux que mon nouvel ordre apparaisse sur le site sans redéploiement et sans attendre plus d'une minute, afin de vérifier mon travail tout de suite.
9. En tant que restaurateur, je veux que les Formules se réordonnent comme les autres plats, afin de n'avoir qu'un seul geste à connaître pour toute la Carte.
10. En tant que restaurateur, je veux pouvoir réordonner au clavier, afin que l'écran reste utilisable sans souris.

**Le restaurateur — le quotidien**

11. En tant que restaurateur, je veux qu'un plat que je viens de créer se place en fin de sa section, afin de savoir sans réfléchir où il a atterri.
12. En tant que restaurateur, je veux repérer dans l'admin les plats que je n'ai pas encore placés, afin de ne pas laisser une nouveauté en bas de la section par oubli.
13. En tant que restaurateur, je veux que supprimer ou dépublier un plat ne dérègle pas l'ordre des autres, afin de ne pas avoir à tout replacer après chaque retrait.
14. En tant que restaurateur, je veux que l'ordre que j'ai réglé survive à toute autre modification du plat — photo, prix, description — afin de ne jamais reperdre ce travail.
15. En tant que restaurateur, je veux que le jour de la mise en ligne ma Carte s'affiche exactement comme la veille, afin de n'avoir aucune urgence à réordonner quoi que ce soit.

**Le client**

16. En tant que client, je veux lire chaque section de la Carte dans l'ordre voulu par le restaurant, afin de voir d'abord ce que la maison met en avant.
17. En tant que client, je veux retrouver le même ordre sur la page d'une catégorie que sur la Carte, afin de ne pas devoir réapprendre où sont les plats selon la page où j'arrive.
18. En tant que client, je veux que l'ordre de la Carte soit stable d'une visite à l'autre, afin de retrouver rapidement le plat que je commande à chaque fois.
19. En tant que client sur une page de catégorie, je veux pouvoir demander un autre tri si je le souhaite, afin que l'ordre du restaurant soit le défaut et non une contrainte.
20. En tant que client, je veux que l'ordre de la Carte ne change rien à ce que je peux commander, afin qu'un plat placé en dernier reste aussi accessible qu'un plat placé en premier.

**Le développeur**

21. En tant que développeur, je veux un seul comparateur partagé par la Carte et les pages de catégorie, afin que les deux surfaces ne puissent pas diverger.
22. En tant que développeur, je veux que le comparateur survive à une valeur de Rang absurde sans mélanger la section, afin qu'une saisie manuelle erronée dégrade un plat et non l'affichage entier.
23. En tant que développeur, je veux que deux Produits de même Rang gardent un ordre stable, afin que la section ne se réaffiche pas différemment à chaque rendu.
24. En tant que développeur, je veux que le tri n'ajoute aucun aller-retour serveur, afin que la décision de la spec Carte — afficher toute la Carte sans rechargement par plat — reste vraie.
25. En tant que développeur, je veux que l'écriture des Rangs d'une section tienne en une seule requête, afin qu'un glisser-déposer ne produise pas douze appels.
26. En tant que développeur, je veux que l'écriture d'un Rang préserve les autres clés de `metadata` du Produit, afin qu'une feature ultérieure écrivant au même endroit ne soit pas effacée.
27. En tant que développeur, je veux que le calcul des Rangs soit une fonction pure testée hors de l'interface, afin que les erreurs d'indice soient attrapées par un test et non par l'œil.
28. En tant que développeur, je veux que les dépendances de glisser-déposer soient déclarées explicitement, afin de ne pas dépendre d'un paquet qui n'est là que par transitivité.
29. En tant que développeur, je veux que le tri par Rang soit livrable seul, sans interface d'édition, afin que la première livraison soit un changement sans effet visible.
30. En tant que développeur, je veux que la fraîcheur du storefront ne dépende pas du mode de développement, afin qu'un comportement vérifié en local reste vrai en production.

## Implementation Decisions

### Le Rang est un entier sur le Produit, sous une clé préfixée

Un Rang par Produit, stocké en clé plate primitive dans `product.metadata`, sous une clé préfixée du domaine auquel elle appartient — `carte_rank`. Le préfixe suit le précédent d'ADR 0005 pour les clés plates : `product.metadata` est un sac partagé sans schéma, et une clé nue ne dirait pas *rang de quoi*.

Le choix de `metadata` plutôt qu'un module, et le choix de la maille Produit plutôt que la maille (Produit, Section), sont tranchés et argumentés dans ADR 0014. Cette spec ne les rejoue pas ; elle en hérite, y compris du tripwire : **un Produit rangé dans deux catégories verrait son Rang écrasé par la dernière section réordonnée.** Inatteignable aujourd'hui — l'arbre des catégories est plat et chaque Produit est dans exactement une catégorie — et c'est le déclencheur nommé pour rouvrir la décision.

### Le comparateur, et ses trois règles

Un comparateur unique, partagé par la Carte et les pages de catégorie, appliqué en mémoire après chargement. Trois règles, et elles forment le contrat :

- un `carte_rank` **numérique** l'emporte, croissant ;
- un Rang **absent ou non numérique** est traité comme absent : le Produit se range **en fin de section**. Une valeur aberrante dégrade un plat, elle ne dérègle jamais la section ;
- **à Rang égal**, départage sur `created_at`, c'est-à-dire l'ordre qui gouverne aujourd'hui.

La troisième règle n'est pas défensive par excès de prudence : le formulaire de `metadata` natif de l'admin reste accessible et rien n'impose l'unicité, donc les doublons sont possibles et le tri doit rester stable plutôt qu'aléatoire.

Conséquence recherchée de la deuxième règle : **le jour de la livraison, aucun Produit ne porte de `metadata`**, tout retombe sur le départage, et la Carte s'affiche à l'identique. La livraison du tri est un non-événement visible.

### Le tri est en mémoire, jamais dans la requête

`order=metadata.carte_rank` ne fonctionne pas et ne doit pas être tenté : Medusa découpe une chaîne d'`order` sur le point et en fait un objet imbriqué, donc `metadata.carte_rank` est lu comme une *relation* nommée `metadata` et non comme un chemin JSON (ADR 0014).

Ça ne coûte rien : la Carte charge déjà l'intégralité de chaque section avant de la rendre (la spec Carte a supprimé la pagination), et les pages de catégorie chargent déjà cent Produits et trient en mémoire avant de paginer. Le Rang est un cas de tri supplémentaire dans une machinerie qui existe des deux côtés, pas un mécanisme nouveau.

### Les deux surfaces obéissent, et le sélecteur de tri gagne une entrée

Le Rang devient l'ordre par défaut sur la Carte **et** sur les pages de catégorie. Sur ces dernières, le sélecteur de tri existant garde ses entrées et en gagne une, « Ordre de la carte », qui devient le défaut à la place de la date de création. Le client peut donc toujours demander un autre tri ; c'est le défaut qui change.

Le tri par Rang s'applique sur les cent Produits chargés avant pagination, comme les tris existants — cohérent avec eux, et sans objet à cette échelle.

### L'écriture : dense, par lot, en lecture-modification-écriture

Un glisser-déposer réécrit **toute la section en `0…N-1`**, en une seule requête de mise à jour par lot des Produits. Le choix du dense plutôt que d'une numérotation espacée ou fractionnaire est tranché dans ADR 0014 ; sa propriété utile ici est qu'après chaque dépôt les Rangs de la section valent exactement `0…N-1`, ce qui rend les doublons structurellement impossibles par le widget et garde « non classé » sans ambiguïté.

**La mise à jour d'un Produit remplace `metadata` en entier.** Le widget lit donc la `metadata` existante, y remplace `carte_rank`, et renvoie l'objet complet. Sans effet aujourd'hui — aucun Produit ne porte d'autre clé — et destructeur le jour où une autre feature écrit au même endroit.

### Le widget : sur la page de la catégorie, enregistrement au dépôt

Le réglage vit dans un widget sur la page de détail d'une catégorie dans l'admin, sous la zone d'injection prévue par Medusa. C'est là que la section est déjà définie et que son propre Rang est déjà glissé-déposé.

Le widget liste les Produits de cette catégorie dans l'ordre du comparateur, en réutilisant le vocabulaire de composants déjà employé par les écrans admin existants. **L'enregistrement part au dépôt**, sans étape de validation : c'est l'idiome des cinq surfaces admin déjà en place, aucune ne mettant les modifications en attente. La mise à jour est optimiste, et **en cas d'échec la liste revient à l'ordre du serveur** avec une notification d'erreur — jamais un ordre affiché que le serveur n'a pas.

Les dépendances de glisser-déposer sont **déclarées dans le backend**, en alignant les intervalles sur ceux que `@medusajs/ui` déclare déjà directement. Ce ne sont pas de nouvelles dépendances de l'arbre : l'installation les apporte déjà, et la déclaration ne fait que les rendre atteignables sous la résolution stricte de pnpm. Il n'y a rien de plus à réutiliser — `@medusajs/ui` n'exporte aucune liste réordonnable, et son propre usage du glisser-déposer porte sur les **colonnes** d'un tableau de données.

Le capteur clavier est câblé en même temps que le widget. C'est quelques lignes quand on y est déjà, et ça ne se rattrape jamais après.

### Une valeur de fraîcheur bornée sur les Produits

Les lectures de Produits du storefront reçoivent une durée de revalidation de **soixante secondes**.

C'est une mitigation, pas un choix d'architecture, et elle est nommée comme telle. Le storefront met les Produits en cache avec une étiquette construite à partir d'un identifiant **par visiteur**, si bien qu'aucun acteur côté serveur ne peut énumérer les étiquettes à invalider ; la seule invalidation de l'étiquette `products` du dépôt part d'un changement de langue. Sans borne, un changement de Rang n'atteindrait jamais le storefront — et le serveur de développement ne met pas en cache de cette façon, donc le défaut resterait invisible jusqu'à la première mise en production. Soixante secondes transforment « périmé pour toujours » en « périmé une minute », ce qui tient dans la patience d'un restaurateur qui vient de réordonner sa Carte et va la regarder.

### Ordre de livraison

Deux tickets, dans cet ordre, et l'ordre compte :

1. **Le tri** — le comparateur, les deux surfaces, l'entrée du sélecteur, la revalidation. Livrable seul et **sans effet visible** : aucun Produit n'ayant de Rang, tout retombe sur le départage.
2. **Le widget** — le glisser-déposer, l'écriture par lot, la fonction pure testée.

L'inverse écrirait des Rangs que rien ne lit.

## Testing Decisions

**Ce qui ferait un bon test ici** — le comportement observable, jamais l'implémentation (AGENTS.md) : ce que produit une réorganisation en entrée, jamais l'état interne du widget, l'ordre des rendus, ni la façon dont le glisser-déposer est câblé.

**Un seul seam, et il existe déjà.** La logique d'attribution des Rangs — d'une liste réordonnée vers la charge utile de mise à jour par lot — est extraite en **fonction pure dans la bibliothèque partagée des widgets admin du backend**, à côté de son équivalent pour la Curation des Formules, et testée par le matcher de tests unitaires existant. Prior art directe : les helpers de la Curation et leur spec unitaire, même dossier, même forme — des helpers sortis d'un widget et testés hors de React.

Ce que ces tests couvrent :

- une liste réordonnée produit des Rangs **denses `0…N-1`**, dans l'ordre de la liste ;
- la `metadata` existante d'un Produit est **préservée**, seul `carte_rank` change ;
- un Produit dont la `metadata` est absente reçoit bien un objet contenant son Rang ;
- une section d'un seul Produit, et une section vide, ne produisent rien d'aberrant ;
- la charge utile ne contient **que** les Produits de la section réordonnée.

**Le comparateur du storefront reste vérifié à la main.** Le storefront n'a aucun exécuteur de tests, et la spec *Commander depuis la page Carte* a fixé la barre pour en ouvrir un : « le premier test storefront de ce repo mérite d'être ouvert par une feature qui apporte une logique à protéger ». Dix lignes de comparateur dont le mode de défaillance est une section visiblement mélangée, vue dès qu'on ouvre la Carte, passent sous cette barre — c'est le même raisonnement « échoue bruyamment, se corrige en cinq secondes » qui a mis le Rang dans `metadata` plutôt que dans un module (ADR 0014).

**La branche qui n'échoue pas bruyamment est nommée et vérifiée une fois**, parce qu'elle ne se déclenche que des semaines plus tard : créer un Produit après avoir classé sa section, et vérifier qu'il arrive en fin de section sans déranger les autres.

**Vérification manuelle, serveur de développement ouvert** — cette liste en est le contenu :

- une section jamais classée s'affiche dans l'ordre d'aujourd'hui, inchangé ;
- glisser un plat en deuxième position le place en deuxième sur la Carte, sans rechargement de l'admin ;
- le même plat est en deuxième sur la page de sa catégorie, avec « Ordre de la carte » comme tri par défaut ;
- demander un autre tri sur la page de catégorie fonctionne toujours ;
- réordonner les Plats ne déplace rien dans les Entrées ;
- **le cas de la nouveauté** : créer un plat après classement — il arrive en fin de section et ne déplace aucun autre ;
- un `carte_rank` saisi à la main en texte dans le formulaire `metadata` natif envoie ce plat en fin de section et laisse les autres en place ;
- deux Produits au même Rang gardent un ordre stable d'un rechargement à l'autre ;
- un échec d'enregistrement ramène la liste à l'ordre du serveur et affiche une erreur ;
- réordonner au clavier produit le même résultat qu'à la souris ;
- une section entièrement classée puis un Produit dépublié : les autres gardent leur ordre relatif ;
- le changement apparaît sur le storefront en moins d'une minute sans redéploiement ;
- **non-régression de la spec Carte** : l'affichage de la Carte complète ne déclenche toujours pas un chargement de Produit par carte — le nombre de requêtes serveur à l'affichage est le seul contrôle qui le prouve.

## Out of Scope

- **Migrer le Rang vers un module dédié.** Écarté par ADR 0014, avec son déclencheur et son script de sortie nommés — le jour venu, la solution n'est pas à improviser.
- **Un Rang par (Produit, Section).** Écarté par ADR 0014. Le tripwire correspondant — un Produit dans deux catégories dont le Rang est écrasé — est documenté, inatteignable sur l'arbre plat actuel, et c'est ce qui rouvre la décision.
- **Refondre les étiquettes de cache du storefront.** L'identifiant de cache par visiteur est un défaut d'architecture qui touche le panier, le client, les commandes et les régions. La revalidation à soixante secondes le borne sans le corriger ; le corriger mérite sa propre spec et probablement son propre ADR.
- **Supprimer le sélecteur de tri prix / date des pages de catégorie.** Qu'un tri par prix croissant ait un sens sur un site de restaurant est une vraie question, et c'est une question sur la raison d'être de ces routes, pas sur l'ordre des plats.
- **Les catégories `Shirts`, `Sweatshirts`, `Pants`, `Merch`**, héritées du jeu de données de démonstration Medusa et toujours rendues comme des sections de la Carte. Réel, à nettoyer, sans rapport avec cette feature.
- **Un ordre à l'intérieur des sous-catégories, et l'affichage des sous-catégories comme sous-titres.** L'arbre est plat ; la spec Carte a déjà décidé que les sous-catégories servent au rangement, pas à la lecture.
- **Toute mise en avant.** Un Rang est un ordre d'affichage et rien d'autre (CONTEXT.md) : pas de « plat vedette », pas de badge, pas de priorité lue ailleurs. Le premier Produit d'une section n'est promu nulle part.
- **L'ordre des Composants d'une Formule**, qui a déjà son propre `rank` dans le module `formule` et ne partage rien avec celui-ci.

## Further Notes

**La livraison du tri ne se voit pas, et c'est voulu.** C'est la propriété qui rend le premier ticket sûr : il touche l'ordre d'affichage de toutes les pages de la Carte, et il ne déplace rien tant que personne n'a glissé un plat. Si quelque chose bouge au moment de la mise en ligne, c'est un bug, pas la feature.

**Le piège qui ne se voit qu'en production.** Le serveur de développement ne met pas les Produits en cache comme la production le fait. Sans la borne de fraîcheur, cette feature fonctionnerait parfaitement pendant tout son développement et cesserait de fonctionner après le premier déploiement — le mode de défaillance le plus coûteux à diagnostiquer, puisque rien dans le code de la feature ne serait en cause. C'est la raison pour laquelle la revalidation est dans cette spec et non dans un ticket ultérieur.

**Ce que cette feature rend possible et qu'il ne faut pas y lire.** Une fois l'ordre contrôlé, la tentation suivante est de s'en servir : mettre le premier plat d'une section en avant sur la page d'accueil, en déduire une popularité, l'afficher comme une recommandation. CONTEXT.md ferme cette porte explicitement — un Rang n'est lu par rien d'autre que l'affichage de la Carte. Une vraie mise en avant est une autre décision, avec son propre terme et son propre stockage.

**L'échelle qui justifie tout le reste.** Trente-quatre Produits, six sections, douze plats au maximum dans la plus grosse. C'est ce chiffre qui rend acceptables le tri en mémoire, la réécriture dense de toute une section à chaque dépôt, et le stockage dans `metadata` plutôt que dans une colonne. Il est à revérifier avant de conclure que l'un des trois est un mauvais choix.
