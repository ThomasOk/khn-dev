# Annonces

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — cette spec ne les rejoue pas :
[ADR 0009](../adr/0009-annonces-are-written-never-derived.md) (une Annonce est écrite, jamais dérivée d'une Fermeture ni d'un Produit),
[ADR 0007](../adr/0007-separate-closing-calendars-per-module.md) (calendriers de fermeture séparés par module — l'Annonce hérite du même arbitrage et de la même conséquence),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md), section *L'annonce*.

Vocabulaire français du glossaire → identifiants anglais, comme partout ailleurs dans le repo :
`Annonce → Announcement`, `Accroche → headline`, `Corps → body`, `Période d'annonce → start_date / end_date`.

## Problem Statement

Le restaurant n'a aucun moyen de dire quelque chose à ses visiteurs. Le site présente la Carte, prend les Commandes et les Réservations — mais il est muet.

Concrètement, ça donne trois situations qui coûtent, toutes vécues :

Le restaurant ferme deux semaines en août. Le restaurateur enregistre la Fermeture exceptionnelle, les Créneaux disparaissent, et le client qui arrive sur le site **ne comprend pas pourquoi**. Il ne voit pas « fermé jusqu'au 21 » : il voit un site qui ne marche plus. Pire, il ne l'apprend qu'au checkout, puisque `orders_open` n'est lu qu'à l'étape créneau (`apps/storefront/src/modules/checkout/components/pickup-slot-picker/`) — après avoir parcouru la Carte et rempli son panier.

Le restaurant recrute, change ses horaires, ouvre le dimanche. Rien de tout ça n'a de représentation dans le système, et rien ne permet de le dire. La seule façon de faire passer un message aujourd'hui est **de modifier le code et de déployer**, ce qui veut dire en pratique : ça ne se fait pas.

Et le peu qui existe est indirect. `pickup_closure` porte un champ `reason`, mais c'est une note interne que le client ne voit jamais. La collection `plat-du-moment` alimente une section de l'accueil, mais elle ne parle que d'un plat, seulement sur l'accueil, et ne peut rien dire d'autre.

## Solution

**Pour le restaurateur.** Un écran dans les réglages de l'admin où il écrit une **Annonce** : une **accroche** d'une phrase, une **période** (début, fin, jours civils), et s'il en a besoin un **corps** de longueur libre plus un **lien**. Il publie, c'est en ligne dans la minute. Il n'a rien à dépublier : l'Annonce disparaît d'elle-même à la fin de sa période. S'il tente d'en publier une qui chevauche une autre, l'admin refuse en nommant la période en conflit — parce qu'il n'y en a jamais qu'une à l'écran et qu'il vaut mieux le savoir en la saisissant qu'en la cherchant sur le site.

**Pour le client.** Une bannière en haut de toutes les pages publiques, qui n'apparaît **que** quand il y a quelque chose à dire. Elle porte une phrase, courte et lisible d'un coup d'œil. Si l'Annonce a un corps ou un lien, la bannière est cliquable et ouvre un panneau par-dessus la page ; sinon elle est inerte et ne le laisse pas croire le contraire. Elle ne se ferme pas et il la reverra à sa prochaine visite tant que la période court. Elle n'apparaît jamais dans le tunnel de paiement.

**Pour le système.** Rien n'est dérivé. Une Annonce ne lit ni les Fermetures, ni les Créneaux, ni les Produits (ADR 0009) : c'est du texte écrit par un humain, avec sa propre période. La sélection de l'Annonce du jour n'est pas un calcul mais une requête — `start_date <= aujourd'hui <= end_date` sur des clés `YYYY-MM-DD` qui se comparent en chaînes, technique que `civilDayKey` documente déjà pour les fermetures. Et l'Annonce **ne pilote rien** : elle ne ferme aucun créneau, ne désactive aucun panier, n'empêche aucune commande.

## User Stories

**Le client**

1. En tant que client, je veux voir tout de suite que le restaurant est fermé en août, pour ne pas remplir un panier que je ne pourrai pas payer.
2. En tant que client arrivé par Google directement sur la Carte, je veux voir l'annonce quand même, pour ne pas dépendre d'être passé par l'accueil.
3. En tant que client, je veux une phrase que je lis d'un coup d'œil, pour ne pas avoir à décider si ça vaut mon temps.
4. En tant que client, je veux une date concrète dans le message (« jusqu'au 20 août »), pour savoir quoi faire plutôt que juste être informé.
5. En tant que client intrigué par l'accroche, je veux pouvoir en lire plus, sans avoir à chercher où.
6. En tant que client, je veux que le détail s'ouvre sur la page où je suis, pour ne pas perdre ce que j'étais en train de faire.
7. En tant que client, je veux refermer ce détail et retrouver ma page intacte, panier compris.
8. En tant que client qui a lu le détail, je veux un bouton qui m'emmène là où c'est utile — le plat dont on parle, la page de réservation.
9. En tant que client, je veux que la bannière n'ait pas l'air cliquable quand il n'y a rien de plus à lire, pour ne pas cliquer dans le vide.
10. En tant que client en train de payer, je ne veux pas qu'un bandeau me fasse douter au moment de valider.
11. En tant que client au clavier, je veux atteindre et ouvrir le panneau sans souris, et le fermer avec Échap.
12. En tant que client au lecteur d'écran, je veux que la bannière soit annoncée comme une information, pas comme une alerte qui interrompt.
13. En tant que client sur mobile, je veux que la bannière tienne en deux lignes maximum, pour qu'elle ne mange pas mon écran.
14. En tant que client, je veux que la page ne saute pas au chargement, pour ne pas cliquer sur ce qui vient de bouger.
15. En tant que client revenu une semaine plus tard, je veux ne plus voir l'annonce qui a expiré, pour continuer à croire ce que ce site m'affiche.

**Le restaurateur**

16. En tant que restaurateur, je veux publier un message depuis l'admin, pour ne dépendre de personne ni d'un déploiement.
17. En tant que restaurateur, je veux annoncer ma fermeture d'août **à l'avance**, pour prévenir les habitués avant qu'ils s'y cassent le nez.
18. En tant que restaurateur, je veux que l'annonce reste affichée **pendant** la fermeture, pour le client qui débarque le 15.
19. En tant que restaurateur, je veux qu'elle disparaisse toute seule le 21, pour ne pas avoir à y repenser.
20. En tant que restaurateur, je veux préparer une annonce à l'avance avec une date de début future, pour ne pas avoir à être devant l'écran le jour J.
21. En tant que restaurateur, je veux qu'on m'empêche de publier deux annonces qui se chevauchent, pour ne pas en écrire une qui ne s'affichera jamais.
22. En tant que restaurateur à qui on refuse une publication, je veux savoir **laquelle** est en conflit et sur quelle période, pour pouvoir corriger.
23. En tant que restaurateur, je veux corriger une faute dans une annonce déjà en ligne, sans avoir à retaper le corps.
24. En tant que restaurateur, je veux retirer une annonce avant sa date de fin, quand la raison qui la justifiait a disparu.
25. En tant que restaurateur, je veux voir mes annonces passées, en cours et à venir dans une seule liste, pour savoir ce que voient mes clients maintenant.
26. En tant que restaurateur, je veux une date de fin pré-remplie à la saisie, pour ne pas avoir à la calculer à chaque fois.
27. En tant que restaurateur, je veux qu'on me dise que mon accroche est trop longue **pendant** que je l'écris, pas après publication.
28. En tant que restaurateur, je veux pouvoir écrire une annonce sans corps ni lien, parce que la plupart du temps la phrase suffit.
29. En tant que restaurateur, je veux annoncer une fermeture **sans** que ça ferme quoi que ce soit, parce que la Fermeture exceptionnelle est un autre geste et que je ne veux pas fermer par erreur en parlant.

## Implementation Decisions

### Module backend

Nouveau module Medusa custom `announcement` sous `apps/backend/src/modules/announcement/`. Medusa 2.16 ne couvre nativement aucune notion d'annonce ou de contenu éditorial, donc la règle d'`AGENTS.md` (« préférer les modules natifs quand Medusa couvre déjà la capacité ») ne s'applique pas. Le loger dans `pickup` serait le contresens exact que l'ADR 0009 interdit.

Modèle `Announcement` :

| Champ | Type | Notes |
|---|---|---|
| `id` | id, PK | |
| `headline` | text | L'accroche. Obligatoire, plafonnée. |
| `body` | text, nullable | Le corps. Aucun plafond. |
| `link_label` | text, nullable | Libellé du bouton. |
| `link_url` | text, nullable | Destination. |
| `start_date` | text | `YYYY-MM-DD`, borne incluse. |
| `end_date` | text | `YYYY-MM-DD`, borne incluse. |

Les dates sont du **texte, pas des `dateTime`** — même choix et même raison que `pickup_closure` : un jour de publication est un jour civil dans le fuseau du restaurant, pas un instant. Le zéro-padding rend les clés comparables lexicographiquement, ce qui est ce qui permet de tester l'appartenance et le chevauchement sans jamais construire de `Date`.

### Validation

Schémas zod dans les middlewares du module, sur le modèle de `apps/backend/src/api/admin/pickup/middlewares.ts` :

- `headline` : trim, 1 à **90** caractères.
- `start_date` / `end_date` : regex `YYYY-MM-DD`, et `end_date >= start_date` (comparaison de chaînes, comme `CreateClosureSchema`).
- `body` : trim, nullable, pas de longueur maximale.
- `link_label` et `link_url` : **les deux présents ou les deux absents**, jamais un seul. Un lien sans libellé n'est pas rendable, un libellé sans lien est un bouton mort.
- `link_url` : soit un chemin interne commençant par `/`, soit une URL absolue `http(s)://`. Rien d'autre.

### Refus de chevauchement

La création et la mise à jour passent par un **workflow** (`AGENTS.md` : la logique métier multi-étapes ne va pas dans une route), sur le modèle de `createPickupClosureWorkflow` dans `workflows/pickup/manage-closures.ts`.

Étape 1 — chercher une Annonce dont la période croise la candidate : `existing.start_date <= candidate.end_date AND existing.end_date >= candidate.start_date`, en excluant la ligne en cours de modification. Étape 2 — écrire, ou échouer.

En cas de conflit, la route répond **409** avec un message qui nomme la période en conflit. Pas de résolution silencieuse : une Annonce publiée qui ne s'affiche jamais n'est pas diagnosticable depuis le storefront, c'est écrit au glossaire.

### API admin

`GET /admin/announcements` (liste, période la plus proche d'abord), `POST /admin/announcements` (création), `POST /admin/announcements/:id` (modification), `DELETE /admin/announcements/:id`.

La modification est incluse, ce qui **diverge de `pickup/closures`** qui n'offre que création et suppression. La raison est spécifique : une faute dans une bannière publique, non fermable, affichée sur toutes les pages, doit se corriger en dix secondes sans retaper le corps.

### API store

`GET /store/announcement` → `{ announcement: { headline, body, link_label, link_url } | null }`.

Ni `id` ni dates sur le fil. Le storefront n'en a aucun usage : il n'y a pas de rejet à mémoriser (l'Annonce n'est pas fermable), donc pas de clé, et transporter les dates inviterait à refaire côté client une comparaison que la route vient de faire — avec l'horloge du téléphone, qui n'est pas celle du restaurant.

La route est le **seul lecteur d'horloge**, exactement comme `/store/pickup-slots` : elle calcule `civilDayKey(civilDayAt(Date.now()))` et fait une requête. Aucune fonction de dérivation n'est introduite.

`null` est une réponse normale, pas une erreur — c'est même le cas courant.

Si deux Annonces se chevauchaient malgré tout (données injectées hors API, migration), la route retourne celle dont `start_date` est le plus récent, triée de façon déterministe. Elle n'échoue pas : un bandeau arbitraire mais stable vaut mieux qu'une page en erreur.

### Admin UI

Une route de réglages sous `apps/backend/src/admin/routes/settings/announcements/`, à côté de `pickup`, `closures` et `table-reservation`. Liste des Annonces (passées, en cours, à venir, avec l'état visible), formulaire de création, modification, suppression.

La date de fin est **pré-remplie à début + 14 jours**. C'est un défaut de formulaire, pas une contrainte du modèle : rien n'interdit une période plus longue. Le chiffre est court parce que la bannière n'est pas fermable.

Le compteur de caractères de l'accroche est affiché **pendant** la saisie, pas découvert au submit.

Le 409 de chevauchement remonte en erreur inline nommant la période en conflit.

### Storefront

`apps/storefront/src/lib/data/announcement.ts`, via le SDK Medusa et jamais un `fetch` brut (`AGENTS.md`), avec `next: { revalidate: 60 }`.

C'est une **divergence assumée avec `listPickupSlots`**, qui est en `cache: "no-store"`. Les créneaux dépendent de l'instant et du délai de préparation, un cache y servirait des créneaux périmés ; une Annonce a la granularité du jour civil et est lue à chaque rendu de chaque page de `(main)`. Soixante secondes de latence entre publication et affichage sont sans objet ici, et un aller-retour backend par rendu de page ne l'est pas.

Nouveau dossier de feature `apps/storefront/src/modules/announcement/`, suivant le découpage existant.

Rendu **côté serveur** dans `apps/storefront/src/app/[countryCode]/(main)/layout.tsx`, en flux normal directement sous `<Nav />` — le même emplacement que `CartMismatchBanner`, qui sert de précédent de layout. **Jamais** dans `(checkout)`.

Comportements :

- La bannière **ne navigue jamais**. Elle ouvre le panneau, ou elle n'est pas interactive. Cliquable si et seulement si `body` ou `link_url` est présent — un seul comportement à comprendre et à tester.
- Le panneau réutilise la primitive existante `apps/storefront/src/modules/common/components/modal/`. Rien de nouveau à écrire pour le focus trap, Échap et la restitution du focus.
- Le `body` est rendu en **texte brut**, sauts de paragraphe préservés. Jamais de `dangerouslySetInnerHTML`.
- Le lien est rendu en bouton : chemin interne via `LocalizedClientLink`, URL absolue via une ancre avec `target="_blank"` et `rel="noopener noreferrer"`.
- La bannière est une région `role="status"`, pas `alert` — une Annonce informe, elle n'interrompt pas.
- Quand une Annonce est présente, le nav doit être **forcé opaque**. Il est `fixed` et transparent au-dessus du hero jusqu'au scroll ; l'échappatoire `forceSolidNav` existe déjà dans `nav-client` pour exactement ce cas et doit être réutilisée plutôt que dupliquée.
- Aucun bouton de fermeture, aucun `localStorage`, aucune persistance côté client.

## Testing Decisions

Un bon test ici interroge les routes et vérifie ce qui est réellement persisté et servi. Il ne teste jamais une méthode interne du module, ni l'ordre des étapes du workflow, ni l'état d'un composant React (`AGENTS.md`).

**Un seul seam**, et c'est délibéré. Contrairement à `deriveSlots` ou `deriveAvailability`, cette feature n'introduit **aucune dérivation pure à isoler** : la sélection de l'Annonce du jour est une requête, et sa seule part calculatoire — passer d'un instant au jour civil parisien — est `civilDayAt`, déjà couvert par `src/lib/time/__tests__/restaurant-time.unit.spec.ts`, bascule de minuit comprise (« returns the Paris civil day, not the UTC one »). Ajouter un seam unitaire ne testerait qu'un appel de fonction déjà testée.

**Seam — HTTP integration**, `apps/backend/integration-tests/http/announcements.spec.ts`, sur `medusaIntegrationTestRunner` comme les 17 specs existantes. Art antérieur direct : `pickup-slots.spec.ts` (route store custom + clé publiable + périodes semées relativement à l'horloge réelle) et `table-reservation-guard-rails.spec.ts` (refus attendus sur les routes admin).

Cas à couvrir :

- Création acceptée, relue par la liste admin.
- Chevauchement refusé en 409 — chevauchement partiel, inclusion totale, périodes identiques, et adjacence **acceptée** (une annonce finissant le 10, la suivante commençant le 11).
- Modification d'une Annonce qui ne se chevauche qu'elle-même : acceptée.
- Validation refusée : accroche vide, accroche au-delà du plafond, `end_date` avant `start_date`, date malformée, `link_url` sans `link_label`, `link_label` sans `link_url`.
- `GET /store/announcement` renvoie l'Annonce dont la période contient aujourd'hui, avec les seuls champs du contrat.
- Bornes **incluses** : `start_date === end_date === aujourd'hui` s'affiche.
- `null` sur période entièrement passée, sur période entièrement future, et sur base vide.
- Suppression : l'Annonce cesse d'être servie.

Les périodes sont semées **relativement à aujourd'hui** via `parisDateKey(new Date())` depuis `integration-tests/http/paris-time.ts`, exactement comme `pickup-slots.spec.ts` sème son horaire relativement à maintenant. La route lit l'horloge réelle ; les assertions ne portent donc que sur des propriétés vraies à n'importe quel instant.

**Aucun test storefront.** `apps/storefront` n'a aujourd'hui aucune infrastructure de test — pas de runner, pas de script `test`, aucun fichier spec. Introduire jest ou playwright pour une bannière serait un nouveau seam disproportionné et mérite sa propre décision. La bannière et le panneau sont vérifiés à la main. C'est une lacune consciente, pas un oubli.

## Out of Scope

- **Le mode catalogue** — désactiver le panier et passer la Carte en vitrine. Feature séparée, décidée indépendante. Elle aura besoin de son propre terme au glossaire, et attention : *Commandes fermées* est **déjà pris** et désigne autre chose (plus aucun Créneau aujourd'hui).
- **L'écran admin de cohérence** promis dans les conséquences de l'ADR 0009 — les trois leviers (Fermeture exceptionnelle, mode catalogue, Annonce) vus côte à côte. Il n'a de sens qu'une fois le mode catalogue construit.
- **Propager `orders_open` à la Carte** et aux fiches produit. Envisagé, puis remplacé par le mode catalogue comme feature indépendante.
- **Plusieurs Annonces simultanées**, carrousel, rotation, priorité, ordonnancement.
- **Le rejet par le client** : bouton de fermeture, `localStorage`, mémorisation par annonce.
- **Une URL publique pour le corps** : page dédiée, page d'actualités, slug, metadata, indexation, flux RSS. Le corps n'a pas d'adresse, par décision.
- **La publication vers les réseaux sociaux.** Ils ont leur propre message, écrit pour eux.
- **Images, Markdown, HTML, éditeur riche** dans le corps.
- **Notification par email** d'une Annonce aux clients.
- **Programmation à l'heure.** La granularité est le jour civil.
- **L'internationalisation.** Une seule langue, copie en français, comme le reste du storefront.
- **Toute lecture des Fermetures, Créneaux ou Produits** par le module `announcement` (ADR 0009).

## Further Notes

**Le plafond de 90 caractères est le seul chiffre à revoir devant la maquette.** Il traduit « une ligne sur desktop, deux au maximum sur mobile », qui est la vraie contrainte. Le changer plus tard ne coûte qu'une valeur dans un schéma zod — mais le baisser après publication tronquerait des Annonces existantes, donc mieux vaut le confronter à la maquette avant la première publication réelle.

**La fenêtre d'annonce n'est pas la fenêtre de fermeture**, et le formulaire ne doit pas laisser croire l'inverse. Une fermeture du 10 au 20 août s'annonce sur une Période d'annonce du 1er au 20. C'est la raison profonde pour laquelle l'Annonce ne peut pas dériver de la Fermeture, et c'est le point que l'admin doit rendre évident — sans quoi le restaurateur saisira mécaniquement 10–20 et personne ne sera prévenu.

**Le coût de cohérence est connu et accepté** (ADR 0009). Il sera bientôt possible d'afficher « Fermé le 15 août » avec un panier parfaitement fonctionnel, ou de couper les commandes sans que rien à l'écran ne l'explique. Rien dans cette spec ne l'empêche, et rien ne devrait : la réparation est un écran admin, pas un couplage dans le domaine.

**Ne pas ajouter de bouton de fermeture « pour être gentil ».** La non-fermabilité est une décision prise en connaissance du confort qu'elle coûte, et c'est elle qui justifie la brièveté imposée aux périodes. Ajouter le bouton sans reprendre la période ferait perdre les deux.
