# Handoff — Vrai menu + Curation Formule en ligne sur staging, checkout bloqué par un bug de redaction d'erreur Next.js

*2026-08-06*

Suite de [2026-08-05-medusa-staging-live-to-images-and-prod.md](2026-08-05-medusa-staging-live-to-images-and-prod.md) — reprise au point 3 de son "What's next" (transférer les données locales vers staging).

## Where things stand

- **Le vrai menu est en ligne sur staging et navigable côté storefront** : 42 produits réels, publiés, avec leurs 6 catégories (Boissons, Desserts, Entrées, Formules, Plats, Soupes), images R2, prix EUR. Les 4 produits de démo Medusa (T-Shirt/Sweatshirt/Sweatpants/Shorts) et leurs 4 catégories démo ont été supprimés de staging.
- **La Curation des 6 Formules est en place** (module custom `formule`, ADR 0001/0005) : 14 Composants, 226 lignes de Curation (Variante ↔ Composant), comptes identiques au local vérifiés un par un. Absente du premier transfert, ajoutée après coup (voir §4 ci-dessous).
- **TVA correcte** : région liée à la TVA 10% (déjà présente) *et* une nouvelle TVA 20% scopée sur un `product_type` "Alcool" (3 bières), comme en local.
- **Stock location réelle** "Restaurant Kim-Hi Noodle" (vraie adresse, 652 Avenue de l'Europe, 34170 Castelnau-le-Lez) créée sur staging et liée au fulfillment set de retrait — qui a dû être *re-pointé* depuis le stock location de démo "European Warehouse" du seed (un fulfillment set ne peut être lié qu'à un seul stock location à la fois côté Medusa).
- **Mentions légales de facture (`issuer_config`) corrigées** avec les vraies infos de la société — **CHOUR**, SIREN 904222353, SIRET 90422235300016, TVA FR88904222353, SAS, RCS Montpellier — trouvées via [societe.com](https://www.societe.com/societe/chour-904222353.html) et confirmées par l'utilisateur. Affichage choisi : "CHOUR – Kim-Hi Noodle" (raison sociale + enseigne). Appliqué en local puis sur staging.
- **Paiement Stripe test disponible au checkout sur staging**, et staging est maintenant **Stripe-only** (paiement manuel retiré à la demande de l'utilisateur) — le module Stripe était actif mais jamais lié à la région (bug de config, voir §6).
- **Bloquant, non résolu à l'arrêt de la session** : passer une commande sur staging échoue avec un écran d'erreur générique Next.js dès qu'une erreur métier survient à la validation (créneau expiré testé concrètement). La cause est identifiée avec certitude (§7) mais **le correctif n'a pas été appliqué** — c'est la prochaine chose à faire à la reprise.
- **Aucun changement de code committé cette session.** Deux scripts one-off (`export-menu-data.ts`, `import-menu-data.ts`) sont restés dans `apps/backend/src/scripts/`, non commités — décision à prendre (voir "Où on s'est arrêté"). `git status --short` :
  ```
   M .gitignore                                                    (pré-existant, pas touché cette session, ajoute .env* — origine non retracée)
   M docs/handoffs/2026-08-05-medusa-staging-live-to-images-and-prod.md
  ?? apps/backend/src/scripts/export-menu-data.ts
  ?? apps/backend/src/scripts/import-menu-data.ts
  ```

## Ce qui s'est passé

**1. Décision d'approche pour le transfert des données** : le plan initial (`pg_dump`/`pg_restore` brut de la base locale vers staging, prévu au point 3 du handoff précédent) a été abandonné avant d'être exécuté, pour deux raisons découvertes en creusant :
- **Les 35 commandes de la base locale sont toutes des commandes de test/dev** (`toshouw@gmail.com`, `jean.dupont@example.com`, `e2e-ticket07@example.com`…) — aucune vraie commande client. Un dump brut les aurait copiées vers staging.
- **La base locale contient aussi du bruit de configuration** accumulé au fil du développement via l'admin, en plus du vrai catalogue : plusieurs fulfillment sets dupliqués ("Restaurant Kim-Hi Noodle shipping/pick up" en plusieurs exemplaires), une ligne TVA 10% dupliquée, le stock location de démo "European Warehouse" jamais nettoyé.
- Une tentative de nettoyage préalable en local (suppression des 4 produits démo avant migration) a été **bloquée par une réservation d'inventaire liée à une commande de test** (`deleteProductsWorkflow` refuse de supprimer un produit dont l'inventaire a une réservation active) — laissée de côté : l'approche finalement choisie n'en avait plus besoin.
- **Décision retenue** : pas de dump SQL. Deux scripts one-off dédiés, qui ne lisent/écrivent que le catalogue réel et la config métier utile (taxe, stock location, pickup, facture) — jamais commandes/clients/paniers/API keys/sales channel/admin — et qui font correspondre les entités **par nom** (titre de produit, titre de variante) plutôt que par ID, puisque les ID ne survivent jamais un changement d'environnement. Voir §3.

**2. Correction de l'`issuer_config`** (mentions légales de facture, jusque-là les placeholders du seed) :
- L'utilisateur a fourni l'URL de la fiche societe.com de la société exploitante.
- Récupéré : raison sociale CHOUR, SIREN 904222353, SIRET 90422235300016, forme juridique SAS (pas SASU comme le plaçait le seed — confirmé par l'utilisateur, cohérent avec plusieurs dirigeants listés), capital 10 000 €, adresse 652 Avenue de l'Europe 34170 Castelnau-le-Lez, RCS Montpellier, TVA FR88904222353.
- Confirmé avec l'utilisateur avant d'écrire : affichage "CHOUR – Kim-Hi Noodle" (le champ `legal_name` du modèle `issuer_config` s'affiche seul, en gras, en tête de facture — pas de champ séparé pour un nom commercial, `apps/backend/src/lib/pdf/invoice.ts:53`).
- Appliqué d'abord en local via un script one-off (jamais commité), vérifié, puis reporté sur staging via le script d'import (§3).

**3. Écriture de `export-menu-data.ts` / `import-menu-data.ts`** (`apps/backend/src/scripts/`, non commités) :
- **Export** (tourne contre la base locale par défaut) : les 42 vrais produits (titre, description, handle, statut, catégories, options, variantes avec prix EUR dédupliqués — le local a accumulé des doublons de prix région-scopés au même montant que le prix devise, filtrés), le stock location réel + son adresse, le planning/config de retrait réels, les mentions légales facture, et — ajouté après coup, voir §4 — la Curation des Formules.
- **Import** (tourne contre la cible via `DATABASE_URL="<DATABASE_PUBLIC_URL>" npx medusa exec ...`, le pattern déjà établi la session précédente) : idempotent, vérifie l'existant avant de créer à chaque étape. Résout les ID de la cible (sales channel, stock location, catégories, produits, variantes) à l'exécution — ne réutilise jamais un ID venu du local.
- **Incident en cours de route** : un premier test à blanc du script d'import contre la base **locale** (pour vérifier l'absence d'erreur avant de toucher staging) a créé par erreur un fulfillment_set + shipping_option en double, nommé "Retrait au restaurant" — ce nom vient du seed, mais le vrai fulfillment set local s'appelle "Restaurant Kim-Hi Noodle pick up" (renommé à la main à un moment du développement). Le script ne l'a donc pas trouvé et en a créé un nouveau. Détecté immédiatement (`fuset_01KZBYTE...` avec un timestamp d'aujourd'hui), nettoyé par un script de suppression dédié (jamais commité). **Leçon retenue : ne plus tester ce script contre local, seulement contre staging/prod**, où les noms correspondent à ceux du seed d'origine.
- **Résultat sur staging** : 42 produits créés et publiés, 6 catégories réelles créées, TVA 20%/Alcool créée, stock location réelle créée et son fulfillment set de retrait re-pointé depuis "European Warehouse" (`link.dismiss` puis `link.create` — un fulfillment set ne peut être lié qu'à un seul stock location, la tentative de lien direct a d'abord échoué avec `Cannot create multiple links between 'stock_location' and 'fulfillment'`).

**4. Bug découvert : "Rupture de stock" sur tous les vrais produits.** Après le transfert, le bouton d'ajout au panier restait désactivé partout. Cause : `createProductsWorkflow` crée les variantes avec `manage_inventory: true` par défaut quand le champ n'est pas fourni dans l'input — l'export initial ne capturait pas ce champ (le vrai catalogue local a `manage_inventory: false` sur ses 81 variantes réelles, seules les 20 variantes de démo T-shirt l'avaient à `true`). Corrigé par un script one-off de mise à jour en masse (81 variantes repassées à `false`) ; le champ a aussi été ajouté à `export-menu-data.ts`/`import-menu-data.ts` pour que ça ne se reproduise pas sur la prod.

**5. Suppression des produits et catégories de démo Medusa sur staging**, à la demande de l'utilisateur : 4 produits (T-Shirt/Sweatshirt/Sweatpants/Shorts) via `deleteProductsWorkflow`, 4 catégories (Shirts/Sweatshirts/Pants/Merch, devenues orphelines) via le service produit directement. Aucune commande sur staging ne les référençait (contrairement au blocage rencontré en local au §1) — suppression propre, sans détour.

**6. Bug découvert : les Formules affichaient le bouton standard au lieu du composeur.** Cause : la Curation (module custom `formule` + Module Link vers `ProductVariant`) n'avait jamais été couverte par le transfert du §3, qui ne connaissait que les modules natifs Medusa. Corrigé :
- Étendu `export-menu-data.ts` pour lire la Curation **en SQL direct** (`formule.product_id` est une colonne texte simple, pas un Module Link — `query.graph` ne peut pas la traverser, contrairement à `composants.product_variants` qui, lui, est un vrai Module Link mais dont le nom de champ correct (`product_variants`, pas `variants` comme deviné au premier essai) a dû être retrouvé dans le code de la route store existante `apps/backend/src/api/store/formules/[product_id]/route.ts`).
- Étendu `import-menu-data.ts` pour rejouer la Curation sur la cible, en faisant correspondre Formule/Composant/Variante curée **par titre de produit + titre de variante**, jamais par ID.
- Résultat : 6 Formules, 14 Composants, 226 lignes de Curation sur staging — comptes identiques au local, vérifiés slot par slot par requête SQL.

**7. Cache Next.js périmé, une fausse piste avant la bonne explication.**
- Après l'ajout de la Curation, le storefront continuait d'afficher l'ancien état (bouton standard) même après un rechargement forcé. Première explication donnée à l'utilisateur — **fausse** : le cookie `_medusa_cache_id` (qui namespace les tags de cache Next.js) serait périmé ; solution proposée : navigation privée. L'utilisateur a testé, sans effet.
- Bonne explication : `getFormule()`/`listProducts()` (`apps/storefront/src/lib/data/{formules,products}.ts`) utilisent `cache: "force-cache"`. Le "Data Cache" de Next.js sur Vercel est **indexé par l'URL de la requête, pas par cookie ni session** — un cache serveur partagé entre tous les visiteurs. Le tag (`formules-<cacheId>`) ne sert qu'à une invalidation ciblée *si du code appelle `revalidateTag`* — ce qu'aucun code ne fait aujourd'hui pour ces deux tags. La navigation privée ne change donc rien : ce n'est pas un cache par session.
- Vérifié concrètement : `curl` direct sur `/store/formules/:product_id` (backend) renvoie la bonne Curation ; le HTML streamé de la page produit staging (`curl` sur `/fr/products/...`) montre, lui, le fallback figé (bouton "Rupture de stock", pas de Curation) — la preuve que c'est bien une entrée de cache serveur périmée, pas un problème de données ni de navigateur.
- **Solution recommandée, non confirmée comme appliquée** : purger le "Data Cache" Vercel. La section `Settings → Caches` n'apparaît pas dans le menu Settings du projet sur le plan Hobby de l'utilisateur (vérifié sur capture d'écran) — la voie fiable est la CLI : `npx vercel cache purge --type data` (nécessite `vercel login`/`vercel link`, interactif, à lancer par l'utilisateur).
- **Gap identifié en creusant, non corrigé** : rien ne déclenche `revalidateTag` quand l'admin modifie un produit ou une Curation — en prod, un client déjà servi verrait indéfiniment l'ancien état après une modification, jusqu'à une purge manuelle. Mentionné à l'utilisateur comme un vrai sujet à traiter avant la prod, pas fait cette session.

**8. Bug découvert : pas de Stripe au checkout, seulement "paiement manuel".** Cause : le module Stripe est bien enregistré et actif sur staging (`STRIPE_API_KEY` présente, module chargé sans erreur), mais **jamais lié à la région** — `seed.ts:130` ne lie la région qu'à `pp_system_default` à sa création. En local, Stripe avait été ajouté à la région à la main via l'admin à un moment du développement, jamais reporté dans le seed. Corrigé par un script one-off : région "Europe" liée à `pp_stripe_stripe` (`updateRegionsWorkflow`, `payment_providers` — remplace la liste, ne l'étend pas). Puis, à la demande de l'utilisateur, second passage du même script sans `pp_system_default` : **staging est maintenant Stripe-only**.

**9. Échec de passage de commande — cause racine identifiée, pas corrigée.**
- Premier essai : écran d'erreur générique Next.js ("An error occurred in the Server Components render. The specific message is omitted in production builds…") au clic sur "Passer la commande".
- Logs Railway (`railway logs`) : le backend rejette la requête `POST /store/carts/.../complete` avec un **400** et le message *"This pickup slot is no longer available: it may have passed, fallen under the prep delay, or the schedule may have changed."* — validation métier légitime, pas un bug serveur. Le créneau choisi était tombé sous le délai de préparation (5 min) pendant que l'utilisateur finalisait le paiement.
- Le code prévoit déjà une récupération douce pour exactement ce cas (`recoverFromPickupSlotError` / `recoverFromFormuleSelectionError` dans `apps/storefront/src/modules/checkout/components/payment-button/index.tsx`, commenté "le cas 13h55") : rediriger vers l'étape Livraison avec un message clair au lieu de planter. Deuxième essai avec un créneau frais → **même écran générique**, ce qui a écarté l'hypothèse "panier périmé" et pointé vers un vrai bug de ce chemin de récupération.
- **Cause racine** : `placeOrder()` (`apps/storefront/src/lib/data/cart.ts`) commence par `"use server"` — c'est une Server Action. Elle `throw` l'erreur via `medusaError()`. **Next.js redacte automatiquement le message de toute erreur `throw`-ée depuis une Server Action en build de production** (comportement volontaire de la RSC, anti-fuite de détails serveur) — invisible en `next dev` local, systématique sur Vercel. Le message reçu côté client n'est donc jamais le vrai texte métier, et `isPickupSlotValidationError`/`isFormuleSelectionValidationError` (qui cherchent des sous-chaînes dans ce message, ex. `"pickup slot"`) ne matchent jamais en production → le fallback générique de Next.js s'affiche à la place de la redirection prévue.
- **Portée** : ce n'est pas isolé au créneau — **toute erreur métier renvoyée par `/complete` perd son message en production**, ce qui inclut aussi le rejet d'une Sélection Formule invalide (`recoverFromFormuleSelectionError`), et potentiellement d'autres Server Actions du même pattern ailleurs dans le storefront.
- **Correctif identifié, pas implémenté** : ne pas `throw` depuis la Server Action pour ces erreurs métier attendues, mais **retourner** une structure `{ error }` sérialisable que le composant client lit directement — une valeur de retour normale ne traverse jamais la frontière RSC qui déclenche la redaction, contrairement à une exception. Touche `placeOrder()` dans `cart.ts` et son point d'appel dans `payment-button/index.tsx`. Proposé à l'utilisateur, qui a arrêté la session avant de trancher.

## Où on s'est arrêté

- **La toute prochaine décision à prendre à la reprise** : corriger ou non le bug de redaction d'erreur Next.js (§9) — c'est un prérequis pour pouvoir tester le checkout correctement sur un environnement déployé (local ne suffit plus à le couvrir, puisque le bug n'existe qu'en build de production).
- **Le checkout est actuellement cassé sur staging dès qu'une erreur métier survient** à la validation de la commande (créneau expiré, Sélection Formule invalide) : écran générique au lieu du message/de la redirection prévus. **Non vérifié en revanche si une commande qui se déroule sans accroc (créneau valide, Stripe test accepté) aboutit normalement** — aucun essai n'est allé au bout cette session, les deux tentatives ont buté sur le créneau expiré.
- **Non confirmé si la purge du Data Cache Vercel (§7) a été faite.** À vérifier en priorité au prochain démarrage de session si le storefront montre encore de vieilles données (produits, Formules).
- **`export-menu-data.ts` et `import-menu-data.ts` sont restés non commités** dans `apps/backend/src/scripts/` — utile de les garder pour peupler la prod plus tard (voir "What's next" point 3), mais pas encore décidé s'ils doivent être committés (avec documentation) ou regénérés au moment venu.

## Problèmes identifiés, non résolus

- **[Nouveau, bloquant] Perte du message d'erreur des Server Actions Next.js en production** (§9) — casse la récupération douce du "cas 13h55" et de la Sélection Formule invalide sur toute erreur de checkout en prod. Fix identifié, pas implémenté.
- **[Nouveau] Aucune invalidation de cache déclenchée par les changements d'admin** (§7) — `getFormule()`/`listProducts()` en `force-cache` sans qu'aucune route admin n'appelle `revalidateTag`. Un changement de Curation ou de stock via l'admin reste invisible aux visiteurs déjà servis par ce cache, jusqu'à une purge manuelle.
- **Factures privées dans un bucket public R2** (session du 2026-08-05, §21 de l'ancien handoff) : toujours non résolu, inchangé.
- **Fichiers orphelins sur disque** (`apps/backend/static/`) et **images réelles non supprimées du disque/du repo** malgré leur présence sur R2 (session du 2026-08-05, §§ "Problèmes identifiés" / 22) : toujours non résolu, inchangé, décision de nettoyage toujours pas prise.
- **Données de démo Medusa en local** : toujours présentes (la suppression n'a été faite que sur staging, §5 — le blocage par réservation d'inventaire en local, §1, n'a pas été retenté).

## What's next

1-2. (fait, session du 2026-08-05).
3. ~~Transférer les données vers staging~~ — **fait cette session**, via une approche différente de celle prévue à l'origine (scripts ciblés `export-menu-data.ts`/`import-menu-data.ts` plutôt qu'un `pg_dump` brut — voir §1-6). Catalogue réel et Curation Formule complète, live sur staging.
4. **Corriger le bug de redaction d'erreur Next.js (§9)** — prochaine étape immédiate, prérequis pour tester le checkout correctement.
5. **Confirmer la purge du Data Cache Vercel** (§7) et retester produits/Formules pour lever le doute.
6. **Aller au bout d'un passage de commande complet** sur staging (créneau valide, Stripe test, Formule) une fois le point 4 réglé — jamais vérifié de bout en bout cette session.
7. Dupliquer l'environnement pour la prod (inchangé depuis le 2026-08-05) — **`export-menu-data.ts`/`import-menu-data.ts` sont directement réutilisables** pour peupler la prod une fois ses services créés, il suffira de pointer `DATABASE_URL` dessus.
8. Bascule DNS finale (inchangé).
9. Redescendre la formule d'hébergement LWS (inchangé).
10. Avant la prod : régler la confidentialité des factures (inchangé) et le point 4 ci-dessus — celui-ci n'est plus seulement "avant la prod", il bloque déjà la validation du checkout sur staging.

## Suggested skills

- `medusa-dev:building-with-medusa` — pour toucher aux workflows Medusa (tax, region, product) si le transfert de données doit être rejoué ou adapté pour la prod.
- `ecommerce-storefront:storefront-best-practices` — pour le correctif du point 4 (Server Actions, gestion d'erreur checkout).

## Note sécurité

Comme pour le handoff précédent : aucune information sensible (mot de passe admin, clés Stripe/Resend/R2, secrets JWT/COOKIE, URL Postgres avec identifiants) n'apparaît dans ce document — `docs/handoffs/` est versionné dans un repo **public**. Ces valeurs restent uniquement dans les variables d'environnement Railway/Vercel et le `.env` local.
