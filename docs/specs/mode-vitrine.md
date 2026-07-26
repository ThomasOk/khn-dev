# Mode vitrine

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — cette spec ne les rejoue pas :
[ADR 0010](../adr/0010-mode-vitrine-is-switched-by-a-human-only.md) (le Mode vitrine ne s'allume ni ne s'éteint tout seul : ni dérivé des Créneaux, ni expirant),
[ADR 0009](../adr/0009-annonces-are-written-never-derived.md) (une Annonce est écrite, jamais dérivée — et son *Mode catalogue* s'appelle désormais Mode vitrine),
[ADR 0007](../adr/0007-separate-closing-calendars-per-module.md) (calendriers séparés par module : suspendre la commande ne ferme pas la salle),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md), section *La vitrine*.

Vocabulaire français du glossaire → identifiants anglais, comme partout ailleurs dans le repo :
`Mode vitrine → showcase mode / enabled`, `Note de vitrine → note`, module `showcase`.

## Problem Statement

Dans un restaurant, ce qui arrive arrive vite. La friteuse lâche à 11h40, le cuisinier ne s'est pas présenté, la livraison de nouilles n'est jamais venue. À cet instant précis, le site continue de prendre des commandes payées pour des plats que personne ne peut cuisiner, et chacune d'elles devient un client à rappeler, un remboursement à faire et un Avoir à écrire à la main.

Aujourd'hui, il n'existe **aucun moyen d'arrêter ça**. Les trois leviers en place demandent tous du temps ou ne servent pas à ça :

La **Fermeture exceptionnelle** ferme une ou plusieurs journées civiles entières. Elle sert à annoncer les congés d'août, pas à couper le service dans la minute — et elle ne sait pas dire « à partir de maintenant ».

Les **Horaires de retrait** se modifient dans l'admin, jour par jour, fenêtre par fenêtre. Réécrire l'horaire du mardi pour couper deux heures, puis le remettre demain, est un geste long, à faire deux fois, et facile à laisser à moitié fait.

L'**Annonce** ne pilote rien, par décision (ADR 0009). Publier « nous ne prenons plus de commandes » laisse le panier parfaitement fonctionnel derrière la bannière, ce qui est pire que se taire : le client lit le message, ajoute quand même, paie, et se présente au comptoir.

Il reste donc la seule option qui marche vraiment : couper le site. Ce qui fait aussi disparaître la Carte, les horaires, l'adresse et la page de Réservation de table — alors que le restaurant, lui, est ouvert et sert en salle.

Et symétriquement, rien ne permet de **dire un mot au client** à cet endroit-là. La bannière d'Annonce parle du restaurant en général, sur toutes les pages ; il n'existe aucune surface pour expliquer, là où le bouton a disparu, pourquoi il a disparu.

## Solution

**Pour le restaurateur.** Un interrupteur, dans un écran de réglages, qui suspend la commande en ligne immédiatement. À côté, un champ de texte facultatif : la **Note de vitrine**, une phrase qui sera montrée aux clients à l'endroit exact où l'on commandait. Le champ arrive pré-rempli d'une phrase toute faite qu'il peut garder, réécrire ou effacer. Tant que le Mode vitrine est actif, un bandeau rouge le lui rappelle sur **toutes** les pages de l'admin, avec le bouton pour rouvrir. Rien ne s'éteint tout seul : le mode dure jusqu'à ce qu'un humain le rebascule (ADR 0010).

Ce qu'il ne fait pas est aussi important : il ne touche pas aux Horaires, ne crée pas de Fermeture, ne publie pas d'Annonce, ne vide aucun panier et n'annule aucune Réservation de table. La salle continue de se remplir normalement.

**Pour le client.** La Carte reste entière — les sections, les photos, les descriptions, les prix. Ce qui disparaît, ce sont les moyens de commander : les sélecteurs de Variante, les boutons d'ajout, le bouton de paiement. À la place, un encadré porte la Note de vitrine, sur la Carte, sur les fiches produit et sur la page panier — les trois endroits où une action vient de lui être retirée. S'il avait déjà un panier, il le retrouve intact : rien n'est supprimé, il n'est simplement pas payable pour l'instant.

