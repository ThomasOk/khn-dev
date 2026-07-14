# Session du 2026-06-24 — Email de confirmation & Facturation PDF

Suite de `session-2026-06-24-affichage-totaux.md`.

---

## Ce qui a été fait

### 1. Email de confirmation — corrections click & collect

**Fichier modifié :** `apps/backend/src/modules/resend-notification/templates/order-confirmation.tsx`

#### a) Texte héro corrigé

Avant : "Vous recevrez un email dès qu'elle sera expédiée."
Après : "Votre commande sera prête pour le retrait en magasin très prochainement."

→ Le texte précédent faisait référence à une expédition, inadapté au click & collect.

#### b) Section "Lieu de retrait" ajoutée (adresse fixe du restaurant)

Nouvelle section affichée en permanence avant l'adresse client :

```
KIM-HI NOODLE
652 Avenue de l'Europe
34170 Castelnau-le-Lez
```

→ Le client sait où venir chercher sa commande.

#### c) "Adresse de livraison" → "Adresse de facturation"

L'adresse personnelle du client est conservée mais renommée. Utile comme justificatif d'achat (clients pros, auto-entrepreneurs).

---

### 2. Images produits dans l'email — diagnostic

Les images affichent le placeholder 📦 en développement. C'est **normal et intentionnel** : le code filtre les URLs `localhost` / `127.0.0.1` car elles ne sont pas accessibles depuis les serveurs Resend.

En production avec S3/CDN, les URLs seront publiques → les images s'afficheront automatiquement **sans aucune modification de code**.

---

### 3. Facturation PDF — recherche et décision

#### Ce qui a été exploré

- **Medusa v2** : pas de module de facturation natif
- **`@rsc-labs/medusa-documents-v2`** (listé sur medusajs.com/integrations) : génère des PDFs depuis l'admin, mais l'envoi email automatique est **payant (version Pro)**
- **`@react-pdf/renderer`** : lib React populaire (860k dl/semaine, 15k⭐), envisagée initialement

#### Décision : suivre le tutoriel officiel Medusa

**Tutoriel de référence :**
https://docs.medusajs.com/resources/how-to-tutorials/tutorials/invoice-generator

C'est l'approche officielle Medusa v2 qui couvre exactement les besoins :
- Module `invoice-generator` avec base de données (stockage des factures)
- Génération PDF avec **`pdfmake`** (940k dl/semaine, 12k⭐)
- **Envoi automatique en pièce jointe** dans l'email de confirmation (subscriber `order.placed`)
- Téléchargement admin (widget sur la fiche commande)
- Téléchargement client (page commande du storefront)
- Détection des factures périmées si la commande est modifiée

---

## Ce qui reste à faire

### Facturation PDF ← priorité haute, prochaine session

Suivre le tutoriel officiel en l'adaptant à Kim-Hi Noodle :

**Librairie à installer :**
```bash
cd apps/backend && npm install pdfmake @types/pdfmake
```

**Architecture à créer :**

```
apps/backend/src/modules/invoice-generator/
  models/invoice-config.ts   ← adresse, logo, notes vendeur
  models/invoice.ts          ← facture liée à commande (LATEST | STALE)
  service.ts                 ← generatePdf(), createInvoiceContent()
  index.ts

apps/backend/src/workflows/
  update-invoice-config.ts
  generate-invoice.ts
  mark-invoices-stale.ts

apps/backend/src/api/
  admin/invoice-config/route.ts
  admin/orders/[id]/invoices/route.ts
  store/orders/[id]/invoices/route.ts

apps/backend/src/admin/
  routes/invoice-config/     ← page settings admin
  widgets/invoice-order-widget.tsx

apps/backend/src/subscribers/
  order-placed-invoice.ts    ← génère PDF + attache à la notification Resend
```

**Adaptations spécifiques Kim-Hi Noodle :**
- Adresse vendeur pré-remplie : Kim-Hi Noodle, 652 Avenue de l'Europe, 34170 Castelnau-le-Lez
- Formatage français (Intl.NumberFormat fr-FR, dates en français)
- Section "Retrait en magasin" au lieu de "Livraison"
- Section "Adresse de facturation" (pas "Adresse de livraison")

**Ordre d'implémentation recommandé :**
1. Module + modèles → migration DB
2. Loader config par défaut (adresse Kim-Hi Noodle)
3. Service `generatePdf()` + `createInvoiceContent()`
4. Workflows
5. Routes API admin + store
6. Subscriber `order.placed` → pièce jointe email
7. Widget admin
8. (optionnel) Bouton téléchargement storefront
9. (optionnel) Détection factures périmées

---

### Autres tâches en attente (depuis sessions précédentes)

#### Priorité haute

- [ ] **Configurer les options de retrait** — Remplacer "Standard Shipping" / "Express Shipping" par une méthode "Retrait en magasin" à 0€
- [ ] **Vérifier les prix produits dans l'admin** — S'assurer que tous les prix sont saisis en TTC (6,50€ pour les samoussas). Avec `is_tax_inclusive: true`, prix saisis = prix affichés.
- [ ] **Migration npm → pnpm** — Monorepo configuré pour pnpm mais installé avec npm. Turbopack ne fonctionne pas avec npm.
- [ ] **Premier commit git** — `apps/storefront` encore untracked. Committer après la migration pnpm.

#### Priorité moyenne

- [ ] **Tester l'email de bout en bout** — Passer une commande test et vérifier les corrections d'aujourd'hui : lieu de retrait, adresse de facturation, texte héro.
- [ ] **Personnaliser les produits** — Remplacer les produits de démo (t-shirts…) par les vrais produits du restaurant. Adapter catégories, images, descriptions.
- [ ] **Traduire les labels anglais du storefront** — "Cart", "Go to checkout", "Sign in"…
- [ ] **Remplacer "MEDUSA STORE"** dans le dropdown cart et le footer par "Kim-Hi Noodle".

#### À explorer / décider

- [ ] **Région unique France** — Le seed crée une région "Europe" avec 7 pays. Simplifier à une région France unique pour un restaurant click & collect local.

---

## Points clés à retenir

- **Images email en dev** : le placeholder 📦 est voulu. Aucun code à changer. Les vraies images apparaîtront en prod avec S3.
- **Facture B2C France** : légalement, l'email de confirmation suffit comme reçu. La facture PDF est un plus, non une obligation.
- **pdfmake vs @react-pdf/renderer** : le tutoriel officiel utilise pdfmake, plus adapté aux tableaux (factures) qu'au Flexbox React de @react-pdf/renderer.
- **La notification Resend est déjà en place** — le subscriber facture pourra réutiliser le même provider, il suffit d'ajouter les `attachments` dans l'appel.
