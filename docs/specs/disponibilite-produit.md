# Disponibilité d'un Produit par plage horaire

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — ce spec ne les rejoue pas :
[ADR 0013](../adr/0013-product-availability-evaluated-at-now.md) (la disponibilité s'évalue sur l'instant présent et jamais sur le Créneau choisi ; la Carte ne peut pas l'apprendre depuis `/store/products` ; le Hors carte ne se propage pas dans la Curation d'une Formule),
[ADR 0007](../adr/0007-separate-closing-calendars-per-module.md) (les calendriers ne se dérivent pas les uns des autres),
[ADR 0010](../adr/0010-mode-vitrine-is-switched-by-a-human-only.md) (ce que la page Carte peut lire sans casser son cache),
[ADR 0001](../adr/0001-formules-as-flat-priced-produits.md) et [ADR 0005](../adr/0005-formule-curation-via-module-selection-via-metadata.md) (la Curation est humaine, explicite, à la maille Variante),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md) (Carte, Produit, Variante, Formule, Curation, **Horaire de disponibilité**, **Hors carte**, Créneau de retrait, Horaires de retrait, Commandes fermées, Mode vitrine).

## Problem Statement

Tout ce qui est sur la Carte y est en permanence. Or une partie de l'offre de Kim-Hi Noodle n'existe qu'à certaines heures : la **Formule Menu Midi** est un service du midi, elle n'est ni cuisinée ni servie le soir. Aujourd'hui, à 20h, elle s'affiche sur la Carte exactement comme à 12h30, avec son prix et son bouton d'ajout au panier, et rien n'empêche un client de la composer, de la payer, et de choisir un Créneau de retrait à 20h45.

Ce que ça produit : une commande arrive en cuisine pour un plat que la cuisine ne fait pas à cette heure-là. Le client a payé. Personne ne s'en aperçoit avant le comptoir. Le seul recours est une Annulation avec remboursement, c'est-à-dire un client mécontent et une écriture comptable, pour une erreur que le système a laissé passer alors qu'il avait toute l'information pour la refuser.

Le contournement disponible aujourd'hui est manuel : dépublier le Produit à 14h et le republier à 11h30, tous les jours, à la main, dans l'admin. Ça sera oublié, et ça le sera précisément les jours de rush.

Rien dans le système ne sait qu'un Produit puisse n'exister qu'à certaines heures. Les **Horaires de retrait** disent quand le restaurant remet des commandes — pas ce qu'il sert. Le **Mode vitrine** suspend la boutique entière, pas un plat. Les **Commandes fermées** sont l'absence de Créneau, pas l'absence d'un plat.

## Solution

**Pour le restaurateur.** Sur la fiche d'un Produit dans l'admin, un widget permet de saisir ses **Horaires de disponibilité** : un motif hebdomadaire, une ligne par (jour, heure de début, heure de fin), plusieurs lignes possibles le même jour. « Menu Midi : mardi 11h30–14h00, mercredi 11h30–14h00, … ». Un Produit sans aucune ligne — le cas de presque toute la Carte — reste proposé en permanence : c'est de la configuration pour l'exception, pas un champ que chaque plat doit remplir.

**Pour le client.** En dehors de ses Horaires de disponibilité, le Produit est **Hors carte** : il ne figure plus sur la page Carte, et il ne peut pas être ajouté au panier. Sa page dédiée, elle, reste consultable — le lien partagé continue de fonctionner, et à la place du bouton d'ajout elle affiche les heures auxquelles le plat est servi. Le client qui tombe dessus à 20h apprend qu'il existe un Menu Midi à 13,90 € plutôt que de tomber sur une page morte.

**La règle, en une phrase.** Un Produit est à la carte si **l'instant présent** tombe dans l'un de ses Horaires de disponibilité — jamais en fonction du Créneau de retrait que le client choisira au checkout. Conséquence assumée et voulue (ADR 0013) : un Menu Midi commandé à 13h55 pour un retrait à 14h20 est une commande valide, et le même Menu Midi ajouté au panier à 14h05 est refusé quel que soit le Créneau visé.

**Pour le système.** Un module `availability` dédié, une ligne par (Produit, jour, début, fin). Une route Store en lecture seule expose l'état, lue avec la même tolérance d'une minute que le Mode vitrine — parce que la liste des produits est en `force-cache` et ne se périmerait jamais à 14h00 (ADR 0013). Deux hooks de validation refusent un Produit hors carte : à l'ajout au panier, pour donner tout de suite une erreur exploitable, et à la complétion du panier, avant l'autorisation du paiement, parce que la page de paiement a pu être ouverte avant que l'heure ne tourne.

