# 01 — La vanne, de bout en bout

**What to build:** La balle traçante. Un interrupteur écrit en base traverse toutes les couches et rend le paiement impossible, immédiatement, sans qu'aucune interface n'existe encore.

Le restaurateur (via HTTP pour l'instant, l'écran arrive en 02) active le **Mode vitrine** et écrit éventuellement une **Note de vitrine**. À partir de cet instant, aucun panier ne peut devenir une Commande : la finalisation est refusée côté serveur, ce qui rend sans effet l'onglet resté ouvert, le cache d'un CDN et le lien direct vers le tunnel de paiement. Il éteint, les commandes repassent.

Périmètre réduit exprès : aucune interface, aucun masquage côté storefront, aucun encadré. Rien de visible pour le client — mais la garantie existe, et c'est elle qui protège réellement le restaurant.

Rappel de l'ADR 0010 : ce module ne lit **ni** les Créneaux, **ni** les Fermetures, **ni** les Annonces, **ni** les Produits. Le Mode vitrine est décidé, jamais dérivé, et il n'a ni durée ni date de fin.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Module Medusa custom `showcase`, avec son modèle et sa migration — jamais logé dans `pickup`, qui répond « quand peut-on retirer » et non « prend-on des commandes »
- [x] Modèle à **ligne unique** sur le modèle de `PickupConfig` : `id`, `enabled` (booléen, faux par défaut), `note` (texte, nullable)
- [x] Aucune date, aucune période, aucun horodatage de bascule dans le modèle — le mode n'a pas de durée (ADR 0010)
- [x] L'absence de ligne en base signifie **mode éteint, note vide** ; la lecture ne crée jamais de ligne
- [x] L'écriture passe par un **workflow** d'upsert calqué sur `upsertPickupConfigWorkflow`, jamais par de la logique dans la route (`AGENTS.md`)
- [x] Validation zod dans les middlewares du module : `enabled` booléen obligatoire, `note` trimmée, nullable, **280 caractères maximum**
- [x] Une note vide après trim est enregistrée comme `null` — « pas de note » est un seul état, pas deux
- [x] Aucune contrainte croisée : activer sans note est valide, écrire une note sans activer aussi
- [x] `GET /admin/showcase` renvoie l'état courant, `POST /admin/showcase` fait l'upsert des deux champs
- [x] Pas de `DELETE` : l'état existe toujours, il vaut faux
- [x] `GET /store/showcase` renvoie `{ showcase_mode: boolean, note: string | null }`
- [x] Quand `showcase_mode` est faux, `note` est **toujours `null` sur le fil**, même si une note est enregistrée — une note préparée à l'avance n'est pas un contenu publié
- [x] Le refus s'ajoute au hook `completeCartWorkflow.hooks.validate` **existant**, appendu aux contrôles de Créneau et de Sélection — pas un second hook enregistré à côté
- [x] Le contrôle du Mode vitrine s'exécute **en premier**, avant celui du Créneau : quand les deux échoueraient, le client doit lire que les commandes sont suspendues et non un message qui l'enverrait choisir un autre créneau
- [x] Le refus est une `MedusaError` de type `conflict` (409) — un refus délibéré du restaurant, pas une donnée invalide du client. À défaut de ce mapping dans la version installée, n'importe quel 4xx explicite convient, jamais un 500
- [x] **L'ajout au panier n'est pas refusé** : le point de non-retour est le paiement, et fermer les routes cart natives une par une est une surface d'entretien pour empêcher quelqu'un de remplir un panier qu'il ne peut de toute façon pas payer
- [x] Test d'intégration HTTP dans un unique fichier de spec, sur `medusaIntegrationTestRunner` — art antérieur : `announcements.spec.ts`, `complete-cart.spec.ts`, `table-reservation-guard-rails.spec.ts`
- [x] Test : base vierge — état admin et état store disent tous deux « éteint, pas de note », sans qu'aucune ligne n'ait été créée
- [x] Test : activation via la route admin, relue par la route admin puis par la route store
- [x] Test : note enregistrée puis servie ; note absente servie à `null`
- [x] Test : la note **n'est pas servie** quand le mode est éteint, alors même qu'elle est enregistrée — le cas de la note préparée à l'avance
- [x] Test : extinction — la route store repasse à « éteint » et la note cesse d'être servie
- [x] Test : validation — note au-delà de 280 caractères refusée, chaîne vide normalisée en `null`, espaces de tête et de fin retirés, `enabled` manquant refusé
- [x] Test : **finalisation de panier refusée** quand le mode est actif, avec le message de suspension
- [x] Test : finalisation de panier **acceptée** quand le mode est éteint — la vanne ne doit pas fuir dans l'autre sens
- [x] Test : **précédence** — mode actif *et* créneau invalide, le message rendu est celui de la suspension
- [x] Test : **l'ajout au panier reste accepté** pendant que le mode est actif. Le comportement est délibéré et le test le documente, faute de quoi le prochain lecteur le corrigera comme un bug
- [x] Test : routes admin protégées — sans session admin, refus
- [x] Aucun seam unitaire ajouté : il n'y a ici aucune dérivation pure à isoler, ni horloge, ni calcul de fenêtre — un booléen et une chaîne, lus et servis
