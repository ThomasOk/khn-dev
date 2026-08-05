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
- **Envoi d'email fonctionnel en staging, validé de bout en bout** (reset de mot de passe testé avec succès vers une adresse externe) : domaine `mail.kim-hi-noodle.fr` vérifié sur Resend, variables `RESEND_API_KEY`/`RESEND_FROM`/`STOREFRONT_URL` configurées sur le service Railway staging. Détail dans la nouvelle section ci-dessous.

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

## Ce que la session a découvert et qui ne vit dans aucun artefact

- Pour ce monorepo précis, le Root Directory Railway **doit** rester à la racine du repo (jamais `apps/backend`), sinon le lockfile pnpm partagé n'est plus accessible pendant le build — piège facile à reproduire si un nouveau service Railway est créé pour la prod sans repartir de cette même configuration.
- `npm install` sans lockfile dans `.medusa/server` est **trop lent/instable** sur l'infra Railway (timeout après ~20 min) — toujours utiliser `pnpm install --no-frozen-lockfile` à cette étape, y compris pour la config du service backend de prod.
- `railway run` injecte les variables telles que configurées dans Railway, y compris les hostnames **internes** au réseau Railway — inutilisables pour des commandes lancées depuis un poste local. Il faut activer le TCP Proxy Postgres et overrider `DATABASE_URL` en préfixe de commande à chaque fois qu'un script one-off (migration, seed, création d'admin) doit tourner depuis un poste local contre une base Railway. Cette manip sera à refaire à l'identique pour la prod.
- Le catalogue produit local est réel et exploitable pour peupler staging/prod, mais **les images doivent être migrées vers R2 avant tout transfert de données** (dump/restore de la base), sinon les URLs resteront cassées.
- Formule d'hébergement LWS "Domaine" (la moins chère) ne couvre que 2 boîtes email, insuffisant pour les 3 comptes actuellement utilisés (`contact@kim-hi-noodle.fr` etc.) — la formule "Perso" semble le bon compromis mais reste à confirmer côté tarif.
- `RESEND_FROM=onboarding@resend.dev` (adresse d'essai par défaut) restreint l'envoi à l'adresse du compte Resend, **quel que soit l'environnement** (local, staging, prod) — ce n'est débloqué qu'en vérifiant un domaine personnalisé, pas en changeant de variable d'environnement seule.
- `STOREFRONT_URL` manquante casse l'envoi d'email de reset avec une erreur (`Invalid URL`) qui n'a l'air de rien à voir avec Resend au premier coup d'œil dans les logs — à vérifier en priorité si un envoi d'email échoue silencieusement sur un nouvel environnement (prod comprise).

## What's next

1. **Configurer le module de fichiers Medusa avec Cloudflare R2** (créer le bucket + credentials côté Cloudflare, puis déclarer le module S3-compatible dans `medusa-config.ts`) — à répercuter sur staging et prod.
2. **Uploader les 46 fichiers de `apps/backend/static/` vers ce bucket R2**, puis mettre à jour les URLs correspondantes dans la table `image` de la base locale (remplacer `http://localhost:9000/static/...` par l'URL R2).
3. **Transférer les données vers staging** : `pg_dump` de la base locale (`medusa-khn-medusa`) puis `pg_restore --clean --if-exists --no-owner --no-privileges` vers la base staging via `DATABASE_PUBLIC_URL` (TCP Proxy déjà activé sur le Postgres staging). Vérifier après coup si l'admin user créé cette session a survécu au restore ou doit être recréé.
4. **Dupliquer l'environnement pour la prod** : nouveaux services Railway (Postgres/Redis/backend, même config Build/Start Command que staging), nouveau projet Vercel, vraies clés Stripe **live** (pas les clés de test réutilisées en staging), nouveaux secrets `JWT_SECRET`/`COOKIE_SECRET` distincts du staging. Pour les emails : le domaine Resend `mail.kim-hi-noodle.fr` est déjà vérifié et réutilisable tel quel (pas de nouvelle vérification DNS nécessaire) ; prévoir une nouvelle clé `RESEND_API_KEY` dédiée prod (isolation par environnement, même logique qu'entre local et staging) et surtout ne pas oublier `STOREFRONT_URL` (piège rencontré cette session).
5. **Bascule DNS finale** : pointer `kim-hi-noodle.fr` (le domaine racine, pas seulement le sous-domaine staging) vers la prod Railway/Vercel, puis arrêter l'hébergement PrestaShop chez LWS.
6. **Après la bascule**, redescendre la formule d'hébergement LWS — probablement vers "Perso" pour garder les emails sans l'hébergement web devenu inutile. Vérifier le tarif exact avant de trancher entre "Domaine" (migrer les emails ailleurs) et "Perso" (tout garder tel quel).

## Suggested skills

- `medusa-dev:building-with-medusa` — pour la config du module de fichiers S3/R2 dans `medusa-config.ts`.
- `medusa-dev:new-user` — déjà utilisé cette session pour créer l'admin staging, à réutiliser à l'identique pour la prod.

## Note sécurité

Informations sensibles (mot de passe admin, clés Stripe, clé API Resend, secrets JWT/COOKIE, URLs de connexion Postgres avec identifiants) **volontairement omises** de ce document car `docs/handoffs/` est versionné dans git — elles restent uniquement dans les variables d'environnement Railway/Vercel et le `.env` local.
