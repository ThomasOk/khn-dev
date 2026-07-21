# Commander depuis la page Carte

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — ce spec ne les rejoue pas :
[le glossaire dans CONTEXT.md](../../CONTEXT.md) (Carte, Produit, Variante, Formule, Composant, Sélection, Commandes fermées),
[la spec Formules](./formules.md), [ADR 0001](../adr/0001-formules-as-flat-priced-produits.md) (une Formule est un Produit à Variante unique au prix fixe ; une Sélection ne porte aucun argent)
et [ADR 0005](../adr/0005-formule-curation-via-module-selection-via-metadata.md) (la Curation vit dans le module `formule` ; la Sélection vit en clés plates sur `line_item.metadata`, revalidée aux hooks `validate`).

Ce spec ne modifie **aucun** contrat backend. Il change uniquement l'endroit et la manière dont le client déclenche des actions que ces décisions autorisent déjà.

## Problem Statement

Consulter la Carte se fait aujourd'hui par pages de catégorie successives, et aucune de ces pages ne permet de commander. Chacune n'affiche qu'une grille de vignettes — une image, un titre, un prix de départ. Pour ajouter un plat au panier, le client doit ouvrir la page dédiée du Produit, y choisir sa Variante (ou y remplir les Composants s'il s'agit d'une Formule), ajouter au panier, revenir en arrière, et recommencer.

Composer un repas complet — une entrée, un plat, un dessert — coûte donc trois allers-retours vers des pages produit **et** deux changements de page de catégorie. C'est un parcours d'e-commerce classique, pensé pour un catalogue qu'on explore article par article. Une carte de restaurant ne se lit pas comme ça : elle se parcourt d'un bout à l'autre, et le repas se compose en traversant ses sections.

S'y ajoute une gêne : le panier n'est visible qu'en l'ouvrant depuis l'en-tête. Le client qui compose une commande de plusieurs plats n'a aucun retour permanent sur ce qu'il a déjà mis ni sur le total qu'il atteint.

## Solution

**Une page unique pour toute la Carte.** Les sections — Nos formules, Entrées, Plats, Desserts, Boissons — se suivent sur une seule page, surmontées d'une barre de navigation qui reste visible pendant le défilement et met en évidence la section en cours de lecture. Cliquer sur une section fait défiler jusqu'à elle ; on ne change jamais de page. C'est ce que fait la carte papier qu'on parcourt du pouce, et ce que font les interfaces de commande que le client connaît déjà.

**Chaque Produit est commandable sur place.** Chaque Produit porte directement sa zone d'action : un sélecteur de Variante pour un Produit ordinaire, un sélecteur par Composant pour une Formule, et son propre bouton d'ajout au panier. Chaque carte est autonome — ce qu'on choisit sur l'une n'a aucun effet sur les autres.

**Le panier ne quitte jamais l'écran.** Sur desktop, une colonne à droite de la grille affiche en permanence le contenu du panier et son total pendant tout le défilement de la Carte. Sur mobile, où une colonne latérale serait illisible, elle est remplacée par une barre fixée en bas de l'écran affichant le nombre d'articles et le total ; un appui l'ouvre en plein écran, avec le même contenu que le panier actuel.

**Rien de ce qui existe ne disparaît.** La page dédiée d'un Produit et les routes de catégorie restent atteignables — liens directs, partage, référencement, et la place qu'une carte de grille n'a pas pour une description longue et une galerie. Elles cessent d'être le chemin principal sans cesser d'exister.

**Pour le système.** Ajouter au panier depuis la Carte emprunte exactement le même chemin qu'aujourd'hui depuis une page produit : même appel, même charge utile, mêmes validations serveur, même invalidation de cache. Aucune route Store nouvelle, aucun workflow modifié, aucun champ ajouté. Les seuls composants storefront réellement modifiés sont ceux qui portent une hypothèse d'unicité — un unique sélecteur par page — que l'affichage en grille casse.

