# Réservation de table

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — ce spec ne les rejoue pas :
[ADR 0006](../adr/0006-table-capacity-in-couverts-over-an-interval.md) (la capacité se compte en Couverts sur un intervalle, pas en tables),
[ADR 0007](../adr/0007-separate-closing-calendars-per-module.md) (calendriers de fermeture séparés par module),
[ADR 0008](../adr/0008-reservations-have-no-lifecycle.md) (pas de cycle de vie, pas de no-show, grands groupes au téléphone),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md), section *La réservation de table*.

Pas de note de recherche séparée : les trois vérifications faites contre la 2.16 installée tiennent en trois chemins de fichiers et sont citées à l'endroit où elles comptent (*Le verrou*).

## Problem Statement

Aujourd'hui, réserver une table chez Kim-Hi Noodle passe par le téléphone, et par lui seul. Ça veut dire : personne ne réserve en dehors des heures de service, parce que personne ne décroche ; le service est interrompu par la sonnerie au pire moment ; et les réservations vivent sur un cahier que seule la personne présente peut consulter.

Le restaurant est passé par TheFork, Dish et Octotable. Ces outils règlent le problème, mais au prix d'une commission ou d'un abonnement, d'un fichier client qui appartient à un tiers, et d'un parcours qui sort du site. La décision est prise de s'en passer.

Le site, lui, sait déjà présenter la Carte et encaisser une Commande pour un Créneau de retrait — mais il ne sait rien de la salle. Il ne connaît ni les heures où le restaurant sert à table (les Horaires de retrait ne sont **pas** les heures d'ouverture, c'est écrit dans le glossaire), ni le nombre de Couverts qu'il peut asseoir, ni les jours où la salle est prise. Il n'existe aucun objet dans le système auquel accrocher tout ça.

## Solution

**Pour le client.** Une page `/reservation`, indépendante du panier et du tunnel de commande. Il choisit une date, un nombre de Couverts, et voit les Heures de réservation réellement disponibles — celles qui tombent dans un Service, hors Fermeture de réservation, assez loin dans le temps, et où il reste de la place *pour son groupe*. Il laisse nom, email, téléphone, et c'est **confirmé immédiatement** : pas d'attente de validation, pas de « nous revenons vers vous ». Il reçoit un email récapitulatif portant un lien d'annulation qu'il peut utiliser à tout moment jusqu'à l'heure dite. Au-delà de 8 personnes, on ne lui fait pas remplir un formulaire pour rien : on lui donne le numéro du restaurant.

**Pour le restaurateur.** Il règle depuis l'admin ses Services de la semaine — chacun avec ses horaires, **sa** Capacité et **sa** Durée d'occupation, parce qu'un mardi midi et un samedi soir n'ont ni l'un ni l'autre — ses Fermetures de réservation, et les réglages (horizon, délai minimum, pas, taille de groupe maximale, téléphone, email de notification). Rien de tout ça n'est dans le code : la première valeur sera fausse. Il reçoit un email à chaque réservation **et à chaque annulation**, et il sort avant le service la **Feuille de service** du jour — les réservations par heure croissante, avec le nom, les Couverts et le téléphone.

**Pour le système.** La disponibilité est **dérivée à la demande** des Services, moins les Fermetures, moins le délai minimum, moins l'occupation déjà promise. L'occupation se calcule sur des **intervalles qui se chevauchent** et jamais sur des instants (ADR 0006) : c'est la seule chose qui empêche de vendre trois fois la même table dans une soirée. L'acceptation recalcule et insère **sous verrou**, parce que la capacité est une ressource finie et que deux clients peuvent viser la dernière place à la même seconde. Rien de tout ça ne touche Medusa : ni Cart, ni Order, ni pricing, ni Stripe.

## User Stories

**Le client**