## User Stories

**Le restaurateur — configurer**

1. En tant que restaurateur, je veux saisir les heures auxquelles un Produit est proposé, afin que ma Formule Menu Midi cesse d'être vendable le soir sans que j'aie à y penser.
2. En tant que restaurateur, je veux saisir ces heures **jour par jour**, afin de pouvoir servir le Menu Midi du mardi au vendredi et pas le samedi, où je ne fais que la carte.
3. En tant que restaurateur, je veux pouvoir saisir plusieurs plages le même jour, afin d'exprimer un produit servi au déjeuner **et** au dîner sans devoir en créer deux.
4. En tant que restaurateur, je veux saisir ces heures **sur la fiche du Produit concerné**, afin de répondre à « quand est servi le Menu Midi ? » à l'endroit même où je regarde le Menu Midi.
5. En tant que restaurateur, je veux qu'un Produit sans aucun horaire reste proposé en permanence, afin de ne rien avoir à saisir pour les dizaines de plats qui n'ont pas d'heure.
6. En tant que restaurateur, je veux pouvoir désactiver une plage sans la supprimer, afin de suspendre le service du samedi midi pendant l'été sans perdre sa saisie.
7. En tant que restaurateur, je veux que le formulaire refuse une heure de fin antérieure ou égale à l'heure de début, afin de ne jamais enregistrer une plage qui ne s'ouvrira jamais.
8. En tant que restaurateur, je veux pouvoir modifier ou supprimer une plage à tout moment, afin de changer l'heure de mon service sans passer par un développeur.
9. En tant que restaurateur, je veux que mes modifications s'appliquent sans redéploiement et sans republier le Produit, afin de décaler mon service du midi le matin même.
10. En tant que restaurateur, je veux que le widget soit disponible sur **tous** les Produits et pas seulement sur les Formules, afin de pouvoir un jour donner des heures à un plat qui n'est pas une formule.
11. En tant que restaurateur, je veux que ces heures soient exprimées dans l'heure locale du restaurant, afin que 11h30 reste 11h30 des deux côtés du changement d'heure.

**Le client — la Carte**

12. En tant que client consultant la Carte à 20h, je ne veux pas voir la Formule Menu Midi, afin de ne pas composer une commande que le restaurant ne servira pas.
13. En tant que client consultant la Carte à 12h30, je veux voir la Formule Menu Midi exactement comme les autres Produits, afin de la commander normalement.
14. En tant que client, je veux que la section « Nos formules » disparaisse entièrement quand aucune de ses formules n'est à la carte, afin de ne pas lire un titre suivi d'un vide.
15. En tant que client, je veux que la barre de navigation des sections ne propose que des sections qui existent réellement sur la page, afin qu'un clic ne me laisse jamais sur place sans rien faire.
16. En tant que client, je veux que la Carte s'affiche aussi vite qu'avant, afin que cette règle d'affichage ne se paie pas en temps de chargement.
17. En tant que client, je ne veux pas voir un Produit apparaître puis disparaître sous mes yeux après l'affichage de la page, afin de ne pas croire à un bug.

**Le client — la page d'un Produit hors carte**

18. En tant que client suivant un lien vers un Produit hors carte, je veux que sa page s'affiche normalement, afin qu'un lien partagé ou un résultat de recherche ne me mène jamais à une page d'erreur.
19. En tant que client sur la page d'un Produit hors carte, je veux lire à quelles heures il est servi, afin de savoir quand revenir.
20. En tant que client sur la page d'un Produit hors carte, je ne veux pas de bouton d'ajout au panier, afin de ne pas tenter une action qui sera refusée.
21. En tant que client, je veux que le prix du Produit reste affiché même hors carte, afin de savoir ce que coûte le Menu Midi avant de décider de revenir demain.

**Le client — le panier et le paiement**

