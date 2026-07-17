# 01 — Module `invoice` + attribution atomique du numéro (sans trou)

**Spec :** [docs/specs/facture.md](../../../docs/specs/facture.md) — Implementation Decisions § « module `invoice` », « Attribution atomique du numéro » ; Testing § Seam 2
**ADR :** [0002](../../../docs/adr/0002-factures-issued-frozen.md) — Facture figée, compteur dédié sans trou, format `F-2026-000123`, série annuelle, unicité `(year, number)`

**What to build:** Le moteur de numérotation de la Facture. Un module Medusa natif `invoice` qui, appelé pour une commande, attribue un Numéro de facture séquentiel de l'année et enregistre la Facture — dans une seule transaction, sans jamais brûler ni dupliquer un numéro, même sous paiements simultanés. Ce ticket ne rend aucun PDF et n'envoie aucun email : il prouve la garantie sans-trou.

Contours :
- Data models `Invoice` (`order_id`, `year`, `number` entier de l'année, numéro formaté, `frozen_data` JSON reçu en entrée, `file_id` nullable) et `InvoiceCounter` (une ligne par année, `id = "facture-<année>"`, `value`).
- Contraintes `unique(order_id)` et `unique(year, number)`.
- Définition du Module Link `invoice ↔ order` (peuplé au ticket 03).
- Méthode de service `issueInvoice({ order_id, year, frozen_data })` : `UPDATE invoice_counter SET value = value + 1 WHERE id = ? RETURNING value` sur la ligne de l'année **puis** insert de l'`Invoice`, dans la même transaction (`@InjectManager` → `@InjectTransactionManager`, `sharedContext` propagé aux appels CRUD imbriqués). Idempotente sur `order_id` : un second appel retourne la Facture existante sans consommer de numéro.
- Formateur `F-YYYY-NNNNNN` (année + entier zéro-paddé).
- Pas de `SEQUENCE` / `SERIAL` / `model.autoincrement()` : `nextval` non annulé au rollback = trou.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `issueInvoice` appelée en parallèle (`Promise.all`) sur N commandes distinctes produit N numéros formant `1..N`, contigus, sans trou, sans doublon (test module integration, `medusaIntegrationTestRunner`, vrai Postgres)
- [ ] Un `issueInvoice` dont la transaction échoue après l'`UPDATE` ne laisse aucun trou : le numéro n'est pas consommé
- [ ] `issueInvoice` appelée deux fois pour le même `order_id` retourne une seule `Invoice`, un seul numéro
- [ ] Émettre sur deux années distinctes crée deux lignes `InvoiceCounter`, chacune repartant de 1 ; `(year, number)` est unique
- [ ] Le numéro formaté suit `F-2026-000123` (test unitaire du formateur, sous `src/**/__tests__/*.unit.spec.ts`)
- [ ] La migration crée les tables + contraintes ; le Module Link `invoice ↔ order` est défini