## User Stories

**Le client — parcourir la Carte**

1. En tant que client, je veux voir toute la Carte sur une seule page, section après section, afin de la parcourir comme une carte de restaurant plutôt que par pages successives.
2. En tant que client, je veux une barre de navigation des sections qui reste visible pendant que je fais défiler, afin de pouvoir sauter à n'importe quelle section sans remonter en haut de page.
3. En tant que client, je veux que cette barre mette en évidence la section que je suis en train de lire, afin de savoir où je me trouve dans une carte longue.
4. En tant que client, je veux qu'un clic sur une section m'y amène sans recharger la page, afin de ne pas perdre les choix que j'ai en cours sur d'autres cartes.
5. En tant que client, je veux qu'une section vers laquelle je saute s'affiche avec son titre visible et non masqué par la barre de navigation, afin de comprendre immédiatement où je viens d'arriver.
6. En tant que client, je veux voir une section entière d'un seul tenant, afin de comparer tous les plats qu'elle contient avant de choisir.

**Le client — commander depuis la Carte**

7. En tant que client, je veux voir pour chaque Produit les choix qu'il me reste à faire, afin de savoir ce que je peux commander sans ouvrir une page par plat.
8. En tant que client, je veux ajouter au panier un Produit qui n'a qu'une seule Variante en une seule action, afin que le cas le plus courant de la Carte ne me coûte aucun clic superflu.
9. En tant que client, je veux choisir la Variante d'un Produit qui en a plusieurs directement sur sa carte, afin de commander « Samoussas Bœuf » sans quitter la page.
10. En tant que client, je veux que le bouton d'ajout d'un Produit à plusieurs Variantes reste indisponible tant que je n'ai pas choisi laquelle, afin de ne jamais envoyer en cuisine une commande que personne ne peut préparer.
11. En tant que client, je veux remplir chaque Composant d'une Formule directement sur sa carte, afin de composer un Menu Midi sans ouvrir sa page dédiée.
12. En tant que client, je veux que le bouton d'ajout d'une Formule reste indisponible tant que tous ses Composants ne sont pas remplis, exactement comme sur sa page dédiée aujourd'hui.
13. En tant que client, je veux que le prix affiché sur la carte d'une Formule soit son prix fixe et ne bouge jamais selon ce que je choisis dans ses Composants, afin de ne jamais être surpris par le total.
14. En tant que client, je veux que les Composants d'une Formule ne me proposent que les Variantes que le restaurateur y a autorisées, exactement comme sur la page dédiée — la Carte ne doit ouvrir aucun choix que la Curation ferme.
15. En tant que client, je veux que mes choix sur une carte n'affectent jamais aucune autre carte de la page, afin de composer deux Formules différentes côte à côte sans qu'elles se mélangent.
16. En tant que client, je veux pouvoir ajouter deux fois le même Produit avec des choix différents, afin de commander deux Menus Midi qui n'ont pas la même entrée.
17. En tant que client, je veux un retour visible sur la carte au moment où j'ajoute au panier, afin de savoir que mon action a été prise en compte et de ne pas cliquer deux fois.
18. En tant que client, je veux composer un repas qui traverse plusieurs sections — une entrée, un plat, un dessert — sans jamais changer de page, afin que ma composition ne soit jamais interrompue par un chargement.

**Le client — le panier toujours visible**

