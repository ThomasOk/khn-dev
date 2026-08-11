# Checklist — bascule de kim-hi-noodle.fr, PrestaShop → Medusa/Next.js

*Créé le 2026-08-11. Document vivant : cocher au fil de l'eau, pas figé.*

État au moment de la création : **l'environnement de prod n'existe pas encore sur Railway/Vercel** — seul staging (`staging.kim-hi-noodle.fr`) est en ligne. Rien dans ce document n'est activable avant que la prod soit créée.

## 1. Blocants durs (ouverture des ventes impossible sans ça)

- [ ] **Médiateur de la consommation** — souscription réelle nécessaire avant d'ouvrir les ventes à des consommateurs en France. Décision explicite de ne pas en inventer un ; sections légales déjà préparées et commentées, prêtes à décommenter une fois souscrit (mentions légales + CGV Article 13).

## 2. Sécurité des données / conformité

- [ ] **Factures privées dans le bucket R2 public** — pas de fuite active aujourd'hui (clés ULID non devinables, pas de listing public), mais à corriger avant accumulation de vraies données clients en prod. Solution retenue en discussion : un provider fichier custom (pattern `resend-notification`) routant vers deux buckets R2 selon `file.access`, encodage public/privé dans la clé (`@medusajs/file` ne transmet que le `fileKey` aux lectures/suppressions, jamais l'`access` d'origine). Rien implémenté à ce jour.
- [ ] **Registre des traitements (RGPD art. 30)** — contenu factuel déjà présent dans la politique de confidentialité (PR #114), reste à découper par traitement (comptes / commandes / facturation / réservations / paiement) + case mesures de sécurité (art. 32) par traitement. Question ouverte : où le stocker (repo GitHub maintenant public).

## 3. Infrastructure & DNS

- [ ] Créer l'environnement de prod sur **Railway** (backend) et **Vercel** (storefront) — préalable à tout le reste de cette section.
- [ ] Dupliquer les variables d'environnement de staging vers prod (Resend, S3/R2, Stripe — *en mode live, voir section 4*, `STOREFRONT_URL`, etc.). Piège déjà rencontré une fois en staging : `STOREFRONT_URL` absente fait planter `buildResetPasswordLink` avec `Invalid URL`, silencieusement avant même l'appel à Resend — à ne pas oublier une seconde fois.
- [ ] **`NEXT_PUBLIC_ALLOW_INDEXING=true`** sur l'environnement Vercel de prod uniquement (le défaut fail-safe couvre déjà staging). Rappel : les variables `NEXT_PUBLIC_*` sont figées au build — un changement de valeur seul ne suffit pas, il faut un redeploy.
- [ ] **Checklist DNS précise, pas une bascule "en bloc"** — dans la zone LWS, seul l'enregistrement du **frontend web** (A/CNAME racine + `www`) doit changer pour pointer vers Vercel. Ne pas toucher :
  - Au MX/SPF de la racine (boîtes mail LWS actuelles, `contact@kim-hi-noodle.fr` etc.)
  - Aux enregistrements Resend sur `mail.kim-hi-noodle.fr` (DKIM/MX/SPF du sous-domaine dédié, déjà vérifiés côté Resend)
- [ ] **Corriger la canonicalisation `www`/`http`** au niveau Vercel (ajouter `www.kim-hi-noodle.fr` comme domaine avec redirection vers l'apex + HTTPS forcé). ~101k impressions/16 mois actuellement parquées sur les variantes non canoniques (`http://www.`, `https://www.`) — à ne pas perdre à la bascule.
- [ ] **Abaisser le TTL** des enregistrements DNS concernés quelques jours avant la bascule, pour pouvoir revenir en arrière en minutes plutôt qu'en heures en cas de problème.
- [ ] **Garder l'hébergement PrestaShop actif quelques jours après la bascule** (filet de sécurité) avant de résilier — ne pas enchaîner bascule DNS → résiliation immédiate.
- [ ] Redescendre la formule LWS (actuellement "Standard", 95,88 €HT/an, domaine + hébergement PrestaShop + emails) — seulement une fois l'hébergement PrestaShop plus nécessaire.

## 4. Paiement (Stripe)

- [ ] **Basculer `STRIPE_API_KEY` sur la clé secrète live** en prod — ne pas copier-coller la config staging (qui est en mode test). Rien dans le code ne distingue test/live, ça dépend entièrement de la valeur de la variable d'env.
- [ ] **Enregistrer l'endpoint webhook Stripe en mode live**, pointant vers l'URL Railway de prod — le webhook configuré côté staging ne se propage pas automatiquement.
- [ ] Vérifier qu'un secret de vérification de signature webhook est bien configuré (rien de visible dans `medusa-config.ts` au-delà de `STRIPE_API_KEY` — à confirmer avant l'ouverture, sinon un événement de paiement peut être forgé par n'importe qui).
- [ ] **Tester un vrai paiement en mode live** (petit montant) juste après la bascule, avant toute communication publique d'ouverture.

## 5. SEO — déjà fait, à vérifier une dernière fois

- [x] `robots.txt` + `sitemap.xml` + `noindex` conditionnel (PR #115).
- [x] 44 redirections 301 (308) depuis les anciennes URLs PrestaShop (PR #116) — voir `docs/research/2026-08-11-prestashop-redirects.md` pour l'inventaire complet et les résultats de test.
- [ ] **L'inventaire des redirections est une photo du 11/08/2026** — si beaucoup de temps s'écoule avant la bascule réelle et que le catalogue PrestaShop change (plats ajoutés/retirés), refaire un passage rapide juste avant de couper.
- [ ] Mettre à jour le **Google Business Profile** (généralement la plus grosse source de clics locaux pour un restaurant) et les fiches d'annuaires externes (TripAdvisor, TheFork...) si elles pointent vers l'ancien domaine — hors de portée du code, à faire manuellement.
- [ ] Resoumettre `sitemap.xml` du nouveau site dans Google Search Console juste après la bascule, pour accélérer la réindexation.
- [ ] Vérifier `/marques`, `/1_fashion-manufacturer`, `/fournisseur`, `/1__fashion-supplier`, `/2__midi` dans l'admin PrestaShop avant de couper l'ancien site — tout indique du contenu de démo du thème jamais personnalisé, mais pas confirmé en ouvrant l'admin. Sans conséquence si confirmé (déjà couvert par la redirection générique vers l'accueil).

## 6. Données / catalogue

- [ ] **Menu et prix figés** — s'assurer que le catalogue sur staging correspond exactement à ce qui est affiché aujourd'hui sur PrestaShop au moment de basculer (pas de placeholder, pas de prix de test).
- [ ] **Ne pas lancer `pnpm seed` sur la vraie base de prod** (`apps/backend/src/scripts/seed.ts` contient encore les données de démo du starter Medusa — t-shirts, sweatshirts... jamais nettoyées). Vérifier explicitement que ça n'a pas été fait par réflexe lors de la config initiale de la prod.

## 7. Tests

- [ ] **Commande complète de bout en bout sur staging** — créneau valide, Stripe test accepté jusqu'à la confirmation. Jamais vérifié à ce jour (les tentatives précédentes ont buté sur un créneau expiré).
- [ ] Revérifier `/page-introuvable` (et plus largement une 404 quelconque) contre l'environnement de prod une fois en place — déjà confirmé correct contre staging (`307` middleware → vraie `404`).

## 8. Observabilité

- [ ] **Aucun monitoring/alerting d'erreurs configuré** (pas de Sentry ni équivalent dans `package.json` backend ou storefront). Si le site casse en prod après la bascule, personne n'est notifié automatiquement — à évaluer si ça vaut le coup avant l'ouverture ou si une surveillance manuelle suffit au démarrage.

## 9. Dette technique mineure (sans impact bloquant, à garder en tête)

- [ ] **Cache catalogue** : les changements de prix/menu faits dans l'admin Medusa ne sont pas poussés instantanément au storefront — `apps/storefront/src/lib/data/products.ts` utilise `revalidate: 60` (fetch time-based), donc jusqu'à 60 secondes de délai. `revalidateTag` est bien câblé pour tout ce que déclenche le client (panier, compte, commande — `cart.ts`, `customer.ts`, `orders.ts`), juste pas pour les changements faits côté admin. Probablement suffisant (60s), mais volontairement noté comme "délai accepté" plutôt que "invalidation instantanée".
- [x] **`eslint`/`tsc` désactivés au build** — **corrigé le 2026-08-11.** Les deux flags (`eslint.ignoreDuringBuilds`, `typescript.ignoreBuildErrors`) sont retirés de `next.config.js`. Avant de les retirer, ~20 erreurs de lint réelles traînaient sous le radar depuis le starter Medusa (apostrophes JSX non échappées, imports/paramètres inutilisés, `any` implicites, deux `@ts-ignore` qui ne suppriment plus rien) — toutes corrigées. `tsc --noEmit` propre, `next lint` propre (seuls 4 warnings `react-hooks/exhaustive-deps`/`no-unused-expressions` restants, qui ne bloquent pas le build). Vérifié avec un vrai `next build` : passe l'étape "Linting and checking validity of types" sans erreur — échoue plus loin, mais uniquement faute de backend Medusa disponible en local (`ECONNREFUSED` à la génération des pages statiques), sans rapport avec ce correctif. Reste à confirmer un build 100% vert contre un environnement avec backend (staging ou prod).
- [ ] **`/products` et `/collections` orphelins** — routes existantes (`src/app/[countryCode]/(main)/products|collections/[handle]`) mais non reliées depuis le parcours réel (tout passe par `/store`). Décider : garder, supprimer, ou rediriger vers `/store`.
- [ ] Fichiers orphelins sur disque (`apps/backend/static/`).

## Sources

- `docs/handoffs/2026-08-05-medusa-staging-live-to-images-and-prod.md`
- `docs/handoffs/2026-08-07-checkout-fixes-and-shipping-profile-gap.md`
- `docs/handoffs/2026-08-09-prelaunch-audit-to-branding-and-legal-pages.md`
- `docs/handoffs/2026-08-10-prelaunch-legal-followups-to-robots-sitemap-noindex.md`
- `docs/research/2026-08-11-prestashop-redirects.md`