**Pour le système.** Un nouveau module `showcase` porte une ligne unique : un booléen et une note. Le storefront la lit et masque ; le backend **refuse le paiement** dans le hook de validation qui existe déjà, ce qui rend l'onglet resté ouvert, le cache d'un CDN et le lien direct vers le checkout sans effet. Le module ne lit rien d'autre : ni Créneau, ni Fermeture, ni Annonce, ni Produit (ADR 0010).

## User Stories

**Le restaurateur**

1. En tant que restaurateur dont la friteuse vient de lâcher, je veux suspendre les commandes en ligne en un geste, afin de ne pas encaisser des plats que ma cuisine ne peut pas produire.
2. En tant que restaurateur, je veux que la suspension prenne effet immédiatement et sans déploiement, afin de ne dépendre de personne au pire moment.
3. En tant que restaurateur, je veux rouvrir les commandes aussi vite que je les ai coupées, afin de reprendre le service dès que le problème est réglé.
4. En tant que restaurateur, je veux que suspendre la commande ne ferme pas la salle, afin de continuer à recevoir des Réservations de table pendant que le click & collect est à l'arrêt.
5. En tant que restaurateur, je veux que la suspension ne modifie ni mes Horaires de retrait ni mes Fermetures exceptionnelles, afin de ne rien avoir à reconstruire après coup.
6. En tant que restaurateur, je veux pouvoir écrire une phrase d'explication affichée aux clients, afin qu'ils sachent que le site n'est pas cassé.
7. En tant que restaurateur pressé, je veux que cette phrase soit facultative, afin de pouvoir couper d'abord et expliquer ensuite.
8. En tant que restaurateur, je veux trouver une phrase déjà écrite dans le champ, afin de n'avoir qu'à valider quand je n'ai pas le temps de rédiger.
9. En tant que restaurateur, je veux pouvoir effacer cette phrase pré-remplie, afin de ne jamais être forcé de publier une formulation qui n'est pas la mienne.
10. En tant que restaurateur, je veux corriger ma note pendant que le mode est actif, afin d'affiner le message sans rouvrir les commandes.
11. En tant que restaurateur, je veux préparer ma note à l'avance sans activer le mode, afin d'avoir le texte prêt le jour où j'en aurai besoin.
12. En tant que restaurateur, je veux savoir combien de caractères il me reste pendant que j'écris, afin de ne pas découvrir un refus au moment d'enregistrer.
13. En tant que restaurateur, je veux un rappel visible sur toutes les pages de l'admin tant que le mode est actif, afin de ne jamais laisser le site fermé sans le savoir.
14. En tant que restaurateur, je veux pouvoir rouvrir depuis ce rappel lui-même, afin de ne pas avoir à retrouver l'écran de réglages.
15. En tant que restaurateur, je veux que le mode ne s'éteigne jamais tout seul, afin qu'une panne plus longue que prévu ne rouvre pas les commandes dans mon dos.
16. En tant que restaurateur, je veux que les paniers de mes clients survivent à la suspension, afin qu'ils puissent payer sans tout recomposer quand je rouvre.
17. En tant que restaurateur, je veux que ma Carte reste entièrement visible pendant la suspension, afin que le site continue de faire son travail de vitrine.
18. En tant que restaurateur, je veux que suspendre les commandes n'efface pas l'Annonce que j'ai publiée, afin que mes deux messages ne se détruisent pas l'un l'autre.
19. En tant que restaurateur, je veux qu'aucun paiement ne puisse aboutir pendant la suspension, afin qu'un client resté sur une page ouverte ne passe pas au travers.

**Le client**