1. En tant que client, je veux réserver une table depuis le site à 23 h, pour ne pas dépendre de quelqu'un qui décroche.
2. En tant que client, je veux indiquer combien nous serons, pour qu'on ne me propose que des heures où mon groupe tient réellement.
3. En tant que client, je veux choisir une date à l'avance, pour organiser un anniversaire.
4. En tant que client, je veux ne voir que des heures réellement réservables, pour ne pas me faire refuser après avoir tout saisi.
5. En tant que client, je veux une confirmation immédiate et sans condition, pour savoir que ma table est à moi avant de fermer l'onglet.
6. En tant que client, je veux un email récapitulatif, pour retrouver l'heure et la date sans revenir sur le site.
7. En tant que client, je veux annuler en un clic depuis cet email, pour ne pas avoir à téléphoner quand mon plan change.
8. En tant que client, je veux pouvoir annuler jusqu'à la dernière minute, pour que « je suis en retard, on annule » reste plus simple que ne rien faire.
9. En tant que client d'un groupe de douze, je veux qu'on me dise franchement d'appeler, plutôt qu'un formulaire qui m'accepte et me rappelle le lendemain pour se dédire.
10. En tant que client, je veux savoir que le restaurant est fermé ce jour-là, plutôt que de voir une liste d'heures vide sans explication.
11. En tant que client, je veux laisser une demande particulière (allergie, poussette, anniversaire), pour ne pas avoir à la répéter en arrivant.
12. En tant que client, je veux réserver sans créer de compte, parce que je ne veux pas d'un mot de passe pour dîner.
13. En tant que client qui a cliqué deux fois sur « Réserver », je veux une seule table réservée, pas deux.
14. En tant que client, je veux voir le numéro du restaurant sur la page, pour les cas que le formulaire ne couvre pas.

**Le restaurateur**

15. En tant que restaurateur, je veux déclarer mes Services de la semaine, pour que le site ne propose que les heures où je sers.
16. En tant que restaurateur, je veux une Capacité par Service, parce que le samedi soir et le mardi midi ne se ressemblent pas.
17. En tant que restaurateur, je veux une Durée d'occupation par Service, parce qu'on déjeune en une heure et qu'on dîne en deux.
18. En tant que restaurateur, je veux baisser ma Capacité sans déploiement, le jour où j'ai accepté un service complet qui ne tenait pas.
19. En tant que restaurateur, je veux que baisser ou monter une Durée d'occupation **ne change rien** aux réservations déjà confirmées, pour ne pas me retrouver en surbooking sans que personne n'ait rien réservé.
20. En tant que restaurateur, je veux fermer la salle pour une soirée privatisée **sans fermer le click & collect**.
21. En tant que restaurateur, je veux fermer la salle pour les vacances d'août.
22. En tant que restaurateur, je veux un email dès qu'une réservation arrive, même pour dans trois semaines.
23. En tant que restaurateur, je veux un email dès qu'une réservation est annulée, parce que ma Feuille de service est peut-être déjà imprimée.
24. En tant que restaurateur, je veux distinguer les deux au premier coup d'œil dans ma boîte, sans ouvrir.
25. En tant que restaurateur, je veux router les réservations vers une autre adresse que les commandes, parce que ce n'est pas la même personne qui les traite.
26. En tant que restaurateur, je veux la Feuille de service d'un jour, par heure croissante, pour l'avoir en main avant le coup de feu.
27. En tant que restaurateur, je veux le téléphone du client sur cette feuille, pour l'appeler quand il ne vient pas.
28. En tant que restaurateur, je veux régler le délai minimum, pour qu'on ne me réserve pas à 19h58 pour 20h00.
29. En tant que restaurateur, je veux régler l'horizon, pour ne pas gérer des réservations pour dans six mois.
30. En tant que restaurateur, je veux régler la taille de groupe maximale, parce que ce seuil dépend de ma salle et changera.
31. En tant que restaurateur, je veux que le numéro affiché aux grands groupes soit une donnée, pas une ligne de code.
32. En tant que restaurateur, je veux consulter et corriger une réservation depuis l'admin, parce que le client m'a appelé.

**Le système**

33. En tant que système, je veux refuser une réservation qui dépasserait la Capacité **à n'importe quel instant de son intervalle**, pas seulement à son heure de début.
34. En tant que système, je veux que deux réservations simultanées sur les dernières places n'en laissent passer qu'une, sans jamais surbooker.
35. En tant que système, je veux figer la Durée d'occupation sur la réservation à sa création, pour que l'occupation passée soit immuable.
36. En tant que système, je veux qu'une annulation rende immédiatement la capacité, pour que l'heure redevienne réservable.
37. En tant que système, je veux qu'un jeton d'annulation invalide ne révèle rien de la réservation visée.
38. En tant que système, je veux borner les réservations par email et par Service, pour qu'un double-clic ne coûte pas huit Couverts.
39. En tant que système, je veux calculer en heure locale du restaurant, pour que les changements d'heure ne décalent rien.

