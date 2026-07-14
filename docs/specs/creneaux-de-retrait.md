# Créneaux de retrait

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — ce spec ne les rejoue pas :
[ADR 0003](../adr/0003-creneaux-without-capacity.md) (un créneau n'a pas de capacité),
[ADR 0004](../adr/0004-creneau-in-order-metadata.md) (le créneau vit dans `order.metadata`),
[la recherche Medusa](../research/2026-07-14-medusa-pickup-et-creneaux.md) (toutes les citations de source),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md).

## Problem Statement

Un client peut aujourd'hui payer une commande sans que rien ne dise **quand** il vient la chercher.

Medusa modélise le *lieu* du retrait — une option de retrait rattachée au restaurant — mais son module Fulfillment ne porte **ni date ni heure**, nulle part. Le tunnel de commande se termine donc sur « Retrait au restaurant », sans heure. La cuisine reçoit des commandes qu'elle ne peut pas ordonner : elle ne sait pas si elle cuisine pour midi ou pour 13h30, et elle découvre le client au comptoir. Le client, lui, ne s'est engagé sur rien — il passe quand il veut, y compris quand le plat est froid ou pas encore commencé.

Symétriquement, le système ne sait rien de la disponibilité du restaurant. Il ne connaît pas les **Horaires de retrait** (qui ne sont pas les heures d'ouverture : le restaurant peut être ouvert et refuser le click & collect un samedi soir), il ignore les **Fermetures exceptionnelles** (le 15 août, un jour férié), et il n'a aucune notion de **Délai de préparation**. Conséquence concrète : rien n'empêche un client de commander à 11h48 pour 11h50, ni de commander le jour où le restaurant est fermé. La seule protection de la cuisine n'existe pas encore.

## Solution

**Pour le client.** Au moment de choisir le retrait dans le tunnel de commande, une liste de créneaux réels s'affiche — uniquement ceux qui sont *offrables maintenant* : dans les Horaires de retrait, hors Fermeture exceptionnelle, et suffisamment loin pour que la cuisine ait le temps. Il en choisit un, il paie, et son créneau figure sur la confirmation. Il ne peut pas payer sans avoir choisi. Si son créneau expire pendant qu'il est sur la page de paiement — le cas de 13h55, qui arrivera tous les jours — on le lui dit franchement et on le ramène à l'étape du choix, son panier intact, avec la liste rafraîchie. S'il ne reste plus aucun créneau aujourd'hui, il voit l'état **Commandes fermées** : la carte reste consultable, mais on ne le laisse pas payer pour rien.

**Pour le restaurateur.** Il règle lui-même, depuis l'admin, ses Horaires de retrait de la semaine, ses Fermetures exceptionnelles et son Délai de préparation. Aucune de ces valeurs n'est dans le code : la première sera fausse, et il doit pouvoir la corriger sans attendre un déploiement. Sur chaque commande, il lit le créneau en haut de la page, sans cliquer. Si un client appelle pour décaler son retrait, il le corrige lui-même.

**Pour le système.** Les créneaux ne sont jamais stockés un par un : ils sont **dérivés à la demande** des Horaires, moins les Fermetures, moins le Délai (ADR 0003). Le créneau choisi est écrit sur le panier et se propage nativement vers la commande (ADR 0004). Et il est **re-validé côté serveur au moment du paiement** — parce que `cart.metadata` est écrit par le client via une route publique, un créneau non validé n'est rien d'autre qu'un champ que le client contrôle.

## User Stories

**Le client**

1. En tant que client, je veux choisir l'heure à laquelle je viendrai chercher ma commande, afin de ne pas attendre au comptoir et de ne pas manger froid.
2. En tant que client, je veux ne voir que des créneaux réellement possibles, afin de ne pas choisir une heure que le restaurant refusera ensuite.
3. En tant que client, je veux que les créneaux trop proches de maintenant ne me soient pas proposés, afin de ne pas commander un plat que la cuisine n'a pas le temps de faire.
4. En tant que client, je veux voir les heures affichées à l'heure du restaurant, afin qu'un téléphone réglé sur un autre fuseau ne me fasse pas arriver une heure trop tôt.
5. En tant que client, je veux choisir mon créneau au même endroit que le retrait, afin de ne pas traverser une étape de plus dans un tunnel où j'ai faim.
6. En tant que client, je ne veux pas pouvoir passer au paiement sans avoir choisi de créneau, afin de ne pas découvrir mon oubli au moment de payer.
7. En tant que client dont le créneau vient d'expirer pendant que je payais, je veux un message clair et un retour au choix du créneau avec mon panier intact, afin de ne pas devoir tout recommencer.
8. En tant que client dont le créneau a expiré et pour qui il ne reste plus rien aujourd'hui, je veux qu'on me le dise, afin de ne pas boucler indéfiniment sur une liste vide.
9. En tant que client, je veux voir mon créneau sur la page de confirmation, afin d'avoir une trace de l'heure à laquelle je me suis engagé.
10. En tant que client qui arrive sur le site à 23h ou un jour de fermeture, je veux pouvoir consulter la carte mais comprendre immédiatement que je ne peux pas commander maintenant, afin de ne pas remplir un panier pour rien.
11. En tant que client, je veux que le créneau que j'ai choisi reste choisi si je reviens en arrière dans le tunnel, afin de ne pas le perdre en silence.

**Le restaurateur**

12. En tant que restaurateur, je veux définir mes Horaires de retrait pour chaque jour de la semaine, afin de n'accepter des retraits que quand j'ai les mains pour les servir.
13. En tant que restaurateur, je veux pouvoir définir plusieurs plages dans une même journée, afin de séparer le service du midi de celui du soir.
14. En tant que restaurateur, je veux que mes Horaires de retrait soient distincts de mes heures d'ouverture, afin de pouvoir être ouvert sans prendre de click & collect.
15. En tant que restaurateur, je veux déclarer une Fermeture exceptionnelle sur une date, afin qu'aucun créneau ne soit proposé un jour férié ou pendant la fermeture d'août.
16. En tant que restaurateur, je veux régler le Délai de préparation depuis l'admin, afin de pouvoir l'ajuster quand je découvre que ma première valeur était fausse — sans déploiement.
17. En tant que restaurateur, je veux régler la durée d'un créneau, afin de pouvoir passer de 15 à 20 minutes si le rythme ne tient pas.
18. En tant que restaurateur, je veux voir le créneau de retrait en haut de la page d'une commande, afin de le lire sans ouvrir le JSON.
19. En tant que restaurateur, je veux corriger le créneau d'une commande, afin de pouvoir décaler un client qui m'appelle.
20. En tant que restaurateur, je veux voir les commandes du jour groupées par créneau, afin de savoir ce que la cuisine doit sortir à midi et ce qu'elle peut sortir plus tard.
21. En tant que restaurateur, je veux qu'un changement d'horaire prenne effet immédiatement sur le site, afin de ne pas continuer à vendre des créneaux que je viens de supprimer.

**La cuisine**

22. En tant que cuisinier, je veux que chaque commande porte une heure de retrait, afin de pouvoir ordonner ma production plutôt que de tout cuisiner à l'arrivée.
23. En tant que cuisinier, je veux ne jamais recevoir une commande dont le créneau est déjà passé, afin de ne pas cuisiner pour quelqu'un qui est déjà reparti.

**Le système / celui qui reprendra le code**

24. En tant que développeur, je veux que le fuseau du restaurant soit la seule autorité horaire, afin qu'un changement d'heure ne décale pas les créneaux deux fois par an.
25. En tant que développeur, je veux que le créneau soit re-validé côté serveur au moment du paiement, afin qu'un client ne puisse pas se fabriquer un créneau en écrivant directement dans le panier.
26. En tant que développeur, je veux que le calcul des créneaux soit une fonction pure à horloge injectée, afin de pouvoir tester le changement d'heure sans attendre le mois d'octobre.
27. En tant que développeur, je veux que le créneau survive à un client qui revient en arrière et re-clique sur l'option de retrait, afin de ne pas livrer une commande sans heure et sans erreur (c'est exactement le piège que l'ADR 0004 rejette).
28. En tant que développeur, je veux que `pnpm test` à la racine exécute réellement des tests, afin de ne pas croire à une CI verte qui ne lance rien.

## Implementation Decisions

### Le module `creneaux`

Un module Medusa custom, propriétaire de la **configuration** du retrait — jamais des créneaux eux-mêmes, qui ne sont pas stockés (ADR 0003).

Trois modèles :

- **`HoraireRetrait`** — une plage hebdomadaire récurrente : jour de la semaine, heure de début, heure de fin (heures locales, pas des instants), et un drapeau actif. Plusieurs lignes peuvent viser le même jour, ce qui donne le service du midi et celui du soir.
- **`FermetureExceptionnelle`** — une date (jour civil, pas un instant) et un motif optionnel. Écrase les Horaires de ce jour-là, intégralement.
- **`ConfigurationRetrait`** — une ligne unique portant le **Délai de préparation** (en minutes) et la **durée d'un créneau** (en minutes). La durée du créneau n'est pas un nouveau concept du domaine : c'est le pas de découpage d'une plage d'Horaires, et sa place est ici, en configuration.

### La dérivation, et le fuseau horaire

Le cœur de la feature est une **fonction pure**, isolée du module, à **horloge injectée** :

```ts
deriverCreneaux(input: {
  horaires: HoraireRetrait[]
  fermetures: FermetureExceptionnelle[]
  configuration: ConfigurationRetrait
  maintenant: Date            // TOUJOURS injecté — jamais un `new Date()` à l'intérieur
}): Array<{ debut: Date; fin: Date }>
```

Aucun `new Date()`, aucune lecture d'horloge système, nulle part sous cette fonction. C'est ce qui rend le changement d'heure testable, et c'est la contrainte de conception la plus importante du spec.

**Le fuseau du restaurant fait autorité, et lui seul.** `Europe/Paris` est la référence, exposée comme une constante unique et partagée. Le serveur calcule les créneaux en heure de Paris ; le fuseau du navigateur du client **ne décide de rien**. Les créneaux sont transportés et stockés en **ISO 8601 avec offset** (`2026-07-14T12:15:00+02:00`), et **chaque rendu** — storefront, widget admin, ticket cuisine à venir — passe explicitement `timeZone: "Europe/Paris"` au formateur. Sans cette dernière précision, un client dont le téléphone est réglé sur Londres lirait « 11h15 » pour le créneau de 12h15 et arriverait une heure trop tôt : la recherche désigne ce point comme le bug le plus probable de la fonctionnalité.

Un créneau est offrable si, et seulement si : il tombe dans une plage d'Horaires active ; son jour n'est pas une Fermeture exceptionnelle ; et son début est postérieur à `maintenant + Délai de préparation`. Les commandes étant **same-day** (CONTEXT.md), la dérivation ne regarde que la journée en cours — un client ne commande jamais pour demain.

### Le contrat de la route Store

`GET /store/creneaux` renvoie :

```ts
{
  creneaux: Array<{ debut: string; fin: string }>   // ISO 8601 avec offset, ordre chronologique
  commandes_ouvertes: boolean
}
```

`commandes_ouvertes` n'est pas redondant avec `creneaux.length > 0` **pour le client de l'API** : c'est ce qui lui permet de distinguer *« il ne reste plus de créneau aujourd'hui »* (état Commandes fermées, message franc) d'une *erreur réseau* (liste vide par accident). Une liste vide sans ce drapeau est ambiguë ; c'est une information, pas une absence.

Le middleware de clé publiable et le CORS store s'appliquent automatiquement à tout le préfixe `/store`, routes custom comprises — le SDK JS envoie la clé, un `fetch()` nu échouerait. Le storefront passe donc par la couche SDK existante (`src/lib/data/`), conformément à `AGENTS.md`.

### Le checkout

Le choix du créneau vit **dans l'étape de retrait** (`?step=delivery`), pas dans une étape à part : dès que l'option de retrait est sélectionnée, la liste des créneaux s'ouvre en dessous. Une seule étape répond à « où et quand je récupère ».

Contrainte technique déjà établie et non négociable : **une option de retrait ne remonte que si le panier a une adresse**, parce que la service zone filtre sur le `country_code` de `shipping_address`. L'étape adresse doit donc rester avant — c'est déjà l'ordre actuel du tunnel. Pas d'adresse ⇒ pas d'option de retrait ⇒ pas de créneau.

Le créneau est écrit sur le panier via `POST /store/carts/:id`, en **deux clés plates de premier niveau** :

```
metadata.creneau_debut   // "2026-07-14T12:15:00+02:00"
metadata.creneau_fin     // "2026-07-14T12:30:00+02:00"
```

**Plates, impérativement** : le merge de metadata de Medusa est **plat**, et un objet imbriqué (`metadata.creneau = { debut, fin }`) serait écrasé en bloc à la prochaine écriture, pas fusionné. Deux instants plutôt qu'un début + une durée, parce que l'admin affiche le metadata en JSON brut et que l'admin est la source de vérité : deux instants se lisent tels quels.

Le bouton « passer au paiement » reste **désactivé tant qu'aucun créneau n'est choisi**.

Le passage panier → commande est **natif** : `completeCartWorkflow` recopie `cart.metadata` sur `order.metadata` verbatim. Aucun module, aucun lien, aucune route Store custom pour l'écriture (ADR 0004).

### La validation serveur

Un hook `validate` sur `completeCartWorkflow` — le **seul hook publiquement typé** de ce workflow, et le seul point qui s'exécute avant l'autorisation du paiement. Il **re-dérive** les créneaux offrables à cet instant précis et rejette avec un `MedusaError` de type `INVALID_DATA` :

- **aucun créneau sur le panier** → message distinct ;
- **créneau qui n'est plus offrable** (passé, sous le Délai, hors Horaires, jour fermé) → message distinct.

Ce n'est pas une ceinture et bretelles : un client peut rester quinze minutes sur la page de paiement pendant que son créneau expire. Valider au *choix* ne prouve rien ; seul le contrôle à la *complétion* compte.

### Le comportement quand la validation rejette

Le storefront attrape l'erreur au paiement, **conserve le panier**, ramène le client à l'étape de retrait avec un message explicite (« Votre créneau 13h45–14h00 n'est plus disponible ») et **une liste rafraîchie**. Si `commandes_ouvertes` est alors `false`, il affiche l'état **Commandes fermées** plutôt que de laisser le client tourner sur une liste vide. Pas de réattribution automatique : on ne décide pas de l'heure de retrait à la place du client.

### L'admin

- Une **page de réglages** pour les Horaires de retrait, les Fermetures exceptionnelles et la Configuration (Délai, durée). C'est elle qui rend vraie la phrase de CONTEXT.md : *« Configuration, not a constant in the code : the first value will be wrong and must be fixable without a deploy. »*
- Un **widget** sur la zone `order.details.before` de la page commande, affichant « Retrait — mercredi 15/07, 12h15–12h30 ». Il lit `order.metadata`, **déjà présent dans les props** : aucun appel réseau. Sans lui, le créneau existe mais personne ne le voit, et il finirait par être faux sans qu'on le sache.
- **La correction d'un créneau ne demande aucun code** : la route d'édition de metadata de la commande existe nativement dans le dashboard.

### Le seed : prérequis bloquant

Le seed actuel crée un fulfillment set de **livraison** (héritage du starter). Il faut un set de **retrait**, sinon rien de ce spec n'a de surface : pas d'option de retrait ⇒ pas d'étape ⇒ pas de créneau.

Trois valeurs à ne pas se tromper :

- `type` doit valoir **exactement `"pickup"`**. La doc officielle de Medusa donne l'exemple `"pick-up"` avec un tiret : **c'est un piège**. Avec un tiret, l'admin ne reconnaît pas le set comme un set de retrait et le filtre du storefront ne matche rien.
- La service zone a besoin d'une **geo zone `fr`**, même si rien n'est expédié — c'est elle qui fait remonter l'option au storefront.
- Provider `manual_manual`, prix 0, et les deux règles `enabled_in_store = "true"` et `is_return = "false"` (sans la première, l'option n'apparaît jamais côté client).

### Le monorepo

`turbo.json` déclare une tâche `test` et la racine expose `"test": "turbo test"`, mais le backend ne définit **aucun script `test`** — seulement `test:unit`, `test:integration:http` et `test:integration:modules`. Aujourd'hui `pnpm test` à la racine ne lance donc **rien, en silence**. Le backend gagne un script `test` qui enchaîne l'unitaire et l'intégration HTTP.

### Ce qui est explicitement rejeté

- **Stocker le créneau dans `shipping_methods[].data`.** Ça marche sans une ligne de backend, et c'est précisément ce qui le rend dangereux : le workflow d'ajout de shipping method **supprime puis recrée** les méthodes qui collident, et le storefront ne renvoie jamais `data`. Un client qui revient à l'étape retrait et re-clique sur l'option **perd son créneau en silence** — aucune erreur, aucun log. Rejeté par l'ADR 0004, et c'est l'approche que quelqu'un réinventera dans six mois « parce qu'elle marche ».
- **Un module custom lié à la commande, avec sa propre table de créneaux.** Ce serait encoder dans le schéma la capacité que l'ADR 0003 a refusée. C'est la bonne cible *le jour où* le créneau devient une ressource, pas avant.
- **Un filtrage serveur des commandes sur une clé de `metadata`.** Non vérifié, et délibérément non requis : les commandes sont same-day, `GET /admin/orders` filtre nativement sur `created_at` et renvoie déjà `metadata`. Le groupement par créneau se fait en mémoire sur les quelques dizaines de commandes d'un service. Il n'y a pas de requête à optimiser.

## Testing Decisions

**Ce qui fait un bon test ici : on teste le comportement observable, jamais l'implémentation.** Concrètement, on interroge les routes et on regarde ce qui a été persisté ; on n'assert jamais sur les méthodes internes du module, sur l'ordre des étapes d'un workflow, ni sur la forme d'un état React. Un test qui casse quand on renomme une fonction privée est un test à jeter.

**Prior art : il n'y en a aucun.** Ce spec produit **les premiers tests du repo**. Le `jest.config.js` du backend est celui du starter Medusa et réclame déjà un `integration-tests/setup.js` qui n'existe pas ; les trois scripts `test:*` sont, eux, déjà conformes à la doc Medusa. L'infra est à 90 % en place, elle n'a simplement jamais été branchée. Les conventions posées ici deviendront le prior art du reste du projet — raison de plus pour ne pas les bâcler.

### Seam 1 — intégration HTTP (`medusaIntegrationTestRunner`)

Le seam le plus haut, et celui qui porte le risque du projet. Le runner crée **une vraie base Postgres par fichier de test**, y joue les migrations, démarre l'app en process, et donne un client HTTP et le container.

Deux points d'entrée couvrent l'essentiel :

- **`GET /store/creneaux`** — les créneaux tombent dans les Horaires ; ceux qui sont sous le Délai de préparation sont absents ; une Fermeture exceptionnelle vide la journée ; `commandes_ouvertes` vaut `false` quand il ne reste rien.
- **`POST /store/carts/:id/complete`** — rejette un panier **sans créneau** ; rejette un créneau **qui n'est plus offrable** ; et, sur un créneau valide, la commande créée porte `creneau_debut` et `creneau_fin` **verbatim dans son `metadata`**.

Ce dernier assert est **le test le plus précieux de la feature** : c'est lui, et lui seul, qui vérifie la thèse centrale de l'ADR 0004 — que le créneau survit réellement au passage panier → commande — sur une vraie base plutôt que sur une lecture de code.

**Bootstrap requis** (à faire dans ce slice) :

- Créer `apps/backend/integration-tests/setup.js` — deux lignes, contenu officiel : importer `MetadataStorage` depuis `@medusajs/framework/mikro-orm/core` (chemin valable depuis la 2.11 ; vérifié présent en 2.16) et appeler `MetadataStorage.clear()`.
- Créer un **`.env.test`**. Piège vérifié dans la source : le runner **ignore `DATABASE_URL`** et reconstruit son URL depuis `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_PORT`. Le `.env` actuel ne suffit donc pas.
- Le runner **crée et détruit des bases** : l'utilisateur Postgres doit en avoir le droit. Vérifié sur cette machine : `medusa_user` a bien `rolcreatedb` — rien à changer côté Postgres.

### Seam 2 — la dérivation, en test unitaire pur

`TEST_TYPE=unit`, sur `deriverCreneaux` seule, avec `maintenant` injecté. C'est là que vit le bug annoncé, et c'est le seul endroit où on peut le provoquer à volonté :

- un créneau en heure d'**été** et le même en heure d'**hiver** ;
- **le dimanche du changement d'heure**, dans les deux sens (fin mars, fin octobre) ;
- un créneau **à cheval sur le Délai de préparation** (juste avant / juste après la limite) ;
- une **Fermeture exceptionnelle** sur le jour courant ;
- un jour **sans aucun Horaire** ;
- **deux services** dans la même journée (midi et soir) ;
- **la fin de service** — le dernier créneau offrable, puis plus rien : l'entrée dans Commandes fermées.

Vingt cas de ce genre passés par HTTP seraient vingt tests lents incapables de contrôler « maintenant ». Ici ils sont rapides et exacts. Le seam n'est pas un détour : il **force** la conception qui rend la feature correcte — une horloge injectée.

### Volontairement non testé

La page admin, le widget commande et l'UI du checkout. Aucune infra de test React n'existe dans ce repo, et ces trois surfaces sont des **vues** au-dessus des deux seams ci-dessus : les couvrir coûterait plus que ce qu'elles rapportent. Vérification à la main.

Le troisième runner de Medusa, `moduleIntegrationTestRunner` (`TEST_TYPE=integration:modules`), est **écarté sciemment** : il se placerait pile entre les deux seams retenus et n'apporterait rien. La moitié « stockage » du module créneaux est du CRUD générique que Medusa teste déjà chez lui ; la moitié « calcul » se teste mieux en pur. Ce serait un troisième seam qui duplique les deux autres.

## Out of Scope

- **La capacité d'un créneau.** Refusée par l'ADR 0003, et pour de bon : un créneau reste un label, jamais une ressource. Le déclencheur de la migration est nommé dans l'ADR 0004 — *le jour où l'on veut refuser une commande parce qu'un créneau est plein* — et **rien ne le surveille, délibérément**. Construire aujourd'hui un compteur d'alerte, ce serait déjà commencer à modéliser la capacité qu'on vient de refuser.
- **Le Ticket cuisine et la Notification de commande.** Slice séparé. Le ticket portera le créneau : ce spec le rend simplement disponible.
- **La Facture** (ADR 0002) et **les Formules** (ADR 0001). Slices séparés.
- **Le remplacement des données de seed par la vraie carte.** Séparé, sauf le set de retrait, qui est un prérequis bloquant traité ici.
- **Commander pour demain.** Les commandes sont same-day (CONTEXT.md), c'est ce qui garantit que la carte commandée est celle que la cuisine cuisine.
- **Changer son créneau après paiement, côté client.** Le restaurateur le fait pour lui depuis l'admin, avec l'édition native du metadata.
- **Le filtrage serveur des commandes par créneau.** Voir les décisions d'implémentation : non nécessaire, et non vérifié.
- **Une vue cuisine dédiée dans l'admin.** La liste des commandes du jour suffit dans un premier temps ; un groupement par créneau viendra si le besoin se confirme.
- **Toute infra de test côté storefront.** Rien n'est mis en place ici.

## Further Notes

Le cas de **13h55** — le client dont le créneau expire pendant qu'il est sur la page de paiement — n'est pas un cas limite exotique. C'est un événement **quotidien**, à chaque fin de service. Il mérite d'être traité comme un chemin normal du produit, pas comme une erreur technique : c'est la raison pour laquelle le comportement de reprise est spécifié ici plutôt que laissé à l'implémentation.

Deux pièges de la plateforme méritent d'être relus juste avant d'écrire du code, parce qu'ils échouent **en silence** : la chaîne `"pickup"` (et non `"pick-up"`, contrairement à l'exemple de la doc officielle), et le merge **plat** du metadata, qui écrase tout objet imbriqué au lieu de le fusionner. Aucun des deux ne produit d'erreur — ils produisent une feature qui a l'air de marcher.
