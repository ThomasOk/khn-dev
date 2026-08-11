# Redirections 301 PrestaShop → nouveau storefront

*2026-08-11*

Référencé depuis `apps/storefront/next.config.js` (`redirects()`). Ce document trace l'inventaire des URLs et le raisonnement derrière chaque redirection ; le code est la source de vérité sur ce qui est effectivement en place.

## Contexte

`kim-hi-noodle.fr` (domaine chez LWS) tourne aujourd'hui sur PrestaShop et sera basculé vers le storefront Medusa/Next.js (Vercel) à la bascule DNS finale — pas encore faite à ce jour (prod pas encore créée sur Railway/Vercel, cf. handoffs 2026-08-05 et suivants). Sans redirections 301, chaque ancienne URL indexée par Google deviendrait une page morte au lieu d'être reconnue comme "déplacée vers" — perte du référencement accumulé.

## Méthode

1. Module PrestaShop **`gsitemap`** (Google Sitemaps) installé et généré côté admin par l'utilisateur → `https://kim-hi-noodle.fr/1_index_sitemap.xml` + `1_fr_0_sitemap.xml` (97 URLs).
2. **Angle mort constaté** : `gsitemap` n'inclut pas les pages CMS (`/content/…`) — absentes du sitemap généré malgré leur présence réelle sur le site. Retrouvées en repassant par la page interne `/plan-site`, qui liste 6 pages CMS dont les mentions légales.
3. Vérifié dans le code du nouveau storefront (`src/modules/store/components/carte-section/index.tsx`) que seules les **sections de catégorie** ont un ancrage HTML (`id={category.handle}`) sur la page `/store` — aucune fiche produit individuelle n'a d'ancre. Confirmé en direct sur staging que les handles de catégorie sont : `entrées`, `plats`, `soupes`, `desserts`, `formules`, `boissons`.
4. Domaine ayant une seule locale (`NEXT_PUBLIC_DEFAULT_REGION=fr`, `.env.local`), les destinations pointent directement vers `/fr/...` plutôt que de compter sur la redirection de `middleware.ts` pour préfixer la locale après coup.

## Décision de portée (validée avec l'utilisateur, 2026-08-11)

Redirection individuelle uniquement pour ce qui a une vraie valeur SEO : catégories du menu, fiches produit (en bloc, faute de grain plus fin possible), pages CMS/légales, page contact. Le reste — pages compte/panier/commande, endpoints internes de paiement, pages de démo du thème jamais personnalisées — tombe dans un fallback générique vers la page d'accueil plutôt qu'un mapping un par un (~97 lignes pour un gain SEO quasi nul sur la longue traîne).

## Inventaire complet (97 URLs du sitemap + 6 CMS retrouvées via `/plan-site`)

| Groupe | URLs PrestaShop | Cible | Raison |
|---|---|---|---|
| Accueil | `/` | *(pas de redirection — identité)* | — |
| Catégories carte | `/13-entrees`, `/14-plats`, `/15-desserts`, `/16-formules`, `/17-boissons` | `/fr/store#{handle}` | Ancre de catégorie confirmée en direct sur staging |
| Carte (racine) | `/12-notre-carte` | `/fr/store` | — |
| Suggestions | `/22-nos-suggestions` | `/fr/store` | Pas de catégorie "suggestions" côté nouveau site |
| Fiches produit | `/accueil/{id}-{slug}.html` (41), `/entrees/9-nems.html` (1) | `/fr/store` (règle regex sur `/accueil/:slug` et `/entrees/:slug`) | Aucune ancre par produit sur le nouveau site — granularité impossible |
| CMS légal | `/content/2-mentions-legales`, `/content/3-conditions-generales-de-vente`, `/content/6-politique-de-confidentialite` | `/fr/legal-notice`, `/fr/terms-of-sale`, `/fr/privacy-policy` | Équivalent direct |
| CMS "à propos" | `/content/4-a-propos` | `/fr/about` | Équivalent direct |
| CMS sans équivalent | `/content/1-livraison`, `/content/5-paiement-securise` | `/fr` | Click & collect only, pas de livraison — contenu obsolète, pas d'équivalent honnête |
| Contact | `/nous-contacter` | `/fr/contact` | Équivalent direct |
| Magasins | `/magasins` | `/fr/contact` | Un seul restaurant, pas de store locator côté nouveau site |
| Longue traîne (fallback) | `connexion`, `connexion?create_account=1`, `mon-compte`, `panier`, `adresse`, `adresses`, `identite`, `historique-commandes`, `commande`, `confirmation-commande`, `suivi-commande`, `suivi-commande-invite`, `avoirs`, `recuperation-mot-de-passe`, `marques`, `fournisseur`, `1_fashion-manufacturer`, `1__fashion-supplier`, `2__midi`, `meilleures-ventes`, `nouveaux-produits`, `promotions`, `recherche`, `plan-site`, `reduction` | `/fr` | Pages compte/panier/commande sans contenu indexable + reliquats de démo du thème (`fashion-manufacturer`, `midi` — jamais du vrai contenu du restaurant, jamais personnalisés) — pas de mapping individuel par choix de portée |
| Endpoints internes | `/index.php?controller=...` (23 variantes : paiement, AJAX, wishlist, blog...) | `/fr` (une seule règle sur le pathname `/index.php`, la query string est ignorée) | Jamais indexés avec un contenu réel |
| Page 404 PrestaShop | `/page-introuvable` | *(pas de redirection)* | C'est leur propre page d'erreur — laisser 404 nativement côté nouveau site |

