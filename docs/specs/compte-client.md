# Compte client

Status: ready-for-agent

Décisions amont, à lire avant d'implémenter — cette spec ne les rejoue pas :
[ADR 0011](../adr/0011-compte-offered-after-the-payment.md) (le Compte est optionnel, offert après le paiement et jamais dans le tunnel ; l'Adresse de facturation s'écrit en silence, une seule, la dernière servie ; la première Commande se rattache par email, et pourquoi le rattachement silencieux a été refusé),
[ADR 0002](../adr/0002-factures-issued-frozen.md) (la Facture est émise à chaque encaissement et figée — c'est elle qui impose l'Adresse de facturation à *tous* les clients, et donc les sept champs obligatoires que le Compte évite de retaper),
et le glossaire dans [CONTEXT.md](../../CONTEXT.md), section *Le client* (Compte, Client, Adresse de facturation).

Vocabulaire français du glossaire → identifiants anglais, comme partout ailleurs dans le repo :
`Compte → Customer` (le `Customer` de Medusa), `Adresse de facturation → billing address` (portée par `shipping_address`, jamais une livraison), `Rattachement → order transfer`.

## Problem Statement

Le client qui commande sur la Carte remplit, à chaque commande, un formulaire de **sept champs obligatoires** dont une adresse postale complète — prénom, nom, adresse, code postal, ville, pays, email. Il le remplit parce qu'une Facture est émise pour chaque commande et porte son Adresse de facturation : ce n'est pas une exigence réservée aux professionnels, c'est la conséquence d'ADR 0002 pour tout le monde. L'habitué qui commande son déjeuner toutes les semaines retape donc son adresse toutes les semaines.

Medusa fournit pourtant nativement les comptes clients, et le storefront les contient déjà en entier — inscription, connexion, profil, historique. Mais **aucun lien n'y mène** : la nav ne pointe que vers le panier. Le parcours est donc invité de bout en bout, non par décision mais par absence de porte.

Et cette porte, telle quelle, est un piège. L'espace compte parle l'anglais du starter (« Become a Medusa Store Member »), la réinitialisation de mot de passe **n'existe pas**, et `ProfilePassword` est un moignon (`console.info("Password update is not implemented")`) retiré de la page. Un mot de passe qu'on ne peut ni changer ni récupérer se retourne contre le premier client qui l'oublie.

## Solution

Ouvrir le Compte, en une fois et sans piège derrière, pour ce qu'il vaut ici et rien de plus : **éviter la ressaisie, et donner accès à ses commandes passées.**

Le tunnel n'est pas touché. Aucune étape, aucun lien de connexion ne s'intercale entre la Carte et la commande payée. Le Compte se propose **après le paiement**, sur la page de confirmation, où il ne coûte au client qu'un mot de passe : son nom, son téléphone et son adresse viennent de la commande qu'il vient de payer. Un client déjà inscrit passe par une icône permanente dans l'en-tête, à côté du panier.

L'Adresse de facturation suit la Commande sans que personne n'y pense : le compte naît peuplé, et chaque commande passée en étant connecté remplace l'adresse enregistrée. Une seule adresse, toujours la dernière servie, corrigeable à la main sur le profil.

La commande passée en invité juste avant la création du compte se rattache par le **flux de transfert natif**, avec un email de confirmation : un clic, une seule fois dans la vie du client. Dès la deuxième commande, le panier porte le `customer_id` dès le premier plat ajouté et plus rien n'est à revendiquer.

Et la porte s'ouvre avec sa serrure de secours : réinitialisation de mot de passe, changement de mot de passe, espace compte entièrement en français.

## User Stories

