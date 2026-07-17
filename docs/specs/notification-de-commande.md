# Notification de commande et Ticket cuisine

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — ce spec ne les rejoue pas :
[la recherche Medusa](../research/2026-07-16-medusa-notification-commande-ticket-cuisine.md) (toutes les citations de source, §6 fait autorité sur §2/§4),
[ADR 0002](../adr/0002-factures-issued-frozen.md) (pdfmake déjà choisi pour la Facture, et le piège d'API 0.2→0.3),
[ADR 0004](../adr/0004-creneau-in-order-metadata.md) (le créneau vit dans `order.metadata`),
[ADR 0005](../adr/0005-formule-curation-via-module-selection-via-metadata.md) et [le spec Formules](formules.md) (la Sélection vit en clés plates sur `line_item.metadata`, une par Composant — la forme de données que ce spec lit désormais),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md) (Ticket cuisine, Notification de commande, Facture, Formule, Composant, Sélection).

## Problem Statement

Une commande payée n'informe aujourd'hui personne au restaurant. `order.placed` ne déclenche qu'un seul email — la confirmation au client (`apps/backend/src/subscribers/order-confirmation.ts`) — et rien côté restaurateur. La seule façon de savoir qu'une commande est arrivée est d'aller regarder l'admin Medusa, ce que personne ne fait en continu pendant un service.

Et même informé, le restaurateur n'a rien à donner à la cuisine. Le seul document de production que le repo connaisse aujourd'hui est celui de l'ancien système (`orecap.pdf`) : il paginé sur une hauteur fixe, ce qui coupe déjà un plat de son assaisonnement en page 2 sur une commande de trois lignes seulement — un allergène (« contient arachide ») s'y retrouve séparé de son plat par un tour de page. Il porte aussi des prix et un total, alors que CONTEXT.md est explicite : un document qui sert à la fois le cuisinier et le comptable ne sert bien ni l'un ni l'autre.

## Solution

**Pour le restaurateur.** À chaque commande payée, un second email arrive — distinct de la confirmation client — avec en pièce jointe un PDF au format 80mm prêt à imprimer sur l'imprimante à ticket du comptoir. Le corps de l'email donne, sans ouvrir la pièce jointe, le nom du client, le numéro de commande et le Créneau de retrait — de quoi juger en un coup d'œil s'il faut se presser. Le ticket lui-même ne porte ni prix ni total : seulement ce que la cuisine doit préparer, dans l'ordre où elle doit le lire, sans jamais séparer un plat de son assaisonnement ou d'un allergène par une coupure de page. Pour une ligne Formule, le ticket affiche son nom puis, groupée juste en dessous, la Sélection retenue pour chaque Composant — quelle entrée, quel plat — exactement ce que CONTEXT.md exige du Ticket cuisine (« chaque Variante par son nom, et chaque Sélection à l'intérieur d'une Formule »).

**Pour le client.** Rien ne change. La confirmation de commande part exactement comme avant ; si la génération du ticket cuisine échoue, l'email du client part quand même.

**Pour le système.** Deux subscribers indépendants sur `order.placed`, deux templates, un même moteur de rendu PDF que celui déjà retenu pour la Facture (ADR 0002) — pour ne pas installer deux bibliothèques PDF pour deux documents.

## User Stories

**Le restaurateur**

1. En tant que restaurateur, je veux être informé automatiquement dès qu'une commande arrive, afin de ne pas dépendre de consulter l'admin en continu pendant le service.
2. En tant que restaurateur, je veux recevoir un ticket imprimable au format du rouleau 80mm, afin de pouvoir le donner tel quel à la cuisine sans le retoucher.
3. En tant que restaurateur, je veux que le ticket ne montre aucun prix ni total, afin que la cuisine ne confonde jamais un document de production avec un document comptable.
4. En tant que restaurateur, je veux voir le Créneau de retrait en évidence en haut du ticket, afin d'ordonner la production sans devoir chercher l'information dans le texte.
5. En tant que restaurateur, je veux voir le nom et le téléphone du client sur le ticket, afin de pouvoir l'appeler si un plat manque, sans consulter l'admin.
6. En tant que restaurateur, je veux que chaque plat reste groupé avec son assaisonnement et ses allergènes sur le ticket, afin de ne jamais découvrir un allergène après avoir déjà commencé à cuisiner ou servir.
7. En tant que restaurateur, je veux que le ticket tienne sur une seule bande continue quelle que soit la longueur de la commande, afin de ne pas avoir à recoller des pages coupées au milieu d'un plat.
8. En tant que restaurateur, je veux que le corps de l'email me redonne le nom du client, le numéro de commande et le Créneau, afin de savoir en un coup d'œil si je dois me presser sans ouvrir la pièce jointe.
9. En tant que restaurateur, je veux configurer l'adresse à laquelle la Notification de commande est envoyée depuis l'admin, afin de la changer sans déploiement si la personne responsable change.
10. En tant que restaurateur, je veux que l'admin Medusa reste ma source de vérité si l'email n'arrive pas, afin de ne jamais dépendre uniquement d'un canal qui peut atterrir en spam ou en retard.