20. En tant que client, je veux continuer à consulter toute la Carte pendant la suspension, afin de savoir ce que le restaurant propose même si je ne peux pas commander maintenant.
21. En tant que client, je veux continuer à voir les prix, afin de pouvoir décider de venir sur place.
22. En tant que client, je veux comprendre pourquoi je ne peux pas commander, afin de ne pas croire que le site est en panne.
23. En tant que client, je veux lire cette explication à l'endroit où j'essayais de commander, afin de ne pas avoir à la chercher.
24. En tant que client arrivé directement sur une fiche produit depuis Google, je veux voir l'explication là aussi, afin de ne pas dépendre d'être passé par la Carte.
25. En tant que client qui ouvre son panier déjà rempli, je veux voir l'explication avant de chercher le bouton de paiement, afin de ne pas cliquer dans le vide.
26. En tant que client, je veux retrouver mon panier intact quand les commandes rouvrent, afin de ne pas recomposer mon repas.
27. En tant que client, je veux que les boutons d'ajout et de paiement soient absents plutôt que présents et inertes, afin de ne pas m'acharner sur un bouton mort.
28. En tant que client, je veux pouvoir réserver une table pendant que la commande en ligne est suspendue, afin de manger quand même au restaurant.
29. En tant que client, je veux que l'encadré ne ressemble pas à la bannière d'Annonce, afin de ne pas lire deux fois le même genre de message et finir par n'en lire aucun.
30. En tant que client au lecteur d'écran, je veux que l'encadré soit annoncé comme une information et non comme une alerte, afin de ne pas être interrompu.
31. En tant que client sur mobile, je veux que l'encadré tienne dans l'écran sans repousser toute la Carte hors de vue, afin de continuer à parcourir les plats.
32. En tant que client qui était déjà dans le tunnel de paiement au moment de la bascule, je veux être ramené sur mon panier avec l'explication, afin de ne pas me heurter à un refus au moment de payer.
33. En tant que client, je veux que le site reste entièrement navigable — accueil, à propos, contact, réservation — afin de trouver le téléphone du restaurant si j'ai vraiment besoin de commander.

**Le développeur**

34. En tant que développeur, je veux que le refus de commande vive dans le hook de validation qui existe déjà, afin de n'avoir qu'un seul endroit où l'on décide qu'un panier ne peut pas devenir une Commande.
35. En tant que développeur, je veux que le Mode vitrine soit refusé avant le contrôle de Créneau, afin que le client lise « les commandes sont suspendues » et non « ce créneau n'est plus disponible ».
36. En tant que développeur, je veux que le module `showcase` ne lise aucun autre module, afin qu'il reste supprimable en une fois.
37. En tant que développeur, je veux que la Note de vitrine ne parte jamais sur le fil quand le mode est éteint, afin qu'un brouillon préparé à l'avance ne fuite pas.
38. En tant que développeur, je veux que la politique de cache soit lisible au nom de la fonction appelée, afin de ne pas avoir à deviner quelle page lit un état frais.
39. En tant que développeur, je veux que masquer les moyens de commander se décide en un seul point par surface, afin que le jour où l'on ajoute un bouton d'ajout ailleurs, l'oubli se voie.

## Implementation Decisions

### Module backend

Nouveau module Medusa custom `showcase` sous `apps/backend/src/modules/showcase/`. Medusa 2.16 ne couvre nativement aucune notion de suspension de commande — désactiver le Sales Channel, la seule approche « native » plausible, rendrait les Produits invisibles et supprimerait donc la Carte elle-même, ce que cette feature existe précisément pour éviter.

Le loger dans `pickup` a été envisagé et écarté : `pickup` répond « quand peut-on retirer », le Mode vitrine répond « prend-on des commandes », et la seconde question survit à la première.

Modèle à **ligne unique**, sur le modèle de `PickupConfig` :

| Champ | Type | Notes |
|---|---|---|
| `id` | id, PK | |
| `enabled` | boolean | Faux par défaut. L'interrupteur. |
| `note` | text, nullable | La Note de vitrine. Éditable que le mode soit actif ou non. |

Aucune date, aucune période, aucun horodatage de bascule : le mode n'a pas de durée (ADR 0010).

L'absence de ligne en base signifie **mode éteint, note vide**. La lecture ne crée jamais de ligne ; seule l'écriture le fait, via un workflow d'upsert calqué sur `upsertPickupConfigWorkflow` (`AGENTS.md` : la logique métier ne va pas dans une route).

### Validation

Schéma zod dans les middlewares du module, sur le modèle de `apps/backend/src/api/admin/pickup/middlewares.ts` :

- `enabled` : booléen, obligatoire.
- `note` : trim, nullable, **280 caractères maximum**. Une chaîne vide après trim est enregistrée comme `null` — « pas de note » est un seul état, pas deux.

Aucune contrainte croisée : activer sans note est valide, écrire une note sans activer aussi. C'est la décision 6 du grilling — mettre un champ de saisie obligatoire entre le restaurateur et l'arrêt d'urgence est le pire endroit où le mettre.

### API admin

`GET /admin/showcase` → l'état courant. `POST /admin/showcase` → upsert des deux champs.

Pas de `DELETE` : l'état existe toujours, il vaut faux.

### API store

`GET /store/showcase` → `{ showcase_mode: boolean, note: string | null }`.

