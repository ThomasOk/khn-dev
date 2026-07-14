# Homepage — Sections après le Hero

**Date :** 28 juin 2026  
**Statut :** Planifié — implémentation non démarrée  
**Fichier plan :** `/Users/thomas/.claude/plans/je-viens-juste-de-expressive-horizon.md`

---

## Contexte

Le hero de la page d'accueil a été retravaillé lors d'une session précédente. Il s'agit maintenant de construire les sections suivantes pour compléter la homepage du restaurant Kim-Hi Noodle (site vitrine + click & collect sur Medusa / Next.js 15).

---

## Décisions prises

| Sujet | Décision |
|---|---|
| Font display (h2) | **Playfair Display** via `next/font/google` |
| Font body | Inter (inchangé) |
| Couleur accent | `orange-600` (#D97706) — déjà utilisé dans la store page |
| Couleur background alternée | `#FAF7F0` (cream custom, clé `khn.cream` dans Tailwind) |
| Sections dark | `bg-stone-900` — hero + plat du moment + footer |
| Animations | **Intersection Observer natif + classes CSS** (pas de framer-motion) |
| Image "Notre Histoire" | Photo à déposer en `/public/images/restaurant_story.png` |
| Données "Plat du moment" | Dynamique via collection Medusa handle `plat-du-moment` (graceful si absente) |
| Données "Populaires" | Collection Medusa handle `nos-incontournables` (fallback : 4 premiers produits) |
| Hover effects | Toujours via `[@media(hover:hover)]:hover:` (jamais `hover:` seul) |
| Tap targets | Minimum `min-h-[44px]` sur tous les CTA |

---

## Rythme visuel de la page

```
Hero            → image plein écran, overlay noir, texte blanc
Notre Histoire  → fond cream chaud (#FAF7F0)
Plat du Moment  → fond sombre (stone-900)
Populaires      → fond blanc
Réservation     → fond cream chaud (#FAF7F0)
Footer          → fond sombre (stone-900)
```

---

## Ce qu'il reste à faire

Le travail est découpé en **4 parties** pour faciliter la reprise session par session.

---

### Partie 1 — Foundation (prérequis techniques)

**Durée estimée :** courte (3 fichiers)

- [ ] `apps/storefront/tailwind.config.js`  
  Ajouter `fontFamily.display` + `colors.khn.cream` + `colors.khn.cream-hover`

- [ ] `apps/storefront/src/app/layout.tsx`  
  Charger Playfair Display via `next/font/google`, ajouter les CSS variables `--font-display` et `--font-sans`, corriger `lang="fr"`

- [ ] `apps/storefront/src/styles/globals.css`  
  Ajouter les classes `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-visible` avec `@media (prefers-reduced-motion: reduce)`

**Vérification :** Un `<h2 className="font-display">` doit s'afficher en Playfair Display dans le navigateur.

---

### Partie 2 — Infrastructure animations + sections statiques

**Durée estimée :** moyenne (4 fichiers)

- [ ] `src/modules/common/hooks/use-scroll-reveal.ts`  
  Hook client : Intersection Observer one-way, states `init → hidden → visible`

- [ ] `src/modules/common/components/reveal-wrapper/index.tsx`  
  Composant client léger qui wrap le contenu et applique les classes reveal

- [ ] `src/modules/home/components/story-section/index.tsx`  
  Section "Notre Histoire" — server component, layout 2 colonnes, image `/images/restaurant_story.png`  
  ⚠️ Déposer d'abord l'image dans `apps/storefront/public/images/`

- [ ] `src/modules/home/components/reservation-section/index.tsx`  
  Section "Réserver une Table" — server component, texte centré, 2 CTA (`tel:` + lien réservation)  
  ⚠️ Remplacer les placeholders : adresse, téléphone, horaires, lien réservation

**Vérification :** Les 2 sections s'affichent correctement et les animations scroll se déclenchent au bon moment.

---

### Partie 3 — Sections dynamiques (données Medusa)

**Durée estimée :** moyenne (2 fichiers + config Medusa)

- [ ] `src/modules/home/components/dish-of-moment/index.tsx`  
  Fetch collection `plat-du-moment` → premier produit → affichage éditorial fond sombre  
  Retourne `null` si la collection n'existe pas

- [ ] `src/modules/home/components/popular-products/index.tsx`  
  Fetch collection `nos-incontournables` → fallback 4 premiers produits  
  Scroll horizontal snap sur mobile, grid 4 colonnes desktop  
  Réutilise le composant `<ProductPreview>` existant

- [ ] **Dans le back-office Medusa** (hors code) :  
  Créer la collection `plat-du-moment` (handle exact) et y assigner 1 produit  
  Créer la collection `nos-incontournables` (handle exact) et y assigner 4 produits

**Vérification :** Sans les collections Medusa → sections absentes, page propre. Avec → sections affichées avec les données réelles.

---

### Partie 4 — Footer + assemblage final

**Durée estimée :** moyenne (2 fichiers)

- [ ] `src/modules/layout/templates/footer/index.tsx`  
  Remplacement complet du footer Medusa générique :  
  - Logo `khn_logo.png` avec `className="brightness-0 invert"` (blanc sur fond sombre)  
  - 3 colonnes : Navigation | Infos restaurant | Réseaux sociaux  
  - Supprimer `MedusaCTA` et tous les liens Medusa/GitHub  
  ⚠️ Vérifier que `khn_logo.png` a un fond transparent (sinon créer `khn_logo_white.png`)

- [ ] `src/app/[countryCode]/(main)/page.tsx`  
  Assemblage de toutes les sections dans l'ordre :
  ```tsx
  <Hero />
  <StorySection />
  <DishOfMoment region={region} />
  <PopularProducts region={region} />
  <ReservationSection />
  ```
  Supprimer `FeaturedProducts` et `listCollections` (remplacés par les nouvelles sections)

**Vérification finale complète :**
- `pnpm --filter storefront build` — 0 erreur TypeScript
- Lighthouse → CLS = 0
- macOS "Réduire le mouvement" activé → pas d'animations de translation
- DevTools touch → hover effects désactivés
- Tous les CTA ≥ 44px de hauteur

---

## Placeholders à remplacer (avant mise en production)

| Section | Placeholder | À remplacer par |
|---|---|---|
| Notre Histoire | texte Lorem-style | Vrai texte histoire du restaurant |
| Notre Histoire | `/images/restaurant_story.png` | Photo cuisine / équipe / salle |
| Réservation | `12 Rue des Noodles, 75011 Paris` | Vraie adresse |
| Réservation | `+33 1 23 45 67 89` | Vrai numéro |
| Réservation | horaires fictifs | Vrais horaires |
| Réservation | `https://reservation.placeholder.fr` | Vrai lien (TheFork, etc.) |
| Footer | `contact@kimhinoodle.fr` | Vrai email |
| Footer | liens Instagram / Facebook | Vrais comptes |

---

## Architecture technique (rappel)

```
apps/storefront/
├── public/images/
│   ├── khn_logo.png
│   ├── restaurant_hero.png
│   └── restaurant_story.png        ← à déposer
├── src/
│   ├── app/
│   │   ├── layout.tsx              ← modifier (Partie 1)
│   │   └── [countryCode]/(main)/
│   │       └── page.tsx            ← modifier (Partie 4)
│   ├── styles/globals.css          ← modifier (Partie 1)
│   └── modules/
│       ├── common/
│       │   ├── hooks/
│       │   │   └── use-scroll-reveal.ts       ← créer (Partie 2)
│       │   └── components/
│       │       └── reveal-wrapper/index.tsx   ← créer (Partie 2)
│       ├── home/components/
│       │   ├── hero/index.tsx      ← existant, intact
│       │   ├── story-section/      ← créer (Partie 2)
│       │   ├── dish-of-moment/     ← créer (Partie 3)
│       │   ├── popular-products/   ← créer (Partie 3)
│       │   └── reservation-section/ ← créer (Partie 2)
│       └── layout/templates/
│           └── footer/index.tsx    ← modifier (Partie 4)
```