19. En tant que client sur desktop, je veux voir en permanence à côté de la Carte le contenu de mon panier et son total, afin de suivre ma commande sans avoir à l'ouvrir après chaque ajout.
20. En tant que client sur desktop, je veux que cette colonne reste visible pendant tout le défilement de la Carte, afin de ne pas perdre mon panier de vue en arrivant aux desserts.
21. En tant que client, je veux que le panier se mette à jour immédiatement après un ajout, sans que la page se recharge, afin de ne pas perdre les choix en cours sur les autres cartes.
22. En tant que client, je veux voir dans ce panier ce que j'ai choisi pour chaque Composant d'une Formule, afin de vérifier ma commande avant de payer.
23. En tant que client, je veux pouvoir retirer un article depuis ce panier toujours visible, afin de corriger une erreur sans changer de page.
24. En tant que client, je veux atteindre le paiement depuis ce panier, afin de conclure ma commande depuis la page où je l'ai composée.
25. En tant que client avec un panier vide, je veux que cette zone me dise clairement qu'il est vide plutôt que de rester blanche, afin de comprendre qu'il ne s'agit pas d'un défaut d'affichage.
26. En tant que client sur mobile, je veux une barre toujours visible en bas de l'écran affichant le nombre d'articles et le total, afin de garder mon panier sous les yeux en parcourant la Carte.
27. En tant que client sur mobile, je veux qu'un appui sur cette barre ouvre mon panier en plein écran, afin de le consulter sur un écran où une colonne latérale serait illisible.
28. En tant que client sur mobile, je veux pouvoir refermer ce panier plein écran et retrouver la Carte là où je l'avais laissée, afin de ne pas recommencer mon défilement.

**Le client — le reste du parcours**

29. En tant que client qui veut plus de détail sur un plat — description longue, photos, informations complémentaires — je veux pouvoir atteindre sa page dédiée depuis sa carte, afin de ne rien perdre de ce qui existe aujourd'hui.
30. En tant que client, je veux qu'un lien direct vers la page d'un Produit continue de fonctionner et de me permettre de commander, afin qu'un lien partagé ou mis en favori ne devienne pas un cul-de-sac.
31. En tant que client, je veux qu'un lien direct vers une catégorie continue de fonctionner, afin qu'aucune adresse déjà partagée ne se mette à renvoyer une erreur.

**Le développeur**

32. En tant que développeur, je veux que la Carte et la page produit dédiée partagent les mêmes composants de sélection et d'ajout au panier, afin que la logique de choix, de prix et d'ajout ne soit jamais dupliquée ni ne diverge entre les deux surfaces.
33. En tant que développeur, je veux que l'état de sélection d'une carte reste strictement local à cette carte et ne s'écrive jamais dans l'URL de la Carte, afin que N cartes affichées ensemble n'entrent jamais en conflit sur un même paramètre de requête.
34. En tant que développeur, je veux que la synchronisation de la Variante choisie avec l'URL reste active sur la page produit dédiée, afin que le partage d'un lien pointant vers une Variante précise continue de fonctionner.
35. En tant que développeur, je veux qu'une carte consomme le Produit déjà chargé par la page plutôt que de le recharger pour son propre compte, afin qu'afficher toute la Carte ne coûte pas un aller-retour serveur par Produit.
36. En tant que développeur, je veux qu'un ajout au panier depuis la Carte déclenche la même invalidation de cache qu'un ajout depuis la page produit, afin que le panier latéral et la barre mobile se rafraîchissent sans mécanisme de synchronisation supplémentaire.
37. En tant que développeur, je veux que le chargement de la Curation d'une Formule reste isolé par carte, afin que la Carte s'affiche progressivement plutôt que d'attendre le chargement le plus lent.
38. En tant que développeur, je veux qu'aucun contrat serveur ne soit modifié par cette feature, afin que les garde-fous de la spec Formules restent vrais sans avoir à être revérifiés.
39. En tant que développeur, je veux que la carte distingue visuellement une Formule d'un Produit ordinaire, afin que le client comprenne qu'il s'apprête à composer plutôt qu'à choisir.

**Le restaurateur**

40. En tant que restaurateur, je veux décider de l'ordre dans lequel les sections apparaissent sur la Carte depuis l'admin, afin que les entrées précèdent les desserts sans qu'un développeur ait à redéployer quoi que ce soit.
41. En tant que restaurateur, je veux qu'un Produit rangé dans une sous-catégorie apparaisse quand même dans sa section, afin de ne jamais retirer un plat de la Carte sans l'avoir voulu.