Quand `showcase_mode` est faux, `note` est **toujours `null` sur le fil**, même si une note est enregistrée en base. Une note préparée à l'avance n'est pas un contenu publié, et le storefront n'a aucun usage d'un texte qu'il ne doit pas afficher. Même principe que `/store/announcement`, qui ne transporte pas ses dates.

### Refus au paiement

Le contrôle s'ajoute au hook `completeCartWorkflow.hooks.validate` existant (`apps/backend/src/workflows/hooks/complete-cart.ts`), qui porte déjà la re-dérivation du Créneau et la revalidation des Sélections. Un seul hook `validate` par workflow, comme la spec Formules l'a établi — pas un second hook enregistré à côté.

Il s'exécute **en premier**, avant le contrôle de Créneau. L'ordre est une décision, pas un hasard : quand les deux échoueraient (mode actif *et* créneau périmé), le client doit lire que les commandes sont suspendues, et non un message sur son créneau qui l'enverrait en choisir un autre.

Le refus est une `MedusaError` de type `conflict` (409) — un refus délibéré du restaurant, pas une donnée invalide du client. Si la version installée ne mappe pas ce type, n'importe quel 4xx explicite convient : ce qui compte est que le storefront affiche le message et non une erreur générique.

**L'ajout au panier n'est pas refusé** (décision 2 du grilling). Fermer les routes cart natives une par une — line items, promotions, adresses — est une surface d'entretien réelle pour empêcher quelqu'un de remplir un panier qu'il ne peut de toute façon pas payer. Le point de non-retour est le paiement, et c'est là que la vanne est posée.

### Admin UI

**Écran de réglages** sous `settings/showcase`, à côté de `pickup`, `closures`, `announcements` et `table-reservation` : l'interrupteur, le champ note avec compteur de caractères affiché **pendant** la saisie, et l'enregistrement.

Quand le champ note est vide, il est **pré-rempli** d'une phrase suggérée — « La commande en ligne est momentanément suspendue. » — que le restaurateur garde, réécrit ou efface. C'est un défaut de formulaire, pas une règle du domaine, exactement comme la date de fin à +14 jours du formulaire d'Annonce. Aucune copie publique ne vit dans le rendu du storefront : ce qui s'affiche vient toujours de la base, donc toujours d'un humain qui a validé.

**Widget de rappel**, injecté sur la liste des commandes (`apps/backend/src/admin/widgets/`, art antérieur : `order-pickup-slot.tsx`, `formule-curation.tsx`). Il ne s'affiche **que** lorsque le mode est actif, en rouge, et porte un unique bouton « Réactiver les commandes ». Il n'allume pas : allumer est un geste délibéré qui passe par l'écran de réglages.

C'est le coût connu de la décision 12 : l'extinction est à un clic depuis n'importe où, l'allumage demande une navigation dans les réglages — y compris depuis un téléphone, en plein service, qui est pourtant le scénario d'origine. Assumé pour garder l'admin cohérent avec ses quatre autres écrans de réglages. Si la friction se révèle réelle à l'usage, la réparation est un bouton d'allumage ajouté au widget, pas une refonte.

### Storefront — lecture

`apps/storefront/src/lib/data/showcase.ts`, via le SDK Medusa et jamais un `fetch` brut (`AGENTS.md`), exportant **deux fonctions distinctes** :

- une lecture en `next: { revalidate: 60 }`, pour les pages publiques (Carte, fiches produit, accueil) — même politique que `retrieveAnnouncement`, et ce qui permet à la Carte de rester cachable ;
- une lecture en `cache: "no-store"`, pour le panier et le tunnel de paiement — pages déjà non cachées puisqu'elles dépendent du panier du client, donc la fraîcheur y est gratuite.

Deux fonctions nommées plutôt qu'un paramètre booléen : la politique de cache doit se lire sur le site d'appel, sans ouvrir la définition.

Conséquence acceptée : un bouton d'ajout peut survivre jusqu'à une minute sur une page publique après la bascule. Personne ne peut pour autant atteindre un paiement sans voir l'état réel, et le backend refuse de toute façon.

### Storefront — rendu

Nouveau dossier de feature `apps/storefront/src/modules/showcase/`, suivant le découpage existant.

**Ce qui disparaît** quand le mode est actif — partout, sans exception :