**Le client**

11. En tant que client, je ne veux rien voir ni vivre de différent au paiement à cause de cette fonctionnalité, afin que mon expérience de commande reste identique à aujourd'hui.
12. En tant que client, je veux que ma confirmation de commande parte normalement même si la génération du ticket cuisine du restaurateur échoue, afin de recevoir ma confirmation quoi qu'il arrive de l'autre côté.

**La cuisine**

13. En tant que cuisinier, je veux lire le ticket de haut en bas sans tourner de page pour connaître un ingrédient ou un allergène, afin de ne jamais servir un plat sans avoir vu ce qui l'accompagne.
14. En tant que cuisinier, je veux que le Créneau soit la première chose que je lise sur le ticket, afin de savoir immédiatement pour quand cuisiner.
15. En tant que cuisinier, je veux voir, sous le nom de chaque Formule commandée, la Sélection retenue pour chaque Composant — quelle entrée, quel plat —, afin de savoir exactement quoi assembler sans deviner depuis le seul nom générique de la Formule.

**Le développeur / celui qui reprendra le code**

16. En tant que développeur, je veux que l'échec de génération du PDF ou d'envoi de l'email soit journalisé mais jamais remonté au client, afin de diagnostiquer un problème sans jamais faire échouer une commande déjà payée.
17. En tant que développeur, je veux une clé d'idempotence sur chaque notification envoyée depuis `order.placed`, afin qu'un rejeu de l'événement n'envoie jamais deux fois le même ticket au restaurateur ni la même confirmation au client.
18. En tant que développeur, je veux que le mapping entre l'`Attachment` de Medusa et celui du SDK Resend soit une fonction explicite et testée, afin qu'un renommage de champ dans l'un des deux SDKs casse un test plutôt qu'un email en production.
19. En tant que développeur, je veux que la génération du PDF soit une fonction pure testable sans base de données, afin de vérifier la largeur, la hauteur automatique et le contenu textuel du ticket sans monter toute l'infrastructure d'intégration.
20. En tant que développeur, je veux que le ticket lise la Sélection directement sur `order.items[].metadata` (clés `formule_<key>_variant_id`, ADR 0005) et résolve le `label` du Composant et le nom de la Variante via la Curation, avec un repli sur l'id brut si la Curation ne répond plus pour un Composant ou une Variante — le même principe que le widget admin de la commande (spec Formules, User Story 17) — afin qu'un changement de Curation entre le paiement et l'impression n'efface jamais une ligne que la cuisine doit préparer.
21. En tant que développeur, je veux que la version de `pdfmake` soit épinglée explicitement dans `package.json`, afin qu'un `pnpm add` ultérieur ne bascule pas silencieusement entre l'API 0.2 (`PdfPrinter`) et l'API singleton 0.3.

## Implementation Decisions

### Un second subscriber, indépendant du premier

`order.placed` déclenche un nouveau subscriber, à côté de `order-confirmation.ts` et non fusionné avec lui. Deux documents, deux destinataires, deux raisons de changer — l'argument est le même que celui que CONTEXT.md donne déjà pour Facture vs Ticket cuisine : un document qui servirait les deux ne servirait bien ni l'un ni l'autre. Opérationnellement, ça garantit qu'un PDF qui ne se génère pas ne fait jamais échouer l'email du client, qui est *le* contact avec la personne qui a payé. Comme le subscriber existant, il **avale ses erreurs** (`catch` + `logger.error`, jamais de relance) — une commande payée ne doit jamais échouer pour un ticket qui refuse de se générer.