## Implementation Decisions

### Une page unique pour toute la Carte, les sections en ancres

La Carte devient une page qui rend toutes ses sections à la suite, avec une barre de navigation collante dont les entrées sont des ancres vers ces sections et non des liens vers des routes. Le repère visuel de la section courante se met à jour au défilement.

Les routes de catégorie existantes ne sont pas supprimées : elles restent accessibles en chemin secondaire, comme les pages produit (User Story 31). Ce qui change est leur statut — elles cessent d'être le chemin par lequel on parcourt la Carte.

Deux détails de mise en œuvre que ce choix rend obligatoires, faute de quoi il se retourne contre le client : chaque section doit compenser la hauteur de la barre collante quand on saute vers elle, sinon son titre arrive caché dessous (User Story 5) ; et la barre doit rester utilisable sur mobile en défilement horizontal, comme le fait déjà la rangée de pastilles de catégories aujourd'hui.

### La Carte vit sur la route de listing existante, pas sur une route nouvelle

La page de listing du storefront (`/store`) est déjà intitulée « La carte » et charge déjà la liste des catégories. C'est elle qui devient la page Carte : aucune route n'est créée, et la rangée de pastilles de catégories qu'elle affiche aujourd'hui est remplacée par la barre d'ancres des sections.

### Les sections sont les catégories racines, ordonnées par le restaurateur

Une section de la Carte est une catégorie racine ; les sections se suivent dans l'ordre du `rank` de ces catégories, celui que l'admin Medusa permet de réordonner en glisser-déposer. Le chargement des catégories doit donc demander ce champ et trier dessus — il ne le fait pas aujourd'hui, et l'ordre d'affichage est par conséquent accidentel. L'ordre d'une carte de restaurant n'est pas cosmétique et appartient au restaurateur (User Story 40), pas à un tableau écrit en dur.

Une section liste les Produits de sa catégorie **et de toutes ses descendantes**. Dans Medusa, un Produit rangé dans une sous-catégorie n'appartient pas à sa catégorie parente : sans cette remontée, ranger un plat un cran plus bas le ferait disparaître de la Carte sans le moindre signal (User Story 41). Les sous-catégories ne sont pas affichées comme sous-titres — elles servent au rangement, pas à la lecture.

Medusa autorise par ailleurs un Produit à appartenir à plusieurs catégories : un plat rangé à la fois dans une section et dans l'une de ses sous-catégories est donc atteint deux fois par cette remontée, et ne doit apparaître qu'une seule fois dans la section.

### Les cartes consomment le Produit déjà chargé

C'est la décision qui rend la page unique tenable. Le chargement des Produits d'une section demande déjà au serveur les prix calculés et les quantités en stock de chaque Variante — c'est-à-dire exactement ce dont le sélecteur de Variante a besoin pour fonctionner. L'aiguillage actuel entre Formule et Produit ordinaire (`ProductActionsWrapper`), écrit pour une page produit qui ne connaît que l'identifiant du Produit, recharge le Produit pour son propre compte. Le réutiliser tel quel sur une grille referait ce chargement une fois par carte, pour des données déjà en main.

Décidé : en contexte Carte, la carte reçoit le Produit déjà chargé et le passe directement au sélecteur. Le coût d'affichage d'un Produit ordinaire tombe à zéro aller-retour supplémentaire. La page produit dédiée, elle, garde l'aiguillage qui charge — c'est son seul moyen de connaître le Produit.

Reste la Curation, qui n'est ni chargée ni chargeable avec les Produits : elle est lue par Produit, en parallèle et en cache forcé, et c'est aussi elle qui répond à la question « ce Produit est-il une Formule ? ». Ce coût est assumé pour une Carte qui se compte en dizaines de Produits. **Le jour où il gêne, la correction est un point d'accès Store de lecture groupée des Curations — pas de déduire qu'un Produit est une Formule à partir de sa catégorie.** Un Produit Formule rangé ailleurs que dans la section Formules s'afficherait alors silencieusement comme un plat ordinaire, sans sélecteur de Composants : exactement le genre de dérivation implicite qu'ADR 0001 a écartée pour la Curation elle-même.