## Complément via Google Search Console (2026-08-11)

Exports demandés à l'utilisateur : **Performance → Résultats de recherche → onglet Pages** (16 derniers mois, export CSV) et **Indexation → Pages** (export CSV). Recoupés avec l'inventaire ci-dessus.

- **`/19-plateau-lunch`** : absente de l'export `gsitemap` (catégorie désactivée côté PrestaShop) mais toujours indexée, 3 clics / 7788 impressions sur 16 mois. Ajoutée → `/fr/store` (pas de catégorie "plateau" équivalente sur le nouveau menu, même traitement que `/22-nos-suggestions`).
- **`/img/cms/carte-khn.pdf`** : asset statique (PDF de la carte), absent de tout inventaire précédent (ni sitemap, ni `/plan-site`), 9 clics / 3250 impressions. Ajoutée → `/fr/store` (pas de PDF téléchargeable sur le nouveau site, la carte est la page interactive).
- Le reste du rapport Performance confirme l'inventaire existant : toutes les fiches produit avec du trafic (y compris des variantes de slug avec un ID supplémentaire, ex. `/accueil/22-3910-nouilles-sautees-.html`) matchent bien la règle regex `/accueil/:slug` — un seul segment de chemin, peu importe son contenu interne. Les pages utilitaires (`/connexion`, `/recuperation-mot-de-passe`) n'ont qu'un trafic résiduel (1-2 clics), ce qui valide le choix de portée "fallback générique" pour elles.
- Le rapport **Indexation → Pages** exporté par l'utilisateur ne contient que des **compteurs agrégés par raison** (8× Introuvable/404, 4× Page avec redirection, 3× Exclue par noindex, 3× Autre page avec balise canonique correcte, 20× Explorée actuellement non indexée), pas la liste d'URLs sous-jacente — il faudrait cliquer sur chaque ligne dans l'UI GSC pour l'obtenir. Pas fait : le fallback générique couvre déjà cette longue traîne, et les URLs déjà en 404/non-indexées aux yeux de Google n'ont plus de valeur SEO à préserver.

## ⚠️ Trouvé en marge du sujet redirections — canonicalisation `www`/`http` (action DNS/Vercel, pas next.config.js)

Le rapport Performance montre le trafic de la page d'accueil éclaté sur **3 variantes d'URL non canonicalisées**, indexées séparément par Google :

| URL | Clics (16 mois) | Impressions |
|---|---|---|
| `http://www.kim-hi-noodle.fr/` | 3619 | 98 369 |
| `https://kim-hi-noodle.fr/` | 1616 | 52 165 |
| `https://www.kim-hi-noodle.fr/` | 64 | 3 128 |

La variante `www` (même en `http://`, pas HTTPS) porte **plus de trafic que la version canonique apex HTTPS**. Ce n'est pas quelque chose que `next.config.js` peut corriger (le sous-domaine `www` doit atteindre l'app pour qu'une redirection applicative s'applique) — à traiter à la bascule DNS finale en ajoutant `www.kim-hi-noodle.fr` comme domaine Vercel avec redirection vers l'apex + HTTPS forcé. **À ne pas oublier dans la checklist de bascule** : sans ça, environ 101k impressions/16 mois cumulées sur les variantes `www` repartent de zéro.

## Vérification en direct (2026-08-11)

Testé contre un serveur `next dev` local (storefront seul, sans backend Medusa derrière) : `curl -D -` sur un échantillon des 44 règles (une par groupe, y compris les cas limites — ancre accentuée, regex produit avec ID supplémentaire dans le slug, CMS, fallback générique, endpoint `index.php` avec query string).

- **43/44 conformes** : 308 + `Location` correct, y compris `#entr%C3%A9es` bien encodé.
- **`/index.php?controller=...`** : la query string d'origine est recollée à la destination par Next.js (`/fr?controller=paypal-payment` au lieu de `/fr` propre). Sans impact réel (page jamais indexée avec une vraie valeur), laissé tel quel.
- **`/page-introuvable`** (volontairement sans règle) : en local (sans backend), a levé une 500 — uniquement parce que `middleware.ts` (`getRegionMap`) tente d'appeler le backend Medusa pour résoudre le pays et qu'aucun backend ne tournait dans ce test minimal. Confirme au passage qu'aucun des 43 autres chemins n'atteint le middleware (les redirections s'exécutent avant, indépendamment du backend). **Revérifié contre `staging.kim-hi-noodle.fr` (backend réel derrière)** : `307` middleware vers `/fr/page-introuvable` puis vraie **404** (`x-next-error-status: 404`, `x-matched-path: /404`) — comportement natif attendu, confirmé, aucune règle nécessaire.

## Points ouverts / à vérifier plus tard

- **`/marques`, `/1_fashion-manufacturer`, `/fournisseur`, `/1__fashion-supplier`, `/2__midi`** : tout indique du contenu de démo du thème PrestaShop jamais nettoyé ("fashion-manufacturer"/"midi" n'a aucun sens pour un restaurant), mais pas vérifié en ouvrant l'admin PrestaShop — à confirmer si un doute survient avant la bascule.
- Les redirections Next.js (`permanent: true`) émettent un statut **308**, pas 301 au sens strict — fonctionnellement équivalent pour le SEO (Google traite 308 comme 301), à ne pas confondre si quelqu'un vérifie le code HTTP en DevTools et s'attend à voir `301`.