Les deux subscribers gagnent un `idempotency_key` (`order-confirmation:${order.id}` et `kitchen-ticket:${order.id}`) — le module Notification déduplique déjà nativement dessus, et `order.placed` peut être rejoué.

### Le moteur PDF : `pdfmake`, pas `@react-pdf/renderer`

ADR 0002 a déjà choisi `pdfmake` pour la Facture, en suivant le tutoriel officiel Medusa pour la mécanique PDF. Le Ticket cuisine réutilise le **même moteur** — deux templates séparés, un seul arbre de dépendances. CONTEXT.md interdit de partager le *template* entre Facture et Ticket cuisine, pas le moteur de rendu ; ce sont deux choses distinctes.

Un petit utilitaire partagé, `apps/backend/src/lib/pdf/render.ts`, expose une seule fonction : rendre une `docDefinition` pdfmake en buffer, puis en base64. C'est la seule pièce commune entre Facture et Ticket cuisine — tout le reste (contenu, mise en page) vit dans des templates séparés.

**Version épinglée : `pdfmake@^0.3`.** L'API 0.3 (singleton `pdfmake.createPdf(doc).getBuffer()`) a été vérifiée par exécution dans la recherche §6.3/§6.4 — largeur 80mm garantie, hauteur automatique fonctionnelle sur un ticket de 60 lignes, accents (« Bœuf ») intacts avec la police Roboto embarquée dans le paquet. Le tutoriel Medusa est écrit contre l'API 0.2 (`new PdfPrinter(fonts)`, qui n'existe plus en 0.3) ; le traduire vers le singleton est une opération mineure et déjà documentée dans l'ADR 0002 amendée. Épingler `0.3` plutôt que de laisser la Facture et ce spec potentiellement résoudre des versions différentes.

### Le contenu du ticket, informé par `orecap.pdf`

Le template `kitchen-ticket` (`apps/backend/src/lib/pdf/kitchen-ticket.ts`, une fonction `docDefinition` pure, pas un composant React — pdfmake ne rend pas du JSX) affiche, dans cet ordre :

1. **Le Créneau de retrait**, en tête, en gras, plus grand que le reste — c'est l'information qui ordonne le travail. `orecap.pdf` le noyait en 4ᵉ ligne dans la même graisse qu'`Email:`.
2. **Le nom du client** et son **téléphone**.
3. **Chaque ligne de commande** : nom de la Variante, quantité, et tout texte d'assaisonnement/allergène **dans le même bloc**, jamais dans une ligne séparée qui pourrait finir sur une autre page. Pour une ligne Formule, le bloc est : le nom de la Formule (ex. « Menu Midi »), puis, indentée juste en dessous, la Sélection de chaque Composant — `label` → nom de la Variante — dans l'ordre de rang des Composants, jamais dans l'ordre technique des clés de `metadata`.

**Explicitement absent** : email, prix unitaire, total, tout ce qui appartient à la Facture. Texte **ferré à gauche**, pas centré — `orecap.pdf` centre son texte dans une colonne étroite, ce qui rend le bord gauche en dents de scie et illisible en diagonale pendant un coup de feu.

### La Sélection de Formule sur le ticket

`order.items[].metadata` porte la Sélection en clés plates, une par Composant — `formule_<key>_variant_id: "variant_…"` (ADR 0005) — jamais le `label` du Composant ni le nom de la Variante choisie : ceux-ci vivent dans la Curation, pas dans la Sélection. Contrairement au widget admin de la commande (spec Formules, ticket 05), qui tourne dans le navigateur et doit repasser par une route HTTP pour lire la Curation, ce subscriber tourne côté serveur avec un accès direct au `container` : il résout le Composant et la Variante avec `getFormuleCurationForVariant` (`src/lib/formule/get-curation-for-variant.ts`), déjà écrit pour les hooks de validation — pas de nouvel appel réseau, pas de duplication de cette résolution.

Le même repli que le widget admin s'applique ici, pour la même raison : la Curation peut changer entre le paiement (où la Sélection a été validée pour la dernière fois, `completeCartWorkflow.hooks.validate`) et la génération du ticket — une fenêtre étroite mais réelle. Si un Composant ou une Variante ne se résout plus dans la Curation actuelle, le ticket affiche l'id brut plutôt que de faire disparaître la ligne : une Sélection illisible que la cuisine peut encore déchiffrer vaut mieux qu'une Sélection invisible qu'elle ne peut pas deviner.

### L'adresse email du restaurant : configuration `pickup`, pas variable d'environnement

Le destinataire de la Notification de commande est une propriété du **restaurant**, pas du provider technique. Le module `pickup` (`apps/backend/src/modules/pickup/`) porte déjà la configuration métier éditable sans déploiement — Délai de préparation, durée de créneau. `ConfigurationRetrait` (ou le modèle équivalent du module `pickup`) gagne un champ `restaurant_notification_email`, réglable depuis la même page de réglages admin que les Horaires de retrait. Rejeté : une variable d'environnement `RESTAURANT_NOTIFICATION_EMAIL`, qui demanderait un déploiement pour changer une adresse.

### Le mapping Resend

Le provider `resend-notification` (`service.ts`) ne connaît pas `attachments` aujourd'hui — son type `NotificationData` local ne le déclare pas. Il est étendu :

- `send()` est retypé sur `NotificationTypes.ProviderSendNotificationDTO` (le vrai contrat du framework), pas le type local partiel.
- Une fonction pure et exportée, `mapAttachmentsForResend(attachments)`, traduit chaque `Attachment` Medusa (`content`, `filename`, `content_type`, `id`, `disposition`) vers la forme Resend (`content`, `filename`, `contentType`, `contentId`) — **explicitement, champ par champ**, jamais par spread : un spread produirait une pièce jointe sans `contentType`, que Resend devinerait depuis le nom de fichier.
- Le corps de l'email restaurateur est un **second template react-email** (`templates/kitchen-ticket-notification.tsx`, à côté d'`order-confirmation.tsx`), enregistré sous `template: "kitchen-ticket-notification"` dans le `switch` de `renderTemplate`. Le PDF n'est **pas** ce template — il est construit séparément par le subscriber et passé via `attachments` à `createNotifications`, un champ indépendant de `template`.