## Implementation Decisions

### Le module `table-reservation`

Un module Medusa custom autonome, sur le patron de `pickup` : quatre modèles, un service, des routes admin CRUD, une route store de disponibilité. Aucun Module Link : ce module ne référence **aucune** entité Medusa, ni Order, ni Customer, ni Product. Une Réservation n'est pas une Commande et ne partage rien avec elle (CONTEXT.md).

`TABLE_RESERVATION_MODULE = "table_reservation"`, enregistré dans `medusa-config.ts` à côté de `pickup`, `formule` et `invoice`.

**`TableReservation`** (`table_reservation`) — `date` et `time` en texte local (`YYYY-MM-DD`, `HH:MM`) dans le fuseau du restaurant, comme `pickup_schedule` : une Heure de réservation est une heure murale, pas un instant. Plus : `party_size`, `duration_minutes` (**copie**, voir plus bas), `service_window_id` (copie également — le Service peut être supprimé, la réservation reste lisible), `status` (`confirmed` | `cancelled`), `customer_name`, `customer_email`, `customer_phone`, `note` (nullable), `cancellation_token` (unique), `cancelled_at` (nullable).

**`ServiceWindow`** (`table_reservation_service_window`) — `name` (« Déjeuner »), `day_of_week` (0 = dimanche, convention `Date.getDay()`, comme `pickup_schedule`), `start_time`, `end_time` (`HH:MM` locales), `capacity`, `duration_minutes`, `active`. Plusieurs lignes peuvent viser le même jour : c'est ce qui donne un midi et un soir.

**`ReservationClosure`** (`table_reservation_closure`) — `start_date`, `end_date` (jours civils inclusifs, en texte), `reason` nullable. Structurellement identique à `pickup_closure` et **délibérément sans lien avec lui** (ADR 0007).

**`TableReservationConfig`** (`table_reservation_config`), une seule ligne — `min_lead_minutes` (30), `horizon_days` (30), `slot_step_minutes` (30), `max_party_size` (8), `last_seating_margin_minutes` (0), `large_party_phone`, `restaurant_notification_email` (nullable). Le module a **son propre** email de notification : `pickup_config` en porte déjà un, et les deux modules ne partagent rien (ADR 0007).

### La copie de la Durée d'occupation

`duration_minutes` est écrit sur la Réservation au moment de sa création, depuis son Service, et **n'est jamais relu depuis le Service ensuite**. C'est le point le plus facile à « simplifier » par erreur pendant l'implémentation, et le seul dont l'erreur est invisible : passer le dîner du samedi de 1h45 à 2h00 réécrirait rétroactivement l'occupation de toutes les réservations déjà promises, et pourrait mettre un service en surbooking sans qu'un seul client ait réservé. Même logique que la Facture figée (ADR 0002).

### Le calcul de disponibilité

Une **fonction pure**, dans `src/lib/reservation/`, sur le modèle de `deriveSlots` : elle reçoit les Services du jour, les Fermetures, la configuration, les réservations `confirmed` déjà posées, la taille du groupe demandé, et **`maintenant` en paramètre**. Aucun accès base, aucune horloge implicite. C'est la condition pour que le Seam 2 existe.

Elle produit les Heures de réservation candidates par pas de `slot_step_minutes` depuis `start_time`, jusqu'à `end_time - last_seating_margin_minutes` inclus, puis retire :

- les heures hors horizon (`> horizon_days`) et sous le délai minimum (`< maintenant + min_lead_minutes`) ;
- toutes les heures d'un jour couvert par une Fermeture de réservation ;
- les heures où l'ajout de `party_size` Couverts dépasserait `capacity` **à un instant quelconque** de `[heure, heure + durée)`.

L'occupation se calcule en **minutes depuis minuit du jour du Service**, ce qui autorise volontairement des valeurs supérieures à 1440 : un dîner qui commence à 22h30 avec 2 h d'occupation court jusqu'à 00h30, et cette réservation appartient au service de la veille, pas au lendemain. L'intervalle est **semi-ouvert** : une réservation qui finit exactement à 20h00 libère 20h00. C'est une décision, pas un détail d'arrondi, et elle se teste.