Chaque carte porte sa propre frontière de chargement, jamais une frontière unique autour de la Carte entière : les cartes s'affichent au fur et à mesure que leurs Curations arrivent, plutôt que d'attendre la plus lente.

### La Carte ne pagine pas

La grille pagine aujourd'hui par douze. Lire une carte de restaurant par pages successives est un contresens, et la page unique le rendrait absurde. La pagination disparaît donc de la Carte au profit de l'affichage complet de chaque section.

C'est tenable précisément à cause de la décision précédente : sans le rechargement par carte, afficher toute la Carte coûte le chargement des Produits — que la page fait de toute façon — plus une lecture de Curation par Produit, en cache. C'est le domaine qui l'autorise : la Carte est le catalogue d'un restaurant, dimensionné en dizaines de Produits. Cette décision ne s'étend pas aux autres surfaces de listing du storefront, qui gardent leur pagination.

### La synchronisation d'URL de la sélection de Variante devient optionnelle

C'est le point technique central de cette feature. Le composant de sélection de Variante (`ProductActions`) écrit aujourd'hui la Variante choisie dans un paramètre de l'URL courante, et relit ce paramètre au montage. Sur une page produit, où une seule instance existe, c'est ce qui rend un lien partageable vers une Variante précise. Sur la Carte, où N instances coexistent sur la même URL, chaque sélection écraserait celle de toutes les autres cartes et la relecture ferait repartir une carte sur le choix d'une autre.

Décidé : ce comportement passe derrière une option du composant, activée par défaut — la page produit dédiée garde donc son comportement actuel sans changement — et explicitement désactivée sur la Carte. La sélection redevient alors un état purement local à l'instance.

Le composant de composition de Formule (`FormuleActions`) n'a pas ce défaut : son état de Sélection est déjà entièrement local et ne touche ni l'URL ni aucun paramètre de recherche. Il est réutilisable sans modification.

Le composant d'actions flottantes en bas d'écran, rendu par `ProductActions` quand la zone d'action sort du champ de vision, est également conçu pour une instance unique par page : il est désactivé sur la Carte, où la barre de panier persistante occupe cet emplacement.

### La carte n'est plus un lien qui enveloppe tout son contenu

La vignette actuelle (`ProductPreview`) enveloppe l'intégralité de son contenu dans un lien vers la page produit. Y insérer un sélecteur et un bouton produirait des contrôles imbriqués dans un lien : ouvrir une liste déroulante ou cliquer sur le bouton d'ajout déclencherait aussi la navigation.

Décidé : le lien vers la page produit se réduit à la zone descriptive de la carte — image et titre. La zone d'action en occupe le bas et n'est jamais dans le lien. La page dédiée reste ainsi atteignable (User Story 29) sans que le geste d'achat devienne ambigu.

### Deux présentations de carte, selon qu'il s'agit d'une Formule ou d'un Produit ordinaire

Une Formule et un plat ne se lisent pas de la même façon : un plat se choisit sur une image et une description, une Formule sur ce qu'elle contient. La carte d'une Formule met donc en avant son prix fixe et la liste de ses Composants ; celle d'un Produit ordinaire, son image, sa description courte et son prix. Les deux partagent la même ossature et la même zone d'action — seule la présentation diffère, pas le mécanisme.

### Le panier latéral et la barre mobile ne créent aucun nouvel état

Les composants qui rendent aujourd'hui le contenu du panier et son récapitulatif sont déjà des composants serveur qui lisent le panier courant et sont invalidés par l'étiquette de cache que l'ajout au panier invalide déjà. La colonne latérale desktop et le panier plein écran mobile rendent ces mêmes composants dans un nouveau conteneur de mise en page.