1. En tant que client, je veux commander sans créer de compte, afin de ne pas troquer mon déjeuner contre un mot de passe.
2. En tant que client, je veux qu'aucune étape de connexion ne s'intercale entre mon panier et mon paiement, afin d'aller au bout sans détour.
3. En tant que client, je veux que la Carte, ses prix et ses boutons de commande soient identiques connecté ou déconnecté, afin que le compte ne conditionne jamais rien.
4. En tant que client qui vient de payer, je veux qu'on me propose de créer un compte, afin de ne pas ressaisir mon adresse la prochaine fois.
5. En tant que client qui crée son compte après paiement, je veux n'avoir qu'un mot de passe à choisir, afin que la création coûte un champ et non un formulaire.
6. En tant que client qui vient de créer son compte, je veux que mon nom, mon téléphone et mon adresse y soient déjà, afin de ne pas avoir saisi deux fois ce que je viens de saisir.
7. En tant que client qui décline la proposition, je veux que la page de confirmation reste entière et lisible, afin que refuser ne me prive de rien.
8. En tant que client déjà connecté quand j'arrive sur la confirmation, je veux qu'on ne me propose pas de créer un compte que j'ai déjà.
9. En tant que client déjà inscrit, je veux un point d'entrée permanent vers mon compte, afin de pouvoir me connecter sans le chercher.
10. En tant que client connecté, je veux que mon adresse de facturation soit déjà remplie au paiement, afin de ne taper que ce qui change.
11. En tant que client qui a déménagé, je veux que l'adresse saisie à ma nouvelle commande devienne la mienne, afin de n'avoir rien à corriger ailleurs.
12. En tant que client, je veux ne jamais avoir à choisir entre deux adresses, parce que je n'en ai qu'une.
13. En tant que client, je veux pouvoir corriger mon adresse à la main depuis mon profil, afin de ne pas dépendre d'une prochaine commande pour la rectifier.
14. En tant que client, je veux retrouver la liste de mes commandes passées, afin de savoir ce que j'ai commandé et quand.
15. En tant que client qui vient de créer son compte, je veux pouvoir y rattacher la commande que je viens de passer en invité, afin que mon historique ne commence pas vide.
16. En tant que client, je veux que ce rattachement me soit confirmé par un email qui m'est adressé, afin que personne d'autre ne puisse revendiquer ma commande.
17. En tant que client, je veux que ce rattachement ne me soit demandé qu'une fois dans ma vie, afin que la gêne ne se répète pas.
18. En tant que client dont la deuxième commande est passée en étant connecté, je veux qu'elle apparaisse dans mon historique sans que je fasse quoi que ce soit.
19. En tant que client qui s'est inscrit avant de commander, je veux que ma commande m'appartienne directement, sans aucun email de rattachement.
20. En tant que client qui se connecte alors que mon panier est déjà composé, je veux retrouver ce panier intact.
21. En tant que client qui se déconnecte, je veux garder mon panier et pouvoir commander en invité, afin qu'une déconnexion ne me fasse pas tout recommencer.
22. En tant que client qui a oublié son mot de passe, je veux le réinitialiser par email, afin de ne pas perdre mon compte.
23. En tant que client, je veux pouvoir ouvrir le lien de réinitialisation sur un autre appareil que celui où j'ai fait la demande.
24. En tant que client, je veux pouvoir changer mon mot de passe depuis mon profil, sans avoir à prétendre l'avoir oublié.
25. En tant que visiteur, je veux qu'une demande de réinitialisation ne m'indique pas si un compte existe pour cette adresse, afin qu'on ne puisse pas sonder la clientèle du restaurant.
26. En tant que client, je veux que tout l'espace compte soit en français, afin de ne pas croire m'être trompé de site.
27. En tant que client professionnel, je veux que l'adresse enregistrée soit exactement celle qui part sur ma Facture, afin qu'elle reste valable comptablement.
28. En tant que restaurateur, je veux que rien de tout ceci ne change le Ticket cuisine ni la Notification de commande, afin que le service ne voie aucune différence.
29. En tant que restaurateur, je veux ne recevoir aucun email lié aux comptes clients, afin que ma boîte reste celle des commandes.
30. En tant que développeur, je veux que les deux emails empruntent le module `resend-notification` existant, afin de ne pas introduire un second chemin de notification.
31. En tant que développeur, je veux que l'écriture de l'adresse sur le Client passe par un Workflow, afin que la logique ne vive pas dans un souscripteur.
32. En tant que développeur, je veux que l'adresse enregistrée ne dépende pas du succès du rattachement, afin que les deux fonctions du Compte tombent en panne indépendamment.
33. En tant que développeur, je veux qu'une commande passée en invité n'écrive rien sur aucun Client.
34. En tant que développeur, je veux qu'un Client ne porte jamais deux adresses de facturation, afin qu'aucun sélecteur ne redevienne nécessaire.
35. En tant que développeur, je veux que les liens des deux emails pointent vers des routes storefront qui existent, afin qu'aucun jeton ne mène à une page absente.
36. En tant que développeur, je veux qu'aucune route API nouvelle ne soit créée, afin que tout repose sur le natif déjà installé.