Les réservations en cours peuvent porter des `duration_minutes` **différentes** entre elles (une durée a changé en configuration depuis). Le calcul additionne les intervalles réels de chacune, jamais une durée courante appliquée à toutes.

### Le contrat des routes Store

**`GET /store/table-reservations/availability?date=YYYY-MM-DD&party_size=N`**

```
{ date, party_size, times: ["19:00", "19:30", ...], open: boolean,
  max_party_size, large_party_phone }
```

`open: false` avec `times: []` quand le jour n'a aucun Service, tombe sur une Fermeture, ou est hors horizon — le storefront doit pouvoir dire *pourquoi* il n'y a rien plutôt qu'afficher une liste vide. Une `party_size` au-dessus de `max_party_size` renvoie `200` avec `times: []` et le téléphone, jamais une erreur : ce n'est pas un échec du client.

**`POST /store/table-reservations`** — corps `{ date, time, party_size, name, email, phone, note? }`. Réponse `201` avec `{ id, date, time, party_size, cancellation_token }`.

**`POST /store/table-reservations/:id/cancel`** — corps `{ token }`. Réponse `200`. Idempotente : annuler une réservation déjà annulée renvoie `200`, pas une erreur — le client a cliqué deux fois sur son lien.

Codes d'erreur : `400` sur entrée invalide (date malformée, `party_size` ≤ 0, email absent), `409` sur conflit (service complet, doublon, heure plus offrable), `404` sur réservation inconnue **ou jeton invalide** — la même réponse dans les deux cas, pour ne pas confirmer l'existence d'une réservation à qui essaie des identifiants.

Toute valeur envoyée par le client est **revalidée serveur**, y compris l'heure : la route est publique, et une heure non revalidée n'est qu'un champ que le client contrôle. Le même raisonnement que pour le Créneau de retrait.

### Le verrou

Vérifié contre la 2.16 installée :

- Le module Locking expose `execute(keys, job, { timeout })` — `@medusajs/locking/dist/services/locking-module.d.ts:17`.
- Le provider livré par défaut est **`in-memory`**, seul contenu de `@medusajs/locking/dist/providers/`. Il ne protège qu'à l'intérieur d'un process.
- `@medusajs/locking-postgres` est **déjà une dépendance de `@medusajs/medusa`** — rien à installer — et s'appuie sur `pg_advisory_xact_lock` (`dist/services/advisory-lock.js:23`).

**Enregistrer `locking-postgres` dans `medusa-config.ts` fait partie de ce slice.** Sans ça, le verrou est un no-op silencieux dès la deuxième instance : aucune erreur, aucun log, juste des tables vendues deux fois.

La recherche de disponibilité **et** l'insertion tournent ensemble dans le `job` d'un `execute(["table_reservation:" + date], job)`. Détail lu dans la source et qui a une conséquence produit : `execute` fait un `Promise.race` entre l'acquisition et un timeout (5 s par défaut). Sous forte contention, une requête peut donc échouer sur le verrou et non sur la capacité — elle renvoie `409` avec un message invitant à réessayer, jamais une 500.

### Les garde-fous

Trois règles muettes, sans état supplémentaire (ADR 0008) : **une seule Réservation `confirmed` par email et par Service** (un double-clic devient un `409`, pas un doublon qui ampute la capacité), une limite de fréquence par email et par IP, et un plafond global de réservations créées par jour. Aucune vérification d'identité, aucun double opt-in : un email invalide signifie que le client n'aura pas son lien d'annulation, pas qu'il ne viendra pas. Le **téléphone est obligatoire**, c'est le vrai canal de rattrapage.

### Les notifications

Par le module `resend-notification` existant, comme la Notification de commande — pas de nouveau provider.

- **Au client**, à la création : récapitulatif (date, heure, Couverts, nom du restaurant) et **lien d'annulation** portant le jeton. Cet email est contractuel, pas une commodité : c'est la preuve que tient le client. Il indique explicitement que pour modifier, on annule et on refait, ou on appelle.
- **Au restaurant**, à la création *et* à l'annulation, vers `restaurant_notification_email`. Sujets préfixés et lisibles au tri, sans ouvrir : `[Réservation] 12/08 20h00 — 4 pers. — Dupont` et `[Annulation] 12/08 20h00 — 4 pers. — Dupont`. L'email d'annulation est le plus utile des deux et se traite comme le cas principal.

Aucune pièce jointe, aucun PDF : la Feuille de service se sort du jour, pas d'une réservation.