- sur la Carte : les sélecteurs de Variante et les boutons d'ajout des cartes Produit, Plat et Formule, le composeur de Formule, et le bouton de paiement de la colonne panier (desktop) comme de la barre panier (mobile) ;
- sur la fiche produit : les actions d'ajout, ordinaires comme Formule ;
- sur la page panier : le bouton de passage au paiement ;
- dans le menu déroulant du panier : le bouton de paiement ;
- partout ailleurs où un bouton d'ajout existerait (accueil, plat du moment).

Le **contenu** du panier reste affiché partout où il l'est aujourd'hui, colonne et barre comprises : le panier est conservé intact, seulement impayable (décision 8). L'icône panier du nav est conservée — la faire disparaître donnerait à croire que le panier a été vidé.

**L'encadré** s'affiche sur trois surfaces : la Carte, la fiche produit et la page panier. Il porte la Note de vitrine en texte brut, sauts de paragraphe préservés, jamais de `dangerouslySetInnerHTML`. Il est en région `role="status"` — il informe, il n'interrompt pas. Aucun bouton de fermeture, aucun lien, aucune persistance côté client.

**Il ne s'affiche pas s'il n'y a pas de note.** La Carte est alors simplement dépourvue de moyens de commander, sans explication — c'est la décision 6, prise en connaissance de cause, et le pré-remplissage du formulaire admin est ce qui la rend rare en pratique.

**Une étiquette d'état**, distincte de l'encadré, prend la place exacte des boutons retirés sur la colonne panier (desktop) et la barre panier (mobile) de la Carte, qu'il y ait une Note ou non — « Commandes suspendues », ou équivalent. Ce n'est pas une deuxième copie de repli : l'encadré porte l'*explication* du restaurateur et n'existe que si une Note a été écrite ; l'étiquette ne porte que l'*état*, au même titre que « Votre panier est vide » déjà en dur dans ces composants, et elle s'affiche dans tous les cas, y compris sur un panier vide — le cas dominant pendant la suspension, puisque plus personne ne peut y ajouter quoi que ce soit. La distinction est ce qui permet à l'étiquette de ne pas rejouer la phrase de repli que la décision 6 interdit : elle ne doit jamais dire *pourquoi*, seulement *que*. Ticket 05.

Traitement visuel **distinct de la bannière d'Annonce**, qui reste en haut du layout `(main)`, pleine largeur, et qui n'est ni masquée ni modifiée par le Mode vitrine (décision 13). L'encadré vit dans le flux de la page, là où le bouton était. Les deux peuvent coexister : la règle « une seule à la fois » du glossaire ne concerne que les Annonces entre elles.

**Le tunnel de paiement** : à l'entrée du groupe de routes `(checkout)`, une lecture fraîche ; si le mode est actif, redirection vers la page panier, qui porte l'encadré. Plutôt que de neutraliser chaque étape du tunnel, on ramène le client à l'endroit qui sait déjà expliquer la situation, et où son panier l'attend.

## Testing Decisions

Un bon test ici interroge les routes et vérifie ce qui est réellement persisté et servi. Il ne teste jamais une méthode interne du module, ni l'ordre des étapes d'un workflow, ni l'état d'un composant React (`AGENTS.md`).

**Un seul seam**, et c'est délibéré. Cette feature n'introduit **aucune dérivation pure** : pas de calcul de créneau, pas de fenêtre, pas d'horloge. Un booléen et une chaîne, lus et servis. Un test unitaire ne vérifierait ici qu'une lecture de champ.

**Seam — HTTP integration**, `apps/backend/integration-tests/http/showcase.spec.ts`, sur `medusaIntegrationTestRunner` comme les vingt specs existantes. Art antérieur direct : `announcements.spec.ts` (module de configuration récent, routes admin + route store, contrat public restreint), `complete-cart.spec.ts` (parcours complet d'un panier jusqu'à la commande) et `table-reservation-guard-rails.spec.ts` (refus attendus sur les routes admin).

Cas à couvrir :

