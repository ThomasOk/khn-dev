# Handoff — Staging Medusa (Railway + Vercel) opérationnel, préparation migration images/données avant la prod

*2026-08-05*

## Where things stand

- **Aucun changement de code cette session** — tout le travail était de la configuration externe (Railway, Vercel, LWS). `git status --short` est identique à celui du début de session :
  ```
   M apps/backend/package.json
   M apps/storefront/src/modules/account/components/register/index.tsx
   M apps/storefront/src/modules/checkout/components/review/index.tsx
   M apps/storefront/src/modules/contact/components/reservation-cta-section/index.tsx
   M apps/storefront/src/modules/table-reservation/components/reservation-form/index.tsx
  ```
  (modifications préexistantes, non liées à cette session, à ne pas confondre avec le travail d'infra).
- **Environnement staging entièrement fonctionnel et validé de bout en bout** :
  - Backend Medusa sur Railway (compte Railway séparé, créé spécifiquement pour isoler la facturation de ce projet)
  - Postgres + Redis Railway, migrés et seedés
  - Storefront Next.js sur Vercel
  - Accessible via `https://staging.kim-hi-noodle.fr` (sous-domaine CNAME chez LWS)
  - Admin Medusa staging accessible (identifiants déjà connus de l'utilisateur — stockés uniquement dans Railway, pas dans ce fichier)
- **Catalogue actuellement en staging = données de démo du seed Medusa** (T-shirts, etc.), **pas le vrai menu**. Le vrai catalogue (produits, prix, taxes, 46 images) existe déjà en local, configuré manuellement par l'utilisateur au fil du développement.
- Le domaine `kim-hi-noodle.fr` reste chez LWS. L'hébergement PrestaShop en production n'a **pas** été touché — il tourne toujours normalement.
- **Envoi d'email fonctionnel en staging, validé de bout en bout** (reset de mot de passe testé avec succès vers une adresse externe) : domaine `mail.kim-hi-noodle.fr` vérifié sur Resend, variables `RESEND_API_KEY`/`RESEND_FROM`/`STOREFRONT_URL` configurées sur le service Railway staging.
- **Stockage fichiers R2 fonctionnel en staging et en local**, validé de bout en bout : module `@medusajs/medusa/file-s3` enregistré, bucket `khn-images`, upload/accès public testés avec succès (PR #105, mergée).
- **Les 36 vraies images produits sont migrées vers R2** — la table `image` de la base **locale** ne référence plus `localhost:9000/static/...`. La base **staging**, elle, n'a pas encore été touchée : elle a toujours les données de démo du seed (T-shirts, etc.), pas le vrai menu (point 3 du "What's next", pas encore fait).
- **Repo GitHub passé en public** (contrainte Vercel Hobby, qui ne supporte pas les repos privés) — précédé d'un audit de sécurité complet sur tout l'historique git : rien de sensible trouvé (détail dans "Ce qui s'est passé").
- **4 PRs ouvertes cette session, toutes mergées sur `main` par l'utilisateur** : #105 (R2), #106 (script `db:migrate`), #107 (liens légaux storefront), #108 (responsive mobile réservation) — les 3 dernières correspondaient aux modifications préexistantes en début de session précédente, jamais liées au travail d'infra, désormais committées séparément.
- **Problème identifié, non résolu** : les factures PDF (fichiers "privés" du module `invoice`) atterrissent dans le même bucket R2 public que les images produits — Cloudflare R2 ignore les ACL S3 par objet, et Medusa n'autorise qu'un seul file provider. Pas de fuite via l'app aujourd'hui (route de téléchargement admin-only, URL jamais exposée), mais reste un vrai sujet à traiter. Détail et pistes en fin de fichier.

## Ce qui s'est passé

**1. Stratégie de bascule définie** : domaine reste chez LWS, backend Medusa → Railway, storefront → Vercel, avec un environnement staging avant la prod.

**2. Séparation de facturation Railway** : plutôt qu'un Team payant, l'utilisateur a créé un second compte Railway dédié à ce projet.

**3. Provisioning Railway staging** : projet créé, services Postgres et Redis ajoutés, puis service backend lié au repo GitHub `ThomasOk/khn-dev`.

**4. Config du service backend Railway** (le point le plus délicat, monorepo pnpm/turbo) :
- **Root Directory** : laissé à `/` (racine du repo) — **surtout pas** `apps/backend`, sinon le lockfile pnpm partagé (`pnpm-lock.yaml` à la racine) n'est plus accessible au build.
- **Build Command** final, après plusieurs itérations :
  ```
  pnpm turbo run build --filter=@dtc/backend && cd apps/backend/.medusa/server && pnpm install --no-frozen-lockfile
  ```
- **Start Command** :
  ```
  cd apps/backend/.medusa/server && npm run start
  ```
- Chemin d'échecs jusqu'à cette version : `npm install` seul dans `.medusa/server` → erreur `ERESOLVE` (peer deps `@medusajs/payment-stripe`) → ajout de `--legacy-peer-deps` → nouvelle erreur `429 Too Many Requests` (registre npm, transitoire) → retry → puis `DeadlineExceeded` (build coupé après ~20 min, `npm install` sans lockfile trop lent sur l'infra Railway) → **solution finale : remplacer `npm install` par `pnpm install --no-frozen-lockfile`**, qui réutilise le store pnpm déjà peuplé par l'install initiale du monorepo et est quasi instantané.

**5. Variables d'environnement backend** : `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `REDIS_URL=${{Redis.REDIS_URL}}`, `JWT_SECRET`/`COOKIE_SECRET` générés (`openssl rand -hex 32`, valeurs distinctes de celles à générer pour la prod), `NODE_ENV=production`, `STRIPE_API_KEY` (clé de test, réutilisée depuis le `.env` local), puis `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS` complétés une fois les URLs finales connues.

**6. Premier crash au démarrage** : tables Postgres inexistantes (base fraîchement créée). Migrations lancées **depuis le poste local** :
- `railway link` pour lier le CLI local au projet/service.
- `railway run` seul ne fonctionne **pas** pour ce genre de commande : la variable `DATABASE_URL` du service pointe vers l'hostname interne réseau Railway (`postgres.railway.internal`), injoignable depuis un poste local.
- Il a fallu activer un **TCP Proxy** sur le service Postgres (Settings → Networking) pour obtenir une `DATABASE_PUBLIC_URL`, puis lancer :
  ```
  DATABASE_URL="<DATABASE_PUBLIC_URL>" pnpm --filter @dtc/backend db:migrate
  ```
  (sans `railway run` — les autres secrets nécessaires, comme `STRIPE_API_KEY`/`REDIS_URL`, sont alors pris depuis le `.env` local, ce qui suffit pour ce genre de script one-off).

**7. Deuxième crash** : `apiKey` Stripe manquante (`apps/backend/medusa-config.ts:76`) → ajout de `STRIPE_API_KEY`. Backend passé "Active", `/health` répond `OK`.

**8. Storefront Vercel** : projet créé avec **Root Directory = `apps/storefront`** (Vercel gère nativement les monorepos pnpm, aucune build/start command custom nécessaire, contrairement à Railway). Premier build échoué : `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` manquante — **cette variable est vérifiée par Next.js au moment du build**, pas seulement à l'exécution.

**9. Obtention de la clé publishable** :
- Seed lancé sur staging avec la même technique que les migrations : `DATABASE_URL="<DATABASE_PUBLIC_URL>" pnpm --filter @dtc/backend seed` (crée sales channel par défaut + clé publishable + données de démo).
- Admin user créé via le skill `medusa-dev:new-user` (`medusa user -e ... -p ...`), toujours avec le même override `DATABASE_URL`.
- Connexion à l'admin staging (`/app`) → Settings → Publishable API Keys pour récupérer la clé.

**10. Storefront finalisé** : `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` et `NEXT_PUBLIC_BASE_URL` ajoutées, redeploy réussi.

**11. Validation end-to-end au navigateur** (via Claude in Chrome) : page `/fr/store` charge bien les produits depuis le backend Railway, panier fonctionnel, aucune erreur console ni CORS. Seule anomalie relevée : un prefetch RSC de `/fr/account` renvoyait un `503` isolé, mais la page se charge normalement en navigation directe — pas creusé plus loin, probablement un cold-start transitoire.

**12. Sous-domaine staging** : `staging.kim-hi-noodle.fr` configuré en CNAME dans la Zone DNS LWS vers la cible fournie par Vercel, SSL généré automatiquement. `NEXT_PUBLIC_BASE_URL` et les 3 variables CORS backend mis à jour pour inclure ce domaine.

**13. Exploration de la formule d'hébergement LWS** (en vue d'une réduction de coût après la bascule finale, PrestaShop n'étant alors plus nécessaire) :
- Formule actuelle **"Standard"** : 95,88 € HT/an, regroupe domaine + hébergement PrestaShop + emails (3 comptes actifs / 50 possibles) en un seul forfait indivisible.
- Formule **"Domaine"** (changement gratuit) : n'inclut que **2 boîtes email** — insuffisant tel quel pour les 3 comptes actuels.
- Formule **"Perso"** identifiée comme probable bon compromis (5 boîtes email, garde tout le fonctionnement mail actuel sans migration) — **son tarif exact n'a pas été vérifié**.

**14. Début d'investigation sur la reprise des données locales** pour éviter de resaisir manuellement produits/prix/taxes en staging puis en prod :
- La base Postgres locale (`medusa-khn-medusa`) contient bien les vraies données produits déjà configurées par l'utilisateur.
- Vérifié directement en base (`SELECT url FROM image ...`) : **46 images produits réelles** (nems, samoussas, soupe phnom penh, bo bun...) en plus des images de démo du seed standard Medusa.
- Ces images sont stockées sur **disque local** (`apps/backend/static/`, fournisseur de fichiers local par défaut de Medusa — aucun module S3/R2 configuré dans `medusa-config.ts`), référencées en base avec des URLs `http://localhost:9000/static/...`. Inutilisables telles quelles en staging/prod, et de toute façon Railway a un **filesystem éphémère** — un vrai stockage cloud est nécessaire indépendamment de la migration des données existantes.
- Choix fait pour le stockage cloud : **Cloudflare R2**.

**15. Emails en staging** : question soulevée en fin de session — en local, `RESEND_FROM=onboarding@resend.dev` (adresse d'essai Resend) ne permet d'envoyer **qu'à l'adresse email du compte Resend lui-même**, quel que soit le destinataire demandé. C'est une restriction du compte/domaine non vérifié sur Resend, pas un problème d'environnement — donc elle se serait reproduite à l'identique en staging sans action.

- **Domaine dédié choisi** : `mail.kim-hi-noodle.fr` (sous-domaine, plutôt que la racine `kim-hi-noodle.fr`) pour ne toucher à aucun enregistrement DNS existant (le SPF/MX de la racine sert aux boîtes mail LWS actuelles — `contact@kim-hi-noodle.fr` etc.).
- **Vérifié sur Resend** (Domains → Add Domain → `mail.kim-hi-noodle.fr`, région Ireland/eu-west-1) : 3 enregistrements ajoutés dans la Zone DNS LWS (même zone que le CNAME `staging`) :
  - `TXT resend._domainkey.mail` (clé publique DKIM)
  - `MX send.mail` → `feedback-smtp.eu-west-1.amazonses.com` (priorité 10)
  - `TXT send.mail` → `v=spf1 include:amazonses.com ~all`
  - Propagation quasi instantanée, domaine passé `Verified` côté Resend en quelques minutes.
- **Piste écartée** : utiliser le SMTP des boîtes mail LWS existantes plutôt que Resend. Techniquement possible (écrire un provider Medusa custom avec `nodemailer`), mais rejeté — deliverability nettement plus faible sur un hébergement mutualisé (réputation d'envoi partagée, pas d'infra dédiée transactionnelle), aucun gain financier (le plan gratuit Resend couvre largement le volume attendu), et ça irait à l'encontre de la convention `AGENTS.md` qui réserve un changement de provider de notification à une décision actée en ADR.
- **Variables ajoutées sur Railway staging** (`railway variables --set`) :
  - `RESEND_API_KEY` — nouvelle clé dédiée à staging (scope "Sending access", restreinte au domaine `mail.kim-hi-noodle.fr`), distincte de celle du `.env` local.
  - `RESEND_FROM=noreply@mail.kim-hi-noodle.fr`
  - `STOREFRONT_URL=https://staging.kim-hi-noodle.fr` — **absente jusque-là**, alors qu'elle n'a rien à voir avec Resend : `buildResetPasswordLink` (`apps/backend/src/lib/customer/reset-password-link.ts`) fait `new URL("/reset-password", process.env.STOREFRONT_URL)`, qui lève `Invalid URL` si la variable est absente. Premier test de reset de mot de passe a échoué à cause de ça (log `Échec envoi email de réinitialisation: Invalid URL`), *avant* même d'atteindre l'appel Resend — corrigé en ajoutant la variable, puis reset testé à nouveau avec succès (`Email de réinitialisation envoyé à ...`).
- Le changement de variables a déclenché un redeploy Railway automatique (build → deploy → `SUCCESS` en quelques minutes, suivi via `railway status --json`).

**16. Configuration du module fichier R2** :
- Bucket Cloudflare R2 `khn-images` créé (compte Cloudflare dédié au projet, première inscription — même logique de séparation de facturation que Railway), région Automatic.
- Token API dédié (`khn-medusa-staging`, "Account API Token", scope Object Read & Write restreint au seul bucket `khn-images` — pas "Apply to all buckets").
- **URL publique** : "Public Development URL" (`pub-024f0165a0d54f99940f7d64a01bc4a6.r2.dev`) activée plutôt qu'un domaine personnalisé — choix assumé pour aller vite ; un domaine perso (ex. `img.kim-hi-noodle.fr`) nécessiterait de déléguer un sous-domaine à Cloudflare (enregistrements NS chez LWS), pas fait cette session.
- `medusa-config.ts` : module `@medusajs/medusa/file` + provider `@medusajs/medusa/file-s3` (déjà inclus dans `@medusajs/medusa` 2.16.0, aucun package à ajouter), avec `additional_client_config: { forcePathStyle: true }` — **requis pour R2**, dont l'API S3 n'accepte que le style `endpoint/bucket/key`, pas le style virtual-hosted par défaut du SDK AWS.
- Variables `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_REGION=auto` / `S3_BUCKET` / `S3_ENDPOINT` / `S3_FILE_URL` ajoutées à la fois en local (`.env`) et sur Railway staging — **le module fichier est enregistré une seule fois dans le code partagé**, donc actif partout dès que les variables existent, contrairement à Resend où seul staging avait été configuré.
- Piste écartée : SMTP LWS pour les emails avait déjà été étudié et rejeté (§15) ; ici pas d'équivalent LWS pertinent, R2 est le choix retenu sans alternative sérieusement considérée à part AWS S3 lui-même (plus cher, pas de sortie gratuite).

**17. Commit + PR du changement de code** : `medusa-config.ts` et `.env.template` (nouvelles variables `S3_*`, valeurs vides) commités sur `feat/backend-r2-file-storage`, PR #105. Point important découvert en le faisant : **Railway build depuis le repo GitHub, pas depuis le poste local** — changer des variables Railway sans merger le code correspondant ne change rien tant que le commit n'est pas sur `main`.

**18. Nettoyage des modifications préexistantes** : les 4 fichiers modifiés mais jamais commités, présents dès le tout début de la session précédente (`apps/backend/package.json`, et 3 fichiers storefront), se sont révélés être **3 sujets sans rapport** une fois inspectés :
- `chore/backend-db-migrate-script` (PR #106) : script `db:migrate` dans `package.json`.
- `fix/storefront-legal-links` (PR #107) : liens `/content/privacy-policy` et `/content/terms-of-use` cassés (préfixe `/content/` inexistant sur ce projet) → corrigés en `/privacy-policy` / `/terms-of-sale` ; liens CGV/confidentialité manquants ajoutés dans le récap checkout.
- `feat/reservation-responsive-mobile` (PR #108) : ajustements mobile (grille horaires 2 colonnes, mise en page du bloc contact).
Séparés en 3 branches/commits/PRs distincts (convention du repo : une PR = un sujet), toutes mergées par l'utilisateur.

**19. Passage du repo en public + audit de sécurité** : demandé par l'utilisateur car Vercel Hobby ne supporte pas les repos privés. Audit fait **sur tout l'historique git** (`git log --all`), pas seulement l'état courant :
- Aucun fichier `.env` jamais commité (vérifié via `git log --all --full-history -- '**/.env'`, vide).
- Recherche de patterns de secrets (clés Stripe/Resend, tokens AWS-style, clés privées PEM, URLs Postgres/Mongo avec identifiants) sur tout l'historique — deux faux positifs identifiés et écartés (fragment de hash pnpm, nom de variable compilée `prepare_line_item_data_1` contenant coïncidemment `re_line_item_data_1`).
- `.gitignore` vérifié complet (racine + `apps/backend/`) pour toutes les variantes `.env`, `*.pem`, `medusa-db.sql`, PDF de factures.
- Deux trouvailles sans risque : un `tsconfig.tsbuildinfo` commité dans le tout premier commit puis retiré quelques commits après (aucun contenu sensible) ; les images du menu (`apps/backend/static/*.webp`) et les PDF d'allergènes sont bien commités mais c'est volontaire (assets déjà publics sur le site).
- **Feu vert donné**, repo passé en public par l'utilisateur.

**20. Test end-to-end du module R2 sur staging, sans identifiants admin** : script one-off (`medusa exec`, jamais commité) exécuté avec `DATABASE_URL="<DATABASE_PUBLIC_URL>"` (même technique que les migrations/seed de la session précédente) pour appeler directement `fileModuleService.createFiles()` côté serveur. Upload réussi, URL publique vérifiée en `curl` (`HTTP 200`, bon `content-type`), fichier supprimé après coup (`HTTP 404` confirmé). Ce pattern — script `medusa exec` + override `DATABASE_URL` — évite complètement d'avoir à manipuler le mot de passe admin pour ce genre de vérification.

**21. Découverte : factures privées dans un bucket public**. En creusant l'option `access: "private"` du module fichier (utilisée par `issue-invoice.ts` pour les factures) avant de migrer les images :
- Lu le code source du provider (`@medusajs/file-s3/dist/services/s3-file.js`) : `access: "private"` se traduit par `ACL: "private"` sur la commande S3 `PutObject`. **Cloudflare R2 n'implémente pas les ACL S3 par objet** — seul le toggle "Public Development URL" au niveau du bucket compte, donc cet ACL est silencieusement ignoré.
- Vérifié dans la doc officielle Medusa : **un seul file provider peut être enregistré à la fois** — impossible d'avoir "bucket public pour les images, bucket privé pour les factures" avec deux providers en parallèle sans écrire un provider custom.
- Vérifié la route de téléchargement (`apps/backend/src/api/admin/orders/[id]/invoice/download/route.ts`) : **admin-only**, sert les octets via `getAsBuffer()` côté serveur, ne renvoie jamais l'URL R2 brute dans une réponse API. Pas de route store équivalente. **Donc pas de fuite via l'app aujourd'hui** — le risque résiduel se limite à quelqu'un ayant un accès direct à la base de données.
- Décision utilisateur : continuer la migration des images maintenant, traiter la confidentialité des factures comme un sujet séparé (voir "What's next").

**22. Migration réelle des 36 images vers R2** (base **locale** uniquement, pas encore staging) :
- Correction d'un chiffre du handoff précédent : la base contient **46 lignes** dans la table `image`, mais seulement **36 sont de vraies images produits** sur disque local (`localhost:9000/static/...`) — les 10 autres sont des images de démo Medusa (T-shirts/sweatshirts, `medusa-public-images.s3...`) **encore présentes dans la base locale elle-même**, pas seulement en staging.
- Vérifié avant migration que les 36 fichiers référencés en base existaient bien tous sur disque (`comm` entre la liste DB et la liste disque, diff vide).
- Script one-off (`medusa exec`, jamais commité) : pour chacune des 36 lignes, lit le fichier dans `apps/backend/static/`, l'upload via `fileModuleService.createFiles({ ..., access: "public" })`, met à jour `image.url` en base via une requête directe sur `ContainerRegistrationKeys.PG_CONNECTION` (Knex).
- Résultat : **36/36 migrées, 0 échec**. Vérifié après coup : `SELECT count(*) FROM image WHERE url LIKE '%localhost%'` → 0 ; 3 URLs testées en `curl` → `HTTP 200` avec des tailles de fichier cohérentes (pas de fichiers vides/corrompus).
- Les fichiers `apps/backend/static/*.webp` **n'ont pas été supprimés** du disque ni du repo — laissés en l'état, décision de nettoyage pas prise.

## Ce que la session a découvert et qui ne vit dans aucun artefact

- Pour ce monorepo précis, le Root Directory Railway **doit** rester à la racine du repo (jamais `apps/backend`), sinon le lockfile pnpm partagé n'est plus accessible pendant le build — piège facile à reproduire si un nouveau service Railway est créé pour la prod sans repartir de cette même configuration.
- `npm install` sans lockfile dans `.medusa/server` est **trop lent/instable** sur l'infra Railway (timeout après ~20 min) — toujours utiliser `pnpm install --no-frozen-lockfile` à cette étape, y compris pour la config du service backend de prod.
- `railway run` injecte les variables telles que configurées dans Railway, y compris les hostnames **internes** au réseau Railway — inutilisables pour des commandes lancées depuis un poste local. Il faut activer le TCP Proxy Postgres et overrider `DATABASE_URL` en préfixe de commande à chaque fois qu'un script one-off (migration, seed, création d'admin) doit tourner depuis un poste local contre une base Railway. Cette manip sera à refaire à l'identique pour la prod.
- Le catalogue produit local est réel et exploitable pour peupler staging/prod, mais **les images doivent être migrées vers R2 avant tout transfert de données** (dump/restore de la base), sinon les URLs resteront cassées.
- Formule d'hébergement LWS "Domaine" (la moins chère) ne couvre que 2 boîtes email, insuffisant pour les 3 comptes actuellement utilisés (`contact@kim-hi-noodle.fr` etc.) — la formule "Perso" semble le bon compromis mais reste à confirmer côté tarif.
- `RESEND_FROM=onboarding@resend.dev` (adresse d'essai par défaut) restreint l'envoi à l'adresse du compte Resend, **quel que soit l'environnement** (local, staging, prod) — ce n'est débloqué qu'en vérifiant un domaine personnalisé, pas en changeant de variable d'environnement seule.
- `STOREFRONT_URL` manquante casse l'envoi d'email de reset avec une erreur (`Invalid URL`) qui n'a l'air de rien à voir avec Resend au premier coup d'œil dans les logs — à vérifier en priorité si un envoi d'email échoue silencieusement sur un nouvel environnement (prod comprise).
- **Railway build depuis le repo GitHub, jamais depuis le poste local.** Changer une variable d'environnement Railway redéploie automatiquement, mais avec le dernier commit de `main` — un changement de code local non commité/mergé n'a aucun effet tant qu'il n'a pas été push. Piège rencontré avec `medusa-config.ts` : les variables `S3_*` étaient sur Railway avant même que le code sache quoi en faire.
- **R2 (et probablement d'autres S3-compatibles hors AWS) ignorent les ACL S3 par objet.** `access: "private"` côté Medusa ne protège rien sur un bucket dont le "Public Development URL" est activé — seul le toggle bucket-level compte. À vérifier systématiquement avant de stocker quoi que ce soit de sensible via le file module tant qu'il n'y a qu'un seul provider partagé entre données publiques et privées.
- Le chiffre "46 images" du handoff précédent était le total de la table `image` (36 vraies + 10 démo Medusa), pas le nombre de vraies images — la base locale contient encore des restes de données de démo, pas seulement la base staging.
- Pattern réutilisable : un script one-off (`medusa exec ./src/scripts/x.ts`, jamais commité) + override `DATABASE_URL="<DATABASE_PUBLIC_URL>"` permet d'exécuter n'importe quelle opération serveur (upload R2, requête SQL directe via `ContainerRegistrationKeys.PG_CONNECTION`) contre staging depuis le poste local, **sans jamais avoir besoin des identifiants admin**.

## Problèmes identifiés, non résolus

- **Factures privées dans un bucket public R2** (voir §21) : pas de fuite via l'app actuellement (route admin-only, URL jamais renvoyée au client), mais l'ACL "private" demandée par le code est silencieusement ignorée par R2. Risque résiduel : quiconque a accès direct à la base de données peut récupérer l'URL R2 brute d'une facture et la consulter sans authentification Medusa. À régler proprement avant la prod — pistes possibles : bucket R2 séparé sans accès public pour les fichiers privés + provider fichier custom (sur le modèle de `resend-notification`) qui route vers l'un ou l'autre bucket selon `access` ; ou concevoir soi-même les URLs presignées (`getPresignedDownloadUrl`, déjà supporté par le provider S3) au lieu de compter sur l'ACL.
- **Fichiers orphelins sur disque** (`apps/backend/static/`) : au moins 4 fichiers ne sont référencés par aucune ligne `image` en base (doublons d'anciens uploads remplacés) — `1781731639343-samoussas.jpg`, `1784583480186-banh_sung.webp`, `1784584438369-biere_asahi.webp`, `1785166831782-poulet_sucre_aigre_douce.webp`. Pas migrés vers R2 (normal, rien ne les référence), mais toujours présents sur disque et dans git — à nettoyer ou ignorer sciemment.
- **Données de démo Medusa encore dans la base locale** (10 images T-shirt/sweatshirt, probablement des lignes `product`/`product_variant` associées) — à décider si elles doivent être nettoyées avant le `pg_dump` vers staging (point 3 ci-dessous), pour ne pas polluer le vrai catalogue en prod.
- **`apps/backend/static/*.webp` pas supprimés** — les 36 fichiers réels restent sur disque et dans git alors qu'ils sont maintenant dupliqués sur R2. Pas bloquant, mais à trancher (les garder en historique git vs. les supprimer maintenant que R2 est la source de vérité).

## What's next

1. ~~Configurer le module de fichiers Medusa avec Cloudflare R2~~ — **fait** (§16-17, PR #105 mergée, actif sur staging et local).
2. ~~Uploader les images vers R2 et mettre à jour la base locale~~ — **fait** (§22, 36/36, base locale seulement).
3. **Transférer les données vers staging** : `pg_dump` de la base locale (`medusa-khn-medusa`, maintenant avec les bonnes URLs R2) puis `pg_restore --clean --if-exists --no-owner --no-privileges` vers la base staging via `DATABASE_PUBLIC_URL` (TCP Proxy déjà activé sur le Postgres staging). Vérifier après coup si l'admin user créé lors de la session précédente a survécu au restore ou doit être recréé. Décider avant si on nettoie les restes de démo Medusa en local (voir "Problèmes identifiés").
4. **Dupliquer l'environnement pour la prod** : nouveaux services Railway (Postgres/Redis/backend, même config Build/Start Command que staging), nouveau projet Vercel, vraies clés Stripe **live** (pas les clés de test réutilisées en staging), nouveaux secrets `JWT_SECRET`/`COOKIE_SECRET` distincts du staging. Pour les emails : le domaine Resend `mail.kim-hi-noodle.fr` est déjà vérifié et réutilisable tel quel ; prévoir une nouvelle clé `RESEND_API_KEY` dédiée prod et ne pas oublier `STOREFRONT_URL`. Pour R2 : le bucket `khn-images` peut être réutilisé tel quel (mêmes identifiants ou une nouvelle clé API dédiée prod, au choix).
5. **Bascule DNS finale** : pointer `kim-hi-noodle.fr` (le domaine racine, pas seulement le sous-domaine staging) vers la prod Railway/Vercel, puis arrêter l'hébergement PrestaShop chez LWS.
6. **Après la bascule**, redescendre la formule d'hébergement LWS — probablement vers "Perso" pour garder les emails sans l'hébergement web devenu inutile. Vérifier le tarif exact avant de trancher entre "Domaine" (migrer les emails ailleurs) et "Perso" (tout garder tel quel).
7. **Avant la prod** : régler la confidentialité des factures (voir "Problèmes identifiés") — ne pas dupliquer l'environnement de prod avec le même problème que staging.

## Suggested skills

- `medusa-dev:building-with-medusa` — pour la config du module de fichiers S3/R2 dans `medusa-config.ts`.
- `medusa-dev:new-user` — déjà utilisé cette session pour créer l'admin staging, à réutiliser à l'identique pour la prod.

## Note sécurité

Informations sensibles (mot de passe admin, clés Stripe, clé API Resend, clé API R2, secrets JWT/COOKIE, URLs de connexion Postgres avec identifiants) **volontairement omises** de ce document car `docs/handoffs/` est versionné dans git — elles restent uniquement dans les variables d'environnement Railway/Vercel et le `.env` local. Le repo est maintenant **public** (§19) : cette règle compte double, tout secret qui atterrirait ici serait visible de tous.