22. En tant que client cliquant sur « ajouter » depuis une page ouverte avant 14h00, je veux un refus immédiat et compréhensible, afin de ne pas découvrir le problème au moment de payer.
23. En tant que client recevant ce refus, je veux qu'il nomme le Produit et ses heures — « Le Menu Midi n'est servi que de 11h30 à 14h00 » — afin de comprendre sans deviner.
24. En tant que client, je ne veux pas pouvoir augmenter la quantité d'une ligne devenue hors carte, afin de ne pas contourner le refus par une autre porte.
25. En tant que client dont le panier contient un Produit devenu hors carte, je veux être arrêté **avant** que mon paiement ne soit autorisé, afin de ne jamais payer pour une commande que la cuisine ne préparera pas.
26. En tant que client arrêté au paiement, je veux pouvoir retirer la ligne en cause et poursuivre, afin de ne pas recomposer tout mon panier.
27. En tant que client ayant commandé et payé à 13h55 un Menu Midi pour un retrait à 14h20, je veux que ma commande soit acceptée, afin de ne pas être puni d'avoir commandé pendant le service.

**La Formule et la Curation**

28. En tant que client, je veux qu'une Formule à la carte reste remplissable même si l'un des plats qu'elle propose est lui-même hors carte, afin de ne pas voir une Formule devenir incomplétable sans explication.
29. En tant que restaurateur, je veux voir les heures d'une Variante à côté de son nom sur l'écran de Curation, afin de m'apercevoir que je suis en train de curer un plat du soir dans une formule du midi.
30. En tant que client, je veux que la Formule Menu Midi hors carte soit refusée au panier même si tous les plats qu'elle contient sont, eux, disponibles, afin que l'heure de la Formule prime sur celle de ses composants.

**La cohérence avec le reste du domaine**

31. En tant que client, je veux qu'un jour de Fermeture exceptionnelle la Carte reste consultable avec ses formules du midi visibles à midi, afin que la fermeture du retrait ne réécrive pas la carte.
32. En tant que restaurateur, je veux que mes Horaires de disponibilité soient indépendants de mes Horaires de retrait, afin qu'ouvrir le click & collect le samedi soir ne remette pas le Menu Midi en vente le samedi soir.
33. En tant que restaurateur, je veux continuer à retirer un plat de la Carte sur-le-champ en le dépubliant dans l'admin Medusa, afin de ne pas avoir deux interrupteurs à vérifier quand un plat n'apparaît pas.
34. En tant que restaurateur en Mode vitrine, je veux que la Carte se comporte comme avant — consultable, sans commande — indépendamment des Horaires de disponibilité, afin que les deux mécanismes ne se masquent pas l'un l'autre.

**Le développeur**

35. En tant que développeur, je veux que l'affichage et le refus dérivent de la **même fonction pure**, afin que la Carte ne puisse jamais proposer ce que le paiement refusera.
36. En tant que développeur, je veux que cette fonction prenne son horloge en paramètre, afin de pouvoir provoquer à la demande la minute de bascule et le changement d'heure.
37. En tant que développeur, je veux que la page Carte n'apprenne pas cet état depuis `/store/products`, afin de ne pas livrer une feature qui marche en dev et jamais en production.
38. En tant que développeur, je veux que le contrôle Hors carte s'ajoute aux hooks de validation existants plutôt que d'en enregistrer de nouveaux, afin qu'il n'y ait qu'un seul endroit où lire ce qu'un panier doit satisfaire.
39. En tant que développeur, je veux que la route Store expose aussi les horaires bruts et pas seulement le booléen, afin que la page produit puisse écrire « servi de 11h30 à 14h00 » sans second appel.

## Implementation Decisions

### Un module `availability`, pas une extension de `pickup` ni de `formule`

Un module Medusa dédié, `availability`, avec un unique modèle `AvailabilitySchedule` :

| champ | type | note |
|---|---|---|
| `id` | id | préfixe dédié, cohérent avec `fcomp`/`formule` |
| `product_id` | text | colonne simple, comme `Formule.product_id` — pas de Module Link |
| `day_of_week` | number | `0` = dimanche … `6` = samedi, convention `Date.getDay()`, identique à `pickup_schedule` |
| `start_time` | text | `"HH:MM"` locale `Europe/Paris`, jamais un instant |
| `end_time` | text | idem |
| `active` | boolean | défaut `true` |

Pas de Module Link vers `Product` : une ligne appartient à un Produit et à un seul, et `Formule.product_id` est le précédent exact dans le module voisin. Le Link reste réservé au vrai many-to-many, celui de la Curation vers `ProductVariant`.

Pas dans `pickup` : ce module porte **le retrait**, et y loger la carte du midi rendrait faux son propre glossaire. Pas dans `formule` : la règle est attachée au Produit (ADR 0013), la restreindre aux Formules serait un couplage arbitraire à défaire au premier plat du midi hors formule.

