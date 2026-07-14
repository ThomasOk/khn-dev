# ReservationSection — Corrections d'espacement

**Date :** 29 juin 2026  
**Statut :** Terminé ✅  
**Fichier modifié :** `apps/storefront/src/modules/home/components/reservation-section/index.tsx`

---

## Contexte

Reprise après la session du 28 juin (refonte complète de la ReservationSection). Le composant était visuellement correct mais présentait des inconsistances d'espacement entre la colonne gauche (Horaires) et la colonne droite (Où nous trouver) du triptyque.

---

## Problèmes identifiés et corrigés

### 1. Espacement vertical — gaps incohérents

La colonne droite utilisait des valeurs de `gap` différentes de la colonne gauche.

| Élément | Avant | Après |
|---|---|---|
| Conteneur principal des items (droite) | `gap-5` | `gap-6` |
| Bloc Adresse — gap label/contenu | `gap-1` | `gap-2` |
| Bloc Contact — gap label/contenu | `gap-1` | `gap-2` |
| Bloc Réseaux sociaux — gap label/icônes | `gap-3` | `gap-2` |

### 2. Espacement horizontal — asymétrie à plein écran

**Symptôme :** À plein écran (viewport ≥ 1440px), le texte de la colonne droite paraissait "collé" à l'image. L'espacement entre l'image et le texte de droite était visuellement inférieur à celui de gauche.

**Cause racine :** Le `content-container` applique `max-w-[1440px] mx-auto px-6`. Au-delà de 1440px de viewport, les auto-margins grandissent sur les côtés extérieurs — la colonne gauche en profite naturellement. La colonne droite, elle, n'avait que `pl-12` (48px fixe) entre l'image et son texte.

**Correction :** Remplacement du padding unilatéral par un padding symétrique `small:px-16` sur **les deux colonnes de texte**.

| Colonne | Avant | Après |
|---|---|---|
| Gauche (Horaires) | `small:pr-12` | `small:px-16` |
| Droite (Où nous trouver) | `small:pl-12` | `small:px-16` |

**Résultat :**
- Gap image→texte : 48px → 64px (les deux côtés)
- Chaque colonne est équilibrée en elle-même (64px de padding de chaque côté)
- La largeur de contenu de chaque colonne de texte passe de 416px à 336px (suffisant)

---

## Structure finale du composant (rappel)

```
<section bg-khn-cream>
  <div content-container>

    ── Zone 1 : Header centré ──────────────────────────────
    pt-20/28 pb-16/20 | flex-col items-center text-center gap-8
      RevealWrapper up      → h2 "Réservez votre table chez nous"
      RevealWrapper up d80  → p subtitle
      RevealWrapper up d160 → a CTA "Réservez une table" (tel:)

    <hr border-stone-200 />

    ── Zone 2 : Triptyque ──────────────────────────────────
    grid-cols-1 | small:grid-cols-3 items-stretch pb-20/28

      [DOM 1, visual 2] Image (small:order-2 small:h-full)
        aspect-[3/2] mobile | aspect-auto small:h-full
        Image fill object-cover

      [DOM 2, visual 1] Horaires (small:order-1)
        flex-col gap-6 | py-10/16 | small:px-16  ← 64px de chaque côté
          Label "Horaires d'ouverture" + border-b
          flex-col gap-6
            Bloc "Sur Place" (gap-2 label/contenu, leading-relaxed, mt-3)
            Bloc "À Emporter" (idem)
          "Dimanche fermé"

      [DOM 3, visual 3] Où nous trouver (small:order-3)
        flex-col gap-6 | py-10/16 | small:px-16  ← 64px de chaque côté
          Label "Où nous trouver" + border-b
          flex-col gap-6
            Bloc "Adresse" (gap-2)
            Bloc "Contact" (gap-2, lien tel:)
            Bloc "Réseaux sociaux" (gap-2, icônes FB + IG)
  </div>
</section>
```

---

## État de la homepage — vue d'ensemble

| Section | Fichier | Statut |
|---|---|---|
| Hero | `hero/index.tsx` | ✅ Fait |
| Notre Histoire | `story-section/index.tsx` | ✅ Fait |
| Plat du Moment | `dish-of-moment/index.tsx` | ✅ Fait |
| Produits Populaires | `popular-products/index.tsx` | ✅ Fait |
| Réservation | `reservation-section/index.tsx` | ✅ Fait + corrigé |
| Footer | `layout/templates/footer/index.tsx` | ✅ Fait |

La homepage est visuellement complète. Les prochains sujets sont du polish, de la vérification et du contenu réel.

---

## Ce qu'il reste à faire

### 1. Polish et vérification homepage

- [ ] Tester sur vrai mobile (375px, iOS Safari prioritaire) — chaque section
- [ ] Vérifier l'enchaînement visuel des sections (alternance cream / dark / white / cream)
- [ ] Vérifier CLS = 0 (pas de layout shift au chargement des images)
- [ ] Tester avec "Réduire le mouvement" activé sur macOS → pas d'animations
- [ ] Vérifier que les animations reveal fonctionnent bien sur scroll mobile (lent)

### 2. Navigation

Des modifications ont été faites dans `nav/`, `nav-client/`, `nav-links/` (session du 26 juin). À vérifier :
- [ ] Menu mobile (side-menu) — comportement ouverture/fermeture
- [ ] Liens actifs en gras ou surlignés
- [ ] Le panier (`cart-dropdown`) fonctionne correctement

### 3. Pages non-homepage

- [ ] Page Boutique (`/store`) — grille produits et pagination
- [ ] Page Catégories (`/categories/[...category]`) — affichage
- [ ] Page Contact (`/contact`) — formulaire (si existant)

### 4. Contenu à remplacer (placeholders)

| Endroit | Valeur actuelle | À remplacer par |
|---|---|---|
| ReservationSection | Lien `href="tel:0973896013"` | Confirmer si c'est le bon numéro |
| ReservationSection | `https://facebook.com/kimhinoodle` | Vrai compte Facebook |
| ReservationSection | `https://instagram.com/kimhinoodle` | Vrai compte Instagram |
| StorySection | Texte "Notre Histoire" | Vrai texte du restaurant |
| Footer | Liens réseaux sociaux | Confirmer les URLs |
| Footer | `contact@kimhinoodle.fr` | Vrai email si différent |

### 5. Back-office Medusa (hors code)

- [ ] Créer la collection `plat-du-moment` (handle exact) — assigner 1 produit
- [ ] Créer la collection `nos-incontournables` (handle exact) — assigner 4 produits

### 6. Mise en production

- [ ] `pnpm --filter storefront build` — 0 erreur TypeScript
- [ ] Variables d'environnement `.env.local` → `.env.production`
- [ ] Test sur un vrai mobile iOS Safari

---

## Références

- **Session précédente (refonte ReservationSection)** : `docs/session-2026-06-28-reservation-section.md`
- **Plan homepage complet** : `docs/session-2026-06-28-homepage-sections.md`
- **RevealWrapper** : `src/modules/common/components/reveal-wrapper/index.tsx`
- **Hook scroll** : `src/modules/common/hooks/use-scroll-reveal.ts`
- **Tailwind config** (couleurs khn, breakpoints, font-display) : `apps/storefront/tailwind.config.js`
- **content-container** : `src/styles/globals.css` — `max-w-[1440px] mx-auto px-6`