Conséquence recherchée : aucun état client de panier n'est dupliqué, aucun mécanisme de synchronisation n'est ajouté, et l'ajout depuis une carte rafraîchit le panier par le chemin qui existe déjà (User Story 36). Le panier plein écran mobile réutilise le contenu du panier déroulant existant, il n'en crée pas une seconde version.

### La mise en page bascule au point de rupture déjà utilisé dans le storefront

Au-dessus du point de rupture existant du storefront : deux colonnes, la Carte à gauche, le panier collant à droite. En dessous : une seule colonne, la colonne panier disparaît au profit de la barre fixe en bas de fenêtre qui ouvre le panier en plein écran. Aucun nouveau point de rupture n'est introduit — la page produit dédiée utilise déjà ce même seuil pour ses colonnes collantes.

### La page produit dédiée ne change pas de comportement, seulement de statut

Elle conserve son aiguillage Formule / Produit ordinaire, son chargement du Produit et sa synchronisation d'URL activée par défaut. Aucune route ne disparaît, aucun lien existant ne casse. Elle passe de « seul chemin d'achat » à « chemin secondaire », ce qui est une décision de parcours, pas une modification de code sur cette page.

## Testing Decisions

**Ce qui ferait un bon test ici** — le comportement observable, jamais l'implémentation (AGENTS.md) : ce que le panier contient après une suite de gestes, jamais l'état interne d'un composant ni l'ordre de ses rendus.

**Décidé : aucun seam automatisé n'est ouvert pour cette feature.** Le storefront de ce repo n'a aucune infrastructure de test — pas de script `test`, aucun exécuteur de tests dans ses dépendances. Le précédent est déjà posé par la spec Formules (§ *Volontairement non testé* : le sélecteur storefront est vérifié à la main, serveur de développement ouvert), qui l'assume pour le sélecteur de Composants que cette feature ne fait que déplacer.

Introduire ici un premier exécuteur de tests storefront — composant ou bout-en-bout — a été considéré et écarté : cette feature n'ajoute aucune logique, elle recompose des composants existants dont le comportement est déjà celui que la page produit exerce à chaque utilisation. Le premier test storefront de ce repo mérite d'être ouvert par une feature qui apporte une logique à protéger, pas par un déplacement de composants.

**La vérification est donc manuelle, et cette liste en est le contenu.** Serveur de développement ouvert, sur une Carte contenant à la fois des Produits ordinaires et des Formules :

- un Produit à Variante unique s'ajoute au panier en une action ;
- un Produit à plusieurs Variantes n'est ajoutable qu'une fois sa Variante choisie, et c'est bien la Variante choisie qui arrive au panier ;
- une Formule n'est ajoutable qu'une fois tous ses Composants remplis, et sa Sélection apparaît correctement dans le panier ;
- **le cas qui porte le risque de régression** : deux cartes de Formules composées en parallèle sur la même page, puis ajoutées l'une après l'autre — chacune doit arriver au panier avec sa propre Sélection, et choisir sur l'une ne doit rien changer sur l'autre ni sur aucune carte de Produit à plusieurs Variantes ;
- le même Produit ajouté deux fois avec deux choix différents produit bien deux lignes de panier distinctes ;
- le panier latéral et la barre mobile se mettent à jour après chaque ajout, sans rechargement de page, et sans réinitialiser les choix en cours sur les autres cartes ;
- la navigation par ancres amène bien à chaque section avec son titre visible sous la barre collante, sans recharger la page, et le repère de section courante suit le défilement ;
- réordonner les catégories depuis l'admin Medusa change bien l'ordre des sections de la Carte, sans redéploiement ;
- un Produit rangé dans une sous-catégorie seule apparaît bien dans la section de sa catégorie racine ; un Produit rangé à la fois dans la sous-catégorie et dans sa parente n'y apparaît qu'une fois ;
- **la non-régression de la page produit dédiée** : sur un Produit à plusieurs Variantes, choisir une Variante met toujours à jour l'URL, et ouvrir cette URL restitue bien la Variante — la garantie que rendre la synchronisation optionnelle n'a rien cassé ;
- **la non-régression des routes de catégorie** : une adresse de catégorie déjà partagée répond toujours ;
- aux deux largeurs, desktop et mobile : ouverture et fermeture du panier plein écran, position de défilement conservée à la fermeture.