### Ce qui est explicitement rejeté

- **Un provider Resend factice enregistré en test.** Nouvelle infra non nécessaire — voir Testing Decisions pour le seam retenu à la place.
- **Une route admin pour réimprimer le ticket.** L'attachment n'est jamais archivé (recherche §1.2, le modèle `notification` n'a pas de colonne `attachments`) ; une route `GET /admin/orders/:id/kitchen-ticket` réutilisant le même template fermerait cette boucle, mais c'est un prolongement, pas ce spec.

## Testing Decisions

**Ce qui fait un bon test ici : on teste le comportement observable, jamais l'implémentation** (AGENTS.md) — on regarde ce qui a été rendu ou persisté, jamais l'ordre d'appel interne d'un module.

### Seam 1 — le rendu PDF, en test unitaire pur

`src/lib/pdf/__tests__/kitchen-ticket.unit.spec.ts`, mirroir de `src/lib/slots/__tests__/derive-slots.unit.spec.ts` : aucune base, aucun réseau, juste `buildKitchenTicketDocDefinition(order) → docDefinition → pdfmake.createPdf(...).getBuffer()`.

Assertions sur le buffer produit, par lecture directe du PDF (comme dans la recherche §6.3, en dur dans le test, pas via une lib supplémentaire) :
- **une seule page**, et une largeur de **226,77pt (80mm)**, lues dans le `/MediaBox` ;
- **la hauteur grandit** avec le nombre de lignes de commande (ticket à 2 lignes vs ticket à 20 lignes) ;
- **le contenu textuel attendu est présent** — nom du client, Créneau, chaque plat et son allergène, dans cet ordre. Extraction de texte via `pdf-parse` (nouvelle devDependency, pure JS, aucun binaire système) plutôt qu'une lecture visuelle — c'est ce qui rend l'assertion reproductible en CI.
- **aucun prix, aucun total** n'apparaît dans le texte extrait.
- **les accents survivent** — un plat nommé « Bœuf » dans le texte extrait, pas « Buf » ni un caractère de remplacement.
- **une ligne Formule affiche sa Sélection** — le nom de la Formule suivi du `label` de chaque Composant et du nom de la Variante choisie, dans l'ordre de rang des Composants (pas l'ordre des clés de `metadata`) ; fixture construite comme dans `src/lib/formule/__tests__/validate-selection.unit.spec.ts` (une Curation, une Sélection valide dessus), pas une base réelle.
- **une Sélection dont la Curation ne répond plus affiche l'id brut de la Variante** plutôt que de faire disparaître la ligne — mirroir de `resolveFormuleSelectionEntries` (`apps/backend/src/admin/lib/formule.ts`), même repli, même raison.