### L'admin

Pages custom sous `/admin/table-reservations` : CRUD des Services, CRUD des Fermetures de réservation, formulaire de configuration, et la **Feuille de service** — une vue par jour, réservations `confirmed` par heure croissante, avec nom, Couverts, téléphone et note, imprimable en une page. Les réservations `cancelled` n'y figurent pas.

La page « Fermetures » affiche **les deux calendriers côte à côte** — celui du retrait et celui de la salle — et signale visiblement une période présente dans l'un et absente de l'autre. C'est la mitigation nommée dans l'ADR 0007 : le couplage vit dans un écran que lit un humain, pas dans une table partagée.

### Le storefront

Page `/[countryCode]/(main)/reservation`, code sous `src/modules/table-reservation/`. Appels via le SDK JS Medusa (`src/lib/data/`), jamais en `fetch` brut. Aucune interaction avec le panier, le tunnel de commande ou Stripe. Une page d'annulation `/reservation/cancel` reçoit le lien de l'email.

### Ce qui est explicitement rejeté

- **Modéliser les tables** — ADR 0006. Pas de `table`, pas de plan de salle, pas d'affectation.
- **Un état intermédiaire**, quel qu'il soit — ADR 0008. `confirmed` et `cancelled`, rien d'autre.
- **Partager quoi que ce soit avec `pickup`** — ADR 0007. Ni la Fermeture, ni l'email de notification, ni le fuseau (qui reste une constante d'environnement lue des deux côtés, pas un champ partagé).
- **Modifier une réservation en ligne** — on annule et on refait (ADR 0008).
- **Faire d'une Réservation une Commande Medusa.** Il n'y a ni ligne, ni prix, ni paiement. Un Order vide ne serait qu'un tableau détourné.

## Testing Decisions

**Ce qui fait un bon test ici : on teste le comportement observable, jamais l'implémentation.** On interroge les routes et on regarde ce qui est persisté ; on n'assert jamais sur les méthodes internes du module, sur l'ordre des étapes d'un workflow, ni sur la forme d'un état React.

**Prior art**, contrairement aux Créneaux : `integration-tests/http/pickup-slots.spec.ts` pour une route de disponibilité, `kitchen-ticket-notification.spec.ts` pour l'assertion d'envoi d'une notification, `src/lib/slots/__tests__/derive-slots.unit.spec.ts` pour un calcul pur à horloge injectée. Les trois se copient plus qu'ils ne s'inventent. L'infra est en place, `.env.test` compris.

### Seam 1 — intégration HTTP (`medusaIntegrationTestRunner`)

Le seam le plus haut, et celui qui porte le risque. Quatre points d'entrée :

- **`GET .../availability`** — les heures hors Service, hors horizon, sous le délai minimum ou couvertes par une Fermeture de réservation sont absentes ; une `party_size` au-delà du plafond renvoie `times: []` et le téléphone ; `open: false` quand le jour est vide.
- **`POST /store/table-reservations`** — refuse au-delà de `max_party_size` ; refuse un service complet ; refuse un doublon même email / même Service ; sur succès, la Réservation persistée porte **sa** `duration_minutes` copiée, et **deux notifications** sont parties (restaurant et client).
- **`POST .../:id/cancel`** — annule avec un jeton valide ; renvoie `404` sur un jeton faux ; est idempotente ; et **rend la capacité** : l'appel de disponibilité qui suit propose à nouveau l'heure libérée.
- **La Feuille de service admin** — un jour donné renvoie les réservations `confirmed` par heure croissante, et **pas** les `cancelled`.

**Le test qui porte la thèse de l'ADR 0006 :** remplir la Capacité à 19h30, puis vérifier que **20h00 est refusé alors que personne n'a réservé à 20h00**. C'est lui, et lui seul, qui prouve sur une vraie base que la capacité se consomme sur un intervalle et pas sur un instant. S'il manque, le bug le plus coûteux de la feature n'est couvert nulle part — et c'est un bug qui ne se voit qu'un samedi soir, avec des gens debout à l'entrée.