Une vérification à ne pas oublier parce qu'elle ne se voit pas à l'écran : l'affichage de la Carte complète ne doit pas déclencher un chargement de Produit par carte (Implementation Decisions). Le nombre de requêtes serveur à l'affichage est le seul contrôle qui le prouve.

## Out of Scope

- **Toute modification du contrat d'ajout au panier, des hooks `validate` ou du contrat `metadata` de la Sélection.** Ce spec ne touche à rien côté backend ; il déplace l'endroit d'où le client déclenche des actions déjà validées par la spec Formules.
- **La suppression de la page produit dédiée et des routes de catégorie.** Décidé explicitement : elles restent, en chemin secondaire.
- **Un point d'accès de lecture groupée des Curations.** Écarté tant que le volume de la Carte ne le justifie pas ; son déclencheur et sa forme sont nommés dans les Implementation Decisions pour que le jour venu la solution ne soit pas improvisée.
- **Le comportement Commandes fermées** (la Carte reste consultable mais rien n'est commandable, faute de Créneau restant). Il n'est câblé aujourd'hui ni dans les sélecteurs existants ni dans ce spec. La Carte rend l'absence de garde-fou plus visible qu'avant — un bouton d'ajout par Produit au lieu d'un par page — mais le traiter reste un sujet à part entière, à rattacher à la spec Créneaux de retrait.
- **Le sélecteur de mode de récupération et le délai de retrait estimé** que la maquette montre dans la colonne panier. Ils relèvent du domaine du Retrait et de ses Créneaux, pas de la présentation de la Carte.
- **Le téléchargement du menu PDF et les informations allergènes** figurant en tête de la maquette : contenu statique sans rapport avec le parcours d'achat décrit ici. Le PDF est la Carte sur place, qui ne partage aucune donnée avec la Carte (CONTEXT.md).
- **La pagination des autres surfaces de listing du storefront**, qui n'est pas touchée.

## Further Notes

**Ce que cette feature rend plus urgent.** Une page où chaque Produit porte son bouton d'ajout rend l'absence de garde-fou Commandes fermées beaucoup plus visible qu'une page produit isolée : sur une Carte qui n'a plus de Créneau disponible, ce sont des dizaines de boutons d'ajout actifs, donc autant de promesses que le paiement refusera. Le garde-fou existe côté serveur ; c'est son reflet dans l'interface qui manque, et cette feature multiplie l'endroit où il manque.

**Il n'existe aucune Carte à afficher aujourd'hui.** Le script de peuplement du backend est encore celui de Medusa par défaut — des catégories Shirts, Sweatshirts, Pants, Merch. Rien de ce qui est décrit ici ne peut être vérifié à la main sans données de restaurant : des catégories racines classées, des Produits à Variante unique et à plusieurs Variantes, et au moins deux Formules curées. Constituer ce jeu de données est un préalable à la vérification, pas une étape optionnelle qui se règle en cours de route.

**Ce que la page unique impose au chargement, une fois pour toutes.** Tant que la Carte tenait en pages de catégorie paginées par douze, un chargement redondant par carte passait inaperçu. Sur une page qui rend l'intégralité de la Carte, il ne passe plus. La décision de consommer le Produit déjà chargé n'est donc pas une optimisation opportuniste : c'est ce qui rend la page unique possible, et c'est la première chose à revérifier si l'affichage de la Carte devient lent.