### La dérivation : une fonction pure partagée, horloge injectée

Une fonction `isOnCarteAt({ schedules, now })` dans `src/lib/availability/`, sans conteneur, sans base, sur le modèle de `deriveSlots` :

- `schedules` vide (aucune ligne pour ce Produit) ⇒ **à la carte**. C'est le défaut de presque toute la Carte.
- Une ligne `active: false` est ignorée.
- Une ligne compte si `day_of_week` est le jour civil parisien de `now` **et** si les minutes-depuis-minuit de `now` vérifient `start_time <= now < end_time`. **Borne de début incluse, borne de fin exclue** : à 11h30:00 pile le Produit est à la carte, à 14h00:00 pile il est hors carte. Cohérent avec `deriveSlots`, qui n'offre aucun créneau commençant à `end_time`.
- Plusieurs lignes ⇒ **union** : à la carte si au moins une correspond.

Cette fonction est la seule source de vérité, consommée par la route Store et par les deux hooks — le même contrat que `getOfferableSlots` remplit pour les Créneaux, et pour la même raison : deux dérivations séparées dérivent l'une de l'autre en silence.

### Le contrat Store : une route dédiée, `revalidate: 60`

`GET /store/product-availability`, lecture seule, sans authentification, réponse pour **les seuls Produits ayant au moins un `AvailabilitySchedule` actif** :

```
{
  availabilities: [
    {
      product_id: string,
      available_now: boolean,
      schedules: [{ day_of_week: number, start_time: string, end_time: string }]
    }
  ]
}
```

Champs en anglais (AGENTS.md). Un Produit **absent** de la réponse n'a aucun horaire et est donc à la carte en permanence — c'est le cas par défaut, et il ne coûte pas un octet. Les lignes `active: false` ne sortent pas de la route : ce qu'elle expose est ce que le client peut lire (« servi de 11h30 à 14h00 »), pas la saisie de l'admin.

`available_now` est dérivé **côté serveur** par `isOnCarteAt`. Les `schedules` sont là pour la page produit (User Story 19), qui n'a donc pas de second appel à faire.

Côté storefront, une fonction de `src/lib/data/` lit cette route avec `next: { revalidate: 60 }` — la forme exacte de `retrieveShowcase`, sur la même page, pour la même raison. Elle est appelée **dans le `Promise.all` du shell** de la page Carte, en parallèle de `listCategories` et `retrieveShowcase`, et le résultat est passé aux sections comme `orderPossible` l'est déjà. Aucune lecture non cachée, aucun appel depuis le navigateur : le HTML arrive avec le Produit déjà retiré (User Story 17).

### L'admin : un widget sur la fiche Produit

Zone `product.details.after` (ou équivalent), sur **toutes** les fiches Produit. Le widget liste les plages groupées par jour, dans l'ordre jour puis heure de début, et offre créer / modifier / supprimer / activer-désactiver. Sa forme et son ergonomie recopient `schedules-section.tsx` du module `pickup` — `Select` mono-jour compris. Deux écrans qui font la même chose doivent se manipuler de la même façon ; inventer ici une saisie multi-jours créerait deux ergonomies pour un seul geste.

Routes admin, sur le modèle de `/admin/formules/[product_id]/composants` :

- `GET | POST /admin/availability/[product_id]/schedules`
- `POST | DELETE /admin/availability/[product_id]/schedules/[id]`

Validation zod recopiée de `CreateScheduleSchema` / `UpdateScheduleSchema` (module `pickup`) : `day_of_week` entier 0–6, `start_time`/`end_time` sur la regex `HH:MM` 24h, `active` booléen optionnel, et le `refine` `start_time < end_time`. Les chevauchements sont **autorisés** et simplement unis — contrairement aux Périodes d'annonce, refusées à la saisie, et l'asymétrie est justifiée dans l'ADR 0013. Les écritures passent par des workflows, sur le modèle de `src/workflows/pickup/manage-schedules.ts`.

### La validation serveur : les hooks existants, étendus

Aucun nouveau hook enregistré (User Story 38). Le contrôle Hors carte s'ajoute là où le contrôle de Sélection vit déjà :

