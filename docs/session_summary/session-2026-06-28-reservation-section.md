# Refonte de la ReservationSection

**Date :** 28 juin 2026  
**Statut :** Terminé ✅  
**Fichier modifié :** `apps/storefront/src/modules/home/components/reservation-section/index.tsx`

---

## Contexte

La section "Réservez votre table chez nous" existait déjà mais utilisait un layout 2 colonnes (image gauche | tout le contenu droite) qui ne correspondait pas à la maquette fournie. L'objectif était de la remanier pour correspondre fidèlement à la maquette tout en appliquant les bonnes pratiques Emil (design engineering).

---

## Avant / Après

| | Avant | Après |
|---|---|---|
| Layout | 2 colonnes `col-span-5/7` | 2 zones verticales distinctes |
| Titre | `text-4xl small:text-5xl`, mixte casse | `text-5xl small:text-6xl`, `uppercase` |
| CTA | Avec icône téléphone, aligné à gauche | Texte seul, centré |
| Eyebrow | Trait orange + "Venez nous rendre visite" | Supprimé |
| Horaires | 2 sous-colonnes dans la colonne droite | Colonne dédiée, pleine largeur |
| Image | Colonne gauche, aspect `[4/3]` mobile / `[3/4]` desktop | Centre du triptyque, pleine hauteur desktop |
| Où nous trouver | Bas de la colonne droite | Colonne dédiée à droite |
| Réseaux sociaux | Sans label | Label "Réseaux sociaux" ajouté |

---

## Décisions prises

| Sujet | Décision | Raison |
|---|---|---|
| Structure | 2 zones : header centré + triptyque | Fidélité à la maquette |
| Ordre DOM | Image en 1er dans le DOM | Mobile : image visible en haut sans CSS order |
| Ordre visuel desktop | `small:order-1/2/3` | Image au centre visuellement sur desktop |
| Image desktop | `small:h-full` + `small:aspect-auto` | Remplit la hauteur de la grid cell |
| Image mobile | `aspect-[3/2]` | Landscape propre sur mobile, sans padding inutile |
| Labels de section | `pb-3 border-b border-stone-200` | Hairline sous chaque label — plus raffiné que le style précédent |
| Texte subtitle | "entre collègues" / "au cœur du Cambodge" | Wording fidèle à la maquette (vs "entre amis" / "nouilles") |
| Icône dans le CTA | Supprimée | La maquette montre un bouton texte seul — moins de bruit visuel |
| Animations Zone 2 | Fan-out gauche→centre→droite (delays 0/80/160ms) | Renforce l'effet triptyque à l'entrée |

---

## Structure du composant

```
<section bg-khn-cream overflow-x-hidden>
  <div content-container>

    ── Zone 1 : Header centré ──────────────────────────────
    <div pt-20/28 pb-16/20 flex-col items-center text-center gap-8>
      <RevealWrapper up>       → h2 uppercase tracking-wide text-5xl/6xl
      <RevealWrapper up d80>   → p subtitle
      <RevealWrapper up d160>  → a CTA "Réservez une table"
    </div>

    <hr border-stone-200 />

    ── Zone 2 : Triptyque ──────────────────────────────────
    <div grid-cols-1 small:grid-cols-3 items-stretch pb-20/28>

      [DOM 1, visual 2] Image
        RevealWrapper up d80, small:order-2 small:h-full
        └── div aspect-[3/2] | small:aspect-auto small:h-full overflow-hidden
            └── Image fill object-cover

      [DOM 2, visual 1] Horaires d'ouverture
        RevealWrapper left, small:order-1
        └── div py-10/16 small:pr-12
            ├── label + border-b
            ├── Sur Place (Lundi au Jeudi / Vendredi et Samedi)
            ├── À Emporter (Lundi - Jeudi / Vendredi - Samedi)
            └── "Dimanche fermé"

      [DOM 3, visual 3] Où nous trouver
        RevealWrapper right d160, small:order-3
        └── div py-10/16 small:pl-12
            ├── label + border-b
            ├── Adresse
            ├── Contact (tel: link)
            └── Réseaux sociaux (FB + IG icons circles)
    </div>
  </div>
</section>
```