## Implementation Decisions

### Backend — les deux emails

**Deux souscripteurs, un par événement, tous deux natifs et déjà émis :** `order.transfer_requested` (émis par `requestOrderTransferWorkflow`, jeton dans la charge) et `auth.password_reset` (émis par `generateResetPasswordTokenWorkflow`, derrière la route native `POST /auth/customer/emailpass/reset-password`). Aucun des deux n'est écouté aujourd'hui, et le souscripteur `configurable-notifications` de Medusa n'est configuré pour aucun : c'est pourquoi les deux mécanismes sont, en l'état, silencieusement inertes.

**Deux templates ajoutés à `resend-notification`**, à côté des six existants, et déclarés dans le `switch (template)` du service. Rien d'autre ne change dans le module.

**Le contenu de chaque email est un lien et rien d'autre d'essentiel.** L'email de rattachement porte le lien d'acceptation vers la route storefront de transfert, **qui existe déjà** ; l'email de réinitialisation porte le lien vers la nouvelle page de définition du mot de passe. Le jeton est la seule chose qui identifie la demande : un email sans jeton exploitable est un email inutile, et c'est le mode de panne à couvrir en test.

**Destinataires.** L'email de rattachement part à l'adresse portée par la Commande — c'est précisément ce qui en fait une preuve de possession de la boîte mail (ADR 0011). L'email de réinitialisation part à l'adresse demandée. **Le restaurant n'est destinataire d'aucun des deux** : ces emails ne concernent pas le service.

**Aucune énumération.** La route native de réinitialisation répond de façon identique que le compte existe ou non ; le souscripteur ne doit rien faire qui rende la différence observable de l'extérieur.

### Backend — l'adresse suit la Commande

**Un souscripteur sur `order.placed` qui appelle un Workflow**, jamais des appels de service enchaînés dans le souscripteur (`AGENTS.md`). Le souscripteur est nouveau et distinct des trois existants sur cet événement : une responsabilité, un fichier.

**La règle, en une phrase :** si la Commande a un Client, l'Adresse de facturation de ce Client devient celle de la Commande — mise à jour si elle existe, créée sinon. **Jamais une seconde adresse.** Une Commande sans Client n'écrit rien.

**Le rattachement ne déclenche pas cette écriture, et c'est délibéré :** `acceptOrderTransferWorkflow` **n'émet aucun événement**, rien ne peut donc réagir à l'acceptation d'un transfert. La conséquence est assumée et vaut mieux que le contournement : c'est la **création du compte après paiement qui écrit l'adresse elle-même**, à partir de la commande qu'elle a sous la main. Un client qui ne clique jamais l'email de rattachement garde donc son adresse pré-remplie et perd seulement son historique — les deux fonctions du Compte échouent séparément.

### Storefront — le point d'entrée

**Une icône « Mon compte » à côté du panier**, vers `/account`, avec le libellé accessible en français et le même traitement visuel que l'icône de panier existante (charte, survol doré). Pas de libellé texte : le Compte est accessoire et ne doit pas peser autant que la Carte et le panier.

**Aucune condition à écrire.** Le layout de `/account` rend déjà `customer ? dashboard : login` par routes parallèles : le même lien mène à la connexion pour un visiteur et au compte pour un client. L'icône est visible dans tous les états, Mode vitrine compris — le compte n'a rien à voir avec la suspension des commandes.

### Storefront — la création après le paiement

**Un bloc sur la page de confirmation de commande**, après le récapitulatif, proposant de créer un compte. Un seul champ : le mot de passe. L'email, le nom, le téléphone et l'adresse viennent de la Commande affichée.

**L'enchaînement**, entièrement en appels SDK natifs : inscription → création du Client avec le nom et le téléphone de la Commande → connexion → écriture de l'Adresse de facturation depuis la Commande → demande de rattachement de cette Commande.

**Les échecs ne se propagent pas.** Si la demande de rattachement échoue, le compte et l'adresse restent acquis et le client en est informé sans que ce soit présenté comme une erreur bloquante. La page de confirmation ne doit jamais être perdue ni remplacée par une redirection : c'est la seule page qui porte le numéro de commande et le Créneau.