### Seam 2 — le mapping Resend, en test unitaire pur

`mapAttachmentsForResend`, testé isolément : un `Attachment` Medusa avec `content_type`/`id` produit un objet Resend avec `contentType`/`contentId` (jamais les clés snake_case d'origine), et `content_type` absent retombe sur une valeur par défaut explicite plutôt que sur l'inférence de Resend.

### Seam 3 — l'envoi déclenché, en intégration HTTP

Réutilise la fixture de commerce déjà écrite dans `complete-cart.spec.ts` (créneaux de retrait) : `POST /store/carts/:id/complete` déclenche réellement `order.placed` sur une vraie base disposable, exactement comme pour la feature créneaux.

L'assertion ne porte **pas** sur le contenu réellement envoyé à Resend — la recherche (§1.2) a montré que le modèle `notification` ne persiste jamais `attachments`, et lire le code du module (`notification-module-service.js:82-108`) montre que la ligne `notification` est **insérée puis mise à jour avec son statut, que l'envoi au provider réussisse ou échoue** ; l'erreur n'est levée qu'après cette persistance. Le test résout `Modules.NOTIFICATION` depuis le container et vérifie qu'**exactement deux notifications existent** pour la commande : une `channel: "email"` / `template: "order-confirmation"` vers l'email du client, une `channel: "email"` / `template: "kitchen-ticket-notification"` vers l'adresse du restaurant configurée — sans dépendre de la valeur de `status`.

**Point à trancher avant d'implémenter ce seam, signalé plutôt que décidé ici** : cette approche déclenche un vrai appel réseau vers l'API Resend pendant les tests (avec échouera probablement faute de clé valide dans `.env.test`, ce qui est acceptable pour l'assertion ci-dessus mais dépend que l'environnement de test ait un accès réseau sortant, ce que ni ce spec ni la recherche n'ont vérifié pour l'environnement CI de ce repo). Si l'accès réseau sortant en test s'avère indisponible ou indésirable, la solution de repli est un provider Resend factice sous `NODE_ENV=test` dans `medusa-config.ts` — explicitement rejetée ci-dessus comme coût à ne pas payer par défaut, mais à reconsidérer si ce seam échoue en pratique.

### Volontairement non testé

Le rendu de l'email HTML (`kitchen-ticket-notification.tsx`) — react-email, comme `order-confirmation.tsx` aujourd'hui, sans test dédié. La page de réglages admin pour l'adresse email du restaurant — vue au-dessus d'un seam déjà couvert (le module `pickup` a son propre CRUD), vérification à la main comme le reste de l'admin `pickup`.

## Out of Scope

- **La Facture.** ADR 0002 en résout déjà les questions dures ; ce spec ne fait qu'aligner son choix de moteur PDF sur cette future implémentation, pas l'implémenter.
- **La réimpression du ticket depuis l'admin.** Prolongement naturel une fois ce spec en place, pas ce spec.
- **Tout pilotage direct d'imprimante.** Le ticket est un PDF que le restaurateur imprime lui-même depuis l'email — jamais un flux qui parle à l'imprimante.
- **La mesure de la largeur imprimable réelle de l'imprimante du restaurant.** 80mm est la largeur du papier, pas nécessairement la zone imprimable — c'est une vérification physique à faire sur place, pas un paramètre du code.

## Further Notes

La question que ce spec posait à la feature Formules — où vit une Sélection sur la ligne de commande, sous une forme qui puisse alimenter un ticket cuisine — est tranchée par ADR 0005 : `line_item.metadata`, une clé plate par Composant. Ce spec en est le premier lecteur réel.

Le point signalé en Testing Decisions (accès réseau sortant vers Resend en test) mérite d'être vérifié tôt dans l'implémentation — avant d'écrire les autres tests du Seam 3, pas après.