---

## Checklist Emil appliquée

- [x] `transition-colors duration-200` (pas `transition: all`)
- [x] `[@media(hover:hover)]:hover:*` sur tous les états hover
- [x] `active:scale-[0.97]` sur le bouton CTA
- [x] `min-h-[44px]` sur le bouton CTA
- [x] `[text-wrap:balance]` sur le titre et le sous-titre
- [x] `prefers-reduced-motion` géré globalement dans `globals.css` — rien à ajouter au composant
- [x] `aria-label` sur les icônes sociales (FB, IG)
- [x] `rel="noopener noreferrer"` sur les liens externes

---

## Ce qui reste à faire sur le projet

Le récapitulatif complet de l'avancement de la homepage :

### Sections homepage — état actuel

| Section | Fichier | Statut |
|---|---|---|
| Hero | `hero/index.tsx` | ✅ Fait |
| Notre Histoire | `story-section/index.tsx` | ✅ Fait |
| Plat du Moment | `dish-of-moment/index.tsx` | ✅ Fait |
| Produits Populaires | `popular-products/index.tsx` | ✅ Fait |
| Réservation | `reservation-section/index.tsx` | ✅ Refonte faite (cette session) |
| Footer | `layout/templates/footer/index.tsx` | ✅ Fait |

La homepage est visuellement complète.

---

### Ce qui reste à faire (prochaines sessions)

#### 1. Vérification / polish global homepage

- [ ] Tester le rendu mobile (vrai device ou DevTools 375px) pour chaque section
- [ ] Vérifier l'enchaînement visuel des sections (alternance cream/dark/white/cream)
- [ ] Valider CLS = 0 (pas de layout shift au chargement des images)
- [ ] Vérifier que les animations reveal fonctionnent bien sur mobile (scroll lent)
- [ ] Tester avec "Réduire le mouvement" activé sur macOS → pas d'animations

#### 2. Navigation

Des modifications ont été faites dans `nav/` et `nav-client/`. À vérifier :
- [ ] Menu mobile (side-menu) — comportement ouverture/fermeture
- [ ] Liens actifs en gras ou surlignés
- [ ] Le panier (`cart-dropdown`) fonctionne correctement

#### 3. Pages non-homepage

- [ ] Page Boutique (`/store`) — vérifier la grille produits et pagination
- [ ] Page Catégories (`/categories/[...category]`) — vérifier l'affichage
- [ ] Page Contact (`/contact`) — vérifier le formulaire (si existant)

#### 4. Contenu à remplacer (placeholders)

| Endroit | Placeholder actuel | À remplacer par |
|---|---|---|
| ReservationSection | "au cœur du Cambodge" (wording maquette) | Wording définitif à valider avec le client |
| ReservationSection | Lien `href="tel:0973896013"` | Confirmer si c'est le bon numéro |
| Footer | Liens Instagram / Facebook | Confirmer les URLs des vrais comptes |
| StorySection | Texte "Notre Histoire" | Vrai texte du restaurant si pas encore fait |

#### 5. Back-office Medusa (hors code)

- [ ] Collection `plat-du-moment` (handle exact) — assigner 1 produit
- [ ] Collection `nos-incontournables` (handle exact) — assigner 4 produits

#### 6. Mise en production

- [ ] `pnpm --filter storefront build` — 0 erreur TypeScript
- [ ] Variables d'environnement `.env.local` → `.env.production`
- [ ] Test sur un vrai mobile (iOS Safari prioritaire)

---

## Références utiles

- **Skill Emil** : `/emil-design-engineering` — principes UI/UX/animation
- **RevealWrapper** : `src/modules/common/components/reveal-wrapper/index.tsx`
- **Hook scroll** : `src/modules/common/hooks/use-scroll-reveal.ts`
- **Globals CSS** (classes reveal) : `src/styles/globals.css`
- **Tailwind config** (couleurs khn, font-display) : `apps/storefront/tailwind.config.js`
- **Session précédente** : `docs/session-2026-06-28-homepage-sections.md` (plan initial de la homepage)