**Le bloc disparaît** pour un visiteur déjà connecté.

### Storefront — le mot de passe

**Deux pages nouvelles** : demander une réinitialisation (une adresse email), et définir le nouveau mot de passe à partir du jeton. La seconde fonctionne **déconnecté et sur n'importe quel appareil** — le jeton suffit, et c'est la raison d'être du lien.

Les deux s'appuient sur le natif : `resetPassword` pour la demande, `updateProvider` avec le jeton pour la pose. La table `auth_password_reset_token` (hachage, expiration) est native et déjà migrée — **rien à modéliser**.

**`ProfilePassword` est à implémenter, pas à décommenter** : c'est un moignon du starter qui journalise « not implemented ». Une fois réel, il retrouve sa place sur la page Profil.

### Storefront — la déconnexion, la francisation

**La déconnexion garde le panier** : l'appel qui efface l'identifiant de panier sort de `signout`. Se déconnecter retire l'identité, pas les plats choisis ; le panier redevient un panier invité et reste commandable, ce qui est le mode normal du domaine. Retirer l'identité ne se limite pas au jeton : le panier lui-même doit être détaché du client (`customer_id`, email, adresse) — voir [ADR 0012](../adr/0012-logout-detaches-the-cart-from-the-customer.md), qui explique aussi pourquoi ceci exige la seule route nouvelle de cette epic.

**Francisation complète de l'espace compte** — connexion, inscription, accueil du compte, profil, commandes, navigation du compte, et les titres et métadonnées de page. Aucun « Medusa Store » ne doit subsister sur une page que voit un client.

### Ce qui n'est pas créé

**Aucune route API nouvelle, ni admin ni store — sauf une.** Tout repose sur des routes natives déjà installées : authentification, réinitialisation, client, adresses, transfert de commande. Le seul code backend ajouté est constitué de souscripteurs, de templates et d'un workflow, à une exception près : `DELETE /store/customers/me/carts/:id/customer`, qui détache le panier du client à la déconnexion. Voir [ADR 0012](../adr/0012-logout-detaches-the-cart-from-the-customer.md) pour pourquoi cette route existe malgré cette règle.

## Testing Decisions

Un bon test ici interroge les routes et vérifie ce qui est réellement persisté et servi. Il ne teste jamais une méthode interne du module, ni l'ordre des étapes d'un workflow, ni l'état d'un composant React (`AGENTS.md`).

**Un seul seam**, comme pour le Mode vitrine et pour la même raison : cette feature n'introduit **aucune dérivation pure** — pas de calcul, pas d'horloge, pas de fenêtre. Le contenu des liens est vérifiable sur la ligne de notification, au seam HTTP ; un test unitaire sur les templates ne vérifierait qu'un rendu React.

**Seam — HTTP integration**, sur `medusaIntegrationTestRunner`, deux fichiers dans `apps/backend/integration-tests/http/`.

**Les emails.** Art antérieur direct : `table-reservation-notifications.spec.ts` et `kitchen-ticket-notification.spec.ts`, avec l'aide `wait-for-reservation-notifications.ts`, qui interroge `Modules.NOTIFICATION` et attend que les lignes sortent de `pending` — la notification part **après** la réponse HTTP, l'attendre est obligatoire.

- Demander le transfert d'une commande produit une notification portant le bon template, adressée à l'email **de la commande**, et transportant l'identifiant de commande et le jeton.
- Demander une réinitialisation produit une notification portant le bon template, adressée au demandeur, transportant le jeton.
- **Le jeton transporté permet effectivement d'aboutir** : accepter le transfert avec ce jeton rattache la commande ; un jeton faux est refusé. C'est le test qui garantit que l'email n'est pas décoratif.
- Une réinitialisation demandée pour une adresse **inconnue** ne crée aucune notification, et la route répond comme pour une adresse connue.
- Le restaurant ne reçoit rien : aucune notification supplémentaire ne part vers l'adresse de notification du restaurant.

**L'adresse.** Art antérieur direct : `complete-cart.spec.ts` (parcours complet d'un panier jusqu'à la commande) et `invoice-issue.spec.ts` (effet asynchrone déclenché par `order.placed`, avec son aide d'attente).