- **`src/workflows/hooks/cart-line-items.ts`** — `addToCartWorkflow.hooks.validate` et `updateLineItemInCartWorkflow.hooks.validate`. Chaque ligne dont la `variant_id` appartient à un Produit hors carte est refusée. `updateLineItemInCartWorkflow` est concerné pour la User Story 24 : augmenter la quantité d'une ligne devenue hors carte est une vente, et doit être refusée comme un ajout.
- **`src/workflows/hooks/complete-cart.ts`** — le contrôle rejoint la boucle par ligne existante, **à côté** de `assertValidFormuleSelection`. L'ordre du hook ne change pas : Mode vitrine → Créneau → boucle par ligne. Un panier doublement invalide signalera donc le Créneau d'abord, ce qui est déjà le comportement entre Créneau et Sélection.

Le hook reçoit une `variant_id` ; la résolution vers le `product_id` puis vers les horaires suit le chemin que `assertValidFormuleSelection` emprunte déjà pour remonter d'une Variante à sa Formule.

Le refus est un `MedusaError` de type `INVALID_DATA` — donnée du client devenue invalide, comme le Créneau périmé et la Sélection décurée, et non un `CONFLICT`, réservé au refus délibéré du restaurateur qu'est le Mode vitrine. Le message nomme le Produit et ses heures du jour (User Story 23).

### Le storefront : Carte, page produit, barre de nav

- **La page Carte** filtre les Produits dont `available_now` est `false` avant de les rendre. `CarteSection` retourne déjà `null` quand il ne reste aucun produit, donc une section entièrement hors carte disparaît sans code supplémentaire (User Story 14).
- **`CarteSectionNav`** ne garde que les entrées dont la section est réellement présente dans le DOM. C'est un composant client qui mesure déjà le DOM et observe déjà ces ancres ; le filtrage se fait là. Défaut préexistant — une catégorie vide le produit déjà — mais rendu quotidien par cette feature, donc corrigé ici (ADR 0013).
- **La page d'un Produit** hors carte reste rendue, avec son titre, son image, sa description et son prix. Le bloc d'ajout au panier est remplacé par la mention des heures de service, construite depuis les `schedules` de la route. Aucun `notFound()`, jamais : l'URL ne doit pas alterner 200 et 404 plusieurs fois par jour.
- **L'écran de Curation** affiche l'Horaire de disponibilité à côté du nom de la Variante — « Nems du soir *(servi 18h–22h)* » (User Story 29). C'est la seule mitigation du choix de ne pas propager le Hors carte dans la Curation.

### Ce que cette feature ne dérive de rien

Une **Fermeture exceptionnelle** n'a aucun effet sur un Horaire de disponibilité, et les **Horaires de retrait** non plus : les trois calendriers sont indépendants et saisis séparément (ADR 0007, ADR 0013). Le **Mode vitrine** et le **Hors carte** ne se lisent pas l'un l'autre — le premier retire la commande de toute la Carte, le second retire un plat de la Carte, et ils peuvent parfaitement être vrais en même temps sans que rien n'ait à arbitrer.

## Testing Decisions

**Ce qui fait un bon test ici : le comportement observable** (AGENTS.md) — ce que la route renvoie, ce que la route accepte ou refuse, ce qui est persisté. Jamais l'ordre d'appel interne d'un hook, jamais une méthode de service, jamais l'état d'un composant React.

### Seam 1 — la dérivation pure, en test unitaire

`src/lib/availability/__tests__/*.unit.spec.ts`, calqué sur `src/lib/slots/__tests__/derive-slots.unit.spec.ts` — dont le commentaire dit qu'il est « the only place the daylight-saving bug can be provoked on demand ». Horloge injectée, aucune base. C'est le seam le plus haut de toute la logique horaire, et il doit couvrir de façon exhaustive :

- aucun horaire ⇒ à la carte ;
- l'instant **exactement à `start_time`** ⇒ à la carte ; l'instant **exactement à `end_time`** ⇒ hors carte ;
- une minute avant `start_time`, une minute avant `end_time` ;
- le bon jour de semaine vs le jour suivant à la même heure ;
- une ligne `active: false` ignorée, y compris quand elle est la seule ;
- deux plages le même jour, dont l'union couvre un instant qu'aucune ne couvre seule ;
- un instant en heure d'hiver et un en heure d'été, pour prouver que `"11:30"` reste 11h30 de part et d'autre du changement d'heure — le bug qui coûte le plus cher et qu'aucun autre seam ne peut provoquer.

### Seam 2 — la route Store et le refus à l'ajout, en intégration HTTP