- Base vierge : l'état admin et l'état store disent tous deux « éteint, pas de note », sans qu'aucune ligne n'ait été créée.
- Activation via la route admin, relue par la route admin puis par la route store.
- Note enregistrée puis servie ; note absente servie à `null`.
- **La note n'est pas servie quand le mode est éteint**, alors même qu'elle est enregistrée — le cas de la note préparée à l'avance.
- Extinction : la route store repasse à « éteint », et la note enregistrée cesse d'être servie.
- Validation : note au-delà de 280 caractères refusée, chaîne vide normalisée en `null`, espaces en tête et en fin retirés, `enabled` manquant refusé.
- **Finalisation de panier refusée** quand le mode est actif, avec le message de suspension.
- Finalisation de panier **acceptée** quand le mode est éteint — le test qui garantit que la vanne ne fuit pas dans l'autre sens.
- **Précédence** : mode actif *et* créneau invalide, le message rendu est celui de la suspension, pas celui du créneau.
- **L'ajout au panier reste accepté** pendant que le mode est actif : le comportement est délibéré (décision 2) et un test le documente, faute de quoi le prochain lecteur le corrigera comme un bug.
- Routes admin protégées : sans session admin, refus.

**Aucun test storefront.** `apps/storefront` n'a aujourd'hui aucune infrastructure de test — pas de runner, pas de script `test`, aucun fichier spec. Le masquage des boutons et l'encadré sont vérifiés à la main. C'est la même lacune consciente que la spec Annonces a déjà enregistrée, pas un oubli.

## Out of Scope

- **Propager `orders_open` à la Carte** : à 23h ou pendant une Fermeture exceptionnelle, la Carte garde ses boutons et le client rencontre l'état *Commandes fermées* au sélecteur de créneau, comme aujourd'hui. Décidé, motivé et enregistré dans l'ADR 0010.
- **L'écran de cohérence des trois leviers** (Fermeture exceptionnelle, Mode vitrine, Annonce) promis dans les conséquences de l'ADR 0009. Il reste à construire et reste le bon endroit pour réparer.
- **Toute expiration ou programmation** : date de fin, durée, réactivation automatique, planification horaire (ADR 0010).
- **Suspendre les Réservations de table.** La salle a sa Fermeture de réservation, geste distinct (ADR 0007).
- **Suspendre par Produit, par Variante ou par catégorie** — « plus de bœuf ce soir ». Autre besoin, autre feature, et il touche à la disponibilité, pas à la commande.
- **Masquer les prix ou une partie de la Carte.** La vitrine montre tout : c'est ce que « vitrine » veut dire.
- **Refuser l'ajout au panier** côté API (décision 2).
- **Vider les paniers existants** ou annuler des Commandes déjà payées (décision 8).
- **Prévenir le client de la réouverture** : inscription, notification, e-mail « on a rouvert ».
- **Afficher la Note de vitrine dans la bannière d'Annonce**, ou l'inverse. Les deux surfaces sont séparées et le restent (décision 13).
- **Un bouton d'allumage dans le widget admin** (décision 12, coût assumé et documenté).
- **Les commandes créées depuis l'admin** (draft orders) : le Mode vitrine parle du site public.
- **L'internationalisation.** Une seule langue, copie en français, comme le reste du storefront.
- **Les tests storefront**, qui demandent d'abord une décision sur un runner.

## Further Notes

**Le plafond de 280 caractères est le chiffre à confronter à la maquette**, comme les 90 caractères de l'accroche d'Annonce l'ont été. Il traduit « deux ou trois lignes dans un encadré, sans repousser la Carte hors de l'écran sur mobile ». Le baisser après coup tronquerait une note déjà enregistrée, donc mieux vaut le fixer avant la première utilisation réelle.

**La phrase pré-remplie n'est pas de la copie publique.** Elle vit dans le formulaire admin, jamais dans le rendu du storefront. Ce que le client lit vient toujours de la base, donc toujours de quelqu'un qui a cliqué « enregistrer ». C'est la distinction qui fait tenir ensemble les décisions 6 et sa synthèse — si un jour quelqu'un déplace cette phrase vers un `??` dans un composant de rendu, il annule la décision sans s'en apercevoir.

**Le Mode vitrine ne détruit rien et n'écrit nulle part ailleurs.** Pas de panier vidé, pas d'horaire modifié, pas de Fermeture créée, pas d'Annonce publiée. C'est ce qui rend la bascule sûre à faire dans la panique, et réversible en un clic — la propriété la plus importante de toute la feature.

**Le mode de défaillance est de rester fermé sans le savoir**, et il est silencieux : une liste de commandes vide ressemble exactement à une journée calme. Le widget de rappel est la seule chose qui s'y oppose. S'il devait un jour être déplacé, mis en option ou rendu discret, c'est ce paragraphe qu'il faut relire d'abord.