- Finaliser un panier en étant authentifié pose l'adresse de la Commande en adresse de facturation par défaut du Client.
- Une **seconde** commande avec une autre adresse **remplace** la première : le Client a toujours exactement une adresse de facturation par défaut, jamais deux.
- Une commande **invité** n'écrit sur aucun Client.
- Un Client qui avait déjà renseigné son adresse à la main la voit remplacée par celle de sa dernière commande — le comportement est délibéré (« la dernière servie »), et un test le documente, faute de quoi le prochain lecteur le corrigera comme un bug.

**Aucun test storefront.** `apps/storefront` n'a aujourd'hui ni runner, ni script `test`, ni fichier spec. L'icône de nav, le bloc post-paiement, les deux pages de mot de passe, la francisation et la conservation du panier à la déconnexion sont vérifiés à la main. C'est la même lacune consciente que les specs Annonces et Mode vitrine ont déjà enregistrée, pas un oubli.

## Out of Scope

- **La fidélité, la recommande en un geste, la carte bancaire enregistrée.** Les trois seules choses qui rendraient un Compte désirable sur un site de restaurant, et aucune n'est décidée (ADR 0011). Le jour où la fidélité est arbitrée — décision commerciale, pas fonctionnalité — la prémisse de cette spec change.
- **La vérification d'email à l'inscription.** `@medusajs/auth-emailpass` n'en a aucune notion en 2.16, et le trou est nommé et assumé dans ADR 0011. Le combler est une décision distincte, qui protégerait aussi l'adresse recopiée sur le profil.
- **Le carnet d'adresses et son sélecteur.** Retirés du starter délibérément ; les réintroduire rouvrirait une question que le glossaire a tranchée — un Client a une Adresse de facturation.
- **Le rattachement silencieux, sans email.** Techniquement possible en enchaînant les deux workflows natifs côté serveur ; refusé et motivé dans ADR 0011.
- **Tout lien de connexion dans le tunnel de commande** (ADR 0011).
- **Le suivi de commande dans le compte** — « en préparation », « prête ». La Commande n'a aucun cycle de vie, et c'est une décision du glossaire, pas une lacune.
- **La connexion par lien magique, les fournisseurs tiers (Google, Apple).** Le storefront écarte déjà explicitement les fournisseurs renvoyant une redirection.
- **La suppression de compte en autonomie.** Voir *Further Notes*.
- **Toute modification du Ticket cuisine, de la Notification de commande ou de la Facture.**

## Further Notes

**Le `default` du `switch (template)` de `resend-notification` est un piège silencieux.** Il renvoie aujourd'hui un email au sujet « Notification » et au corps « Vous avez une nouvelle notification. » — sans jeton, sans lien. Un template mal orthographié ne casse donc rien : il envoie un email vide. Avec deux templates de plus, dont deux qui ne valent que par leur lien, le piège devient sérieux. Rien n'est changé ici ; c'est signalé pour que le prochain lecteur le voie, et le corriger serait une bonne première ligne d'un ticket voisin.

**La branche `verification_required` de la connexion storefront est du code mort** contre ce backend : `@medusajs/auth-emailpass@2.16.0` n'a aucune notion de vérification. Elle est laissée en place, mais personne ne doit construire dessus en croyant que la vérification existe.

**L'effacement des données.** Stocker durablement une adresse postale rend la question inévitable : il n'y a **aucun écran de suppression de compte**, et une demande de client se traite depuis l'admin Medusa, à la main. C'est cohérent avec le volume (un restaurant, des demandes rares) et avec le reste du domaine, où l'Avoir aussi s'écrit à la main. C'est nommé ici pour que ce soit un choix et non un oubli.

**Un identifiant de commande se lit sans authentification** — c'est ce qui fait fonctionner la page de confirmation d'un invité, et c'est exactement la raison pour laquelle le rattachement garde son email (ADR 0011). Toute évolution future qui rendrait les commandes plus faciles à revendiquer doit repasser par cette contrainte.

**Le chemin « inscrit d'abord » ne demande aucun travail** : le panier est créé avec les en-têtes d'authentification, il porte donc le `customer_id` dès le premier plat ajouté, et la connexion en cours de composition transfère le panier existant. Ça fonctionne déjà aujourd'hui — c'est la raison pour laquelle l'email de rattachement ne concerne jamais qu'une seule commande.