Nouveau fichier `integration-tests/http/product-availability.spec.ts`, sur `medusaIntegrationTestRunner`, contre une vraie base Postgres jetable. Il sème ses horaires **relativement à l'horloge réelle de Paris** via les helpers de `paris-time.ts`, comme le font déjà `pickup-slots.spec.ts` et `complete-cart.spec.ts`. Prior art de forme : `pickup-slots.spec.ts` pour la route, `formule-add-to-cart.spec.ts` pour le refus à l'ajout.

- `GET /store/product-availability` : un Produit sans horaire est **absent** de la réponse ; un Produit avec une plage englobant l'instant courant est présent avec `available_now: true` et ses horaires ; un Produit dont la seule plage est passée est présent avec `available_now: false` ; une plage `active: false` ne sort pas.
- `POST /store/carts/:id/line-items` avec la Variante d'un Produit hors carte est **refusé**, et la ligne n'est pas créée. La même requête pour un Produit à la carte passe.
- `POST` d'augmentation de quantité sur une ligne dont le Produit est devenu hors carte est refusé.

### Seam 3 — le refus avant paiement, dans le fichier existant

Extension de `integration-tests/http/complete-cart.spec.ts`, qui monte déjà la fixture Formule + Créneau et porte l'assertion qui compte. Un panier contenant un Produit hors carte est refusé à `POST /store/carts/:id/complete`, **avant capture** : `payment_collection.payment_sessions[0].status` reste `"pending"` — exactement l'assertion que ce fichier utilise déjà pour le Créneau périmé et la Sélection décurée. Et le cas symétrique, celui de la User Story 27 : un panier dont le Produit est encore à la carte au moment du paiement est accepté même si le Créneau choisi tombe après la fin de la plage.

### Volontairement non testé

Le widget d'admin, le rendu de la page Carte, le filtrage de la barre de navigation et la page d'un Produit hors carte : vérification à la main, dev server ouvert. Même précédent que le CRUD admin du module `pickup` et que l'écran de Curation (spec Formules, § *Volontairement non testé*) — le storefront de ce repo n'a aucun framework de test.

## Out of Scope

- **La disponibilité à la maille Variante.** « La grande soupe seulement le soir » est inexprimable, par décision (ADR 0013). La réponse, si le besoin arrive, est deux Produits ou la réouverture de l'ADR — pas une colonne de plus.
- **La propagation du Hors carte dans la Curation d'une Formule.** Un Produit hors carte reste choisissable dans un Composant. La cascade que le filtrage déclencherait est détaillée et refusée dans l'ADR 0013 ; la seule chose faite ici est l'affichage des heures sur l'écran de Curation.
- **Un interrupteur « retirer ce produit maintenant ».** Le `status` du Produit dans l'admin Medusa le fait déjà.
- **Les plages à cheval sur minuit.** `start_time < end_time` est imposé. Aucun Créneau ne franchit minuit non plus, donc rien n'est vendable de l'autre côté.
- **Les périodes datées** (« Menu de Noël du 15 au 31 décembre »). C'est un motif *hebdomadaire*, pas un calendrier. Une offre saisonnière se publie et se dépublie.
- **Un avertissement dans le panier** quand un Produit qu'il contient passe hors carte. Le client le découvre au paiement, avec le message de récupération. Le faire dans le panier demanderait une lecture non cachée à chaque affichage, pour le seul client à cheval sur 14h00.
- **Le Ticket cuisine et la Facture** ne changent pas : une commande acceptée est une commande normale, et rien de cette feature n'y laisse de trace.

## Further Notes

Le point le plus facile à mal implémenter est le **cache**. Un filtrage posé dans `/store/products` passerait tous les tests manuels en développement — où le cache est froid à chaque rechargement — et ne marcherait jamais en production, où le `force-cache` de `listProducts` n'est invalidé que par une écriture produit. C'est le motif entier de la route dédiée, et l'ADR 0013 le documente pour que personne ne « simplifie » cette route plus tard.

Le second point sensible est la **borne de fin exclue** (`start_time <= now < end_time`). Elle est encodée dans le Seam 1 et doit y rester : c'est la seule définition écrite de ce que « servi de 11h30 à 14h00 » veut dire, et un changement d'avis se verra là avant de se voir en production.

Le troisième est la **cohérence entre affichage et refus**. Tant qu'`isOnCarteAt` est la seule dérivation, la Carte ne peut pas proposer ce que le paiement refusera. Le jour où quelqu'un réécrit la règle côté storefront pour gagner la minute de latence de `revalidate: 60`, cette garantie tombe — l'ADR 0013 nomme cette tentation et la raison de l'avoir écartée.