**La concurrence reste ici**, pas dans un troisième seam : N requêtes en parallèle sur les dernières places, on vérifie que le total accepté ne dépasse jamais la Capacité et que les perdants reçoivent un `409`. Réserve à connaître, et c'est pour ça qu'elle est écrite : **ce test passerait aussi avec le provider en mémoire**, puisqu'il tourne dans un seul process. Il prouve la logique d'exclusion, pas la protection multi-instance. Rien ne peut prouver celle-ci en test ; seule la ligne de configuration la garantit.

### Seam 2 — le calcul de disponibilité, en unitaire pur

`TEST_TYPE=unit`, sur la fonction seule, `maintenant` injecté :

- les **changements d'heure**, dans les deux sens (fin mars, fin octobre) ;
- la borne exacte du **délai minimum** (juste avant / juste après) et celle de l'**horizon** (jour 30 / jour 31) ;
- la **Capacité atteinte pile** — le dernier groupe qui tient, puis celui qui ne tient plus d'un Couvert ;
- **deux Services le même jour**, avec des Capacités et des Durées différentes ;
- des **durées d'occupation différentes qui se chevauchent** (un 1h00 et un 1h45 posés au même endroit) ;
- la **borne du chevauchement** : une réservation qui finit exactement à 20h00 laisse 20h00 disponible ;
- un Service **qui déborde après minuit** (22h30 + 2 h), et la vérification que l'occupation reste sur le jour du Service ;
- un jour **sans aucun Service**, et un jour **couvert par une Fermeture**.

Ces cas passés par HTTP seraient lents et incapables de contrôler « maintenant ». Le seam n'est pas un détour : il **force** la conception qui rend la feature correcte — une horloge injectée et un calcul sans état.

### Volontairement non testé

Les pages admin, le rendu imprimable de la Feuille de service et le formulaire storefront. Aucune infra de test React n'existe dans ce repo, et ces surfaces sont des **vues** au-dessus des deux seams ci-dessus. Vérification à la main.

`moduleIntegrationTestRunner` est écarté pour la même raison que dans le spec des Créneaux : il se placerait pile entre les deux seams retenus et dupliquerait les deux.

## Out of Scope

- **Les tables, le plan de salle, l'affectation** — ADR 0006. Le déclencheur d'une migration future serait le jour où refuser un groupe de 5 « alors qu'il reste 12 Couverts » devient un problème récurrent. Rien ne le surveille, délibérément.
- **Le suivi du no-show, l'acompte, l'empreinte bancaire, la liste noire** — ADR 0008. Ils supposent tous une identité client durable, que ce domaine refuse d'imposer.
- **Le rappel J-1** (email ou SMS). Réel et efficace, mais il demande une tâche planifiée et un budget SMS ; slice séparé si le taux d'annulation montre que c'est nécessaire.
- **La modification d'une réservation en ligne** — annuler et refaire (ADR 0008).
- **La purge RGPD des données personnelles.** Écartée sciemment aujourd'hui. C'est une **dette avec une couleur légale** : la limitation des durées de conservation est une obligation, pas une bonne pratique. Elle se rattrape par une tâche planifiée, sans toucher au modèle.
- **Toute surcharge de Capacité par date** (« le 14 juillet, terrasse, 50 couverts »). Additive par-dessus le Service, donc rien ne presse.
- **Réserver et commander en un seul geste.** Les deux parcours ne se croisent nulle part et n'ont pas de raison de le faire.
- **Un compte client pour retrouver ses réservations.** Le lien dans l'email suffit et n'impose rien.

## Further Notes

Le cas qui mérite le plus d'attention à l'implémentation n'est pas un cas limite : c'est **le client qui grossit son groupe**. Passer de 4 à 5 est fréquent, et la spec l'oblige à annuler pour redemander, avec le risque de perdre son 19h30. C'est le seul endroit où le produit est franchement moins bon qu'un TheFork, c'est assumé (ADR 0008), et c'est la première chose à surveiller une fois en ligne. Le texte de l'email et celui de la page doivent donc pousser vers le téléphone dans ce cas précis, pas se contenter de proposer un bouton « Annuler ».

Deux pièges silencieux à relire juste avant d'écrire du code, parce qu'aucun des deux ne produit d'erreur :

1. **Le provider de verrouillage par défaut est en mémoire.** Sans la ligne de configuration, tout marche, tous les tests passent, et la protection n'existe pas dès la deuxième instance.
2. **La Durée d'occupation relue depuis le Service au lieu d'être copiée.** Le code est plus court, il a l'air plus propre, et il rend l'occupation passée mutable.
