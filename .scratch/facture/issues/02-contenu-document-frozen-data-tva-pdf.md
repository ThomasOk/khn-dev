# 02 — Contenu du document : `frozen_data`, ventilation TVA et template PDF

**Spec :** [docs/specs/facture.md](../../../docs/specs/facture.md) — Implementation Decisions § « `frozen_data` », « Le PDF réutilise le moteur pdfmake », « Configuration TVA » ; Testing § Seam 3
**ADR :** [0002](../../../docs/adr/0002-factures-issued-frozen.md) — on stocke les octets, jamais le `docDefinition` ; piège d'API pdfmake 0.2→0.3 déjà résolu dans `render.ts`

**What to build:** Le contenu de la Facture, en fonctions pures : d'une Commande on dérive les données figées `frozen_data`, et de `frozen_data` on produit le PDF. Aucun déclenchement, aucun stockage ici — juste « une commande → un document correct », entièrement testable en unitaire.

Contours :
- Fonction pure Commande (+ config émetteur) → `frozen_data` : mentions **émetteur** (raison sociale, adresse, SIREN/SIRET, TVA intracommunautaire, forme juridique + capital, ville RCS) ; **client** (nom + Adresse de facturation = le `shipping_address` Medusa, jamais une adresse de livraison ici) ; **identité** (numéro formaté, date d'émission = encaissement, date de vente) ; **lignes** (désignation, quantité, PU HT, taux et montant de TVA **lus depuis les `tax_lines` de la commande**, jamais recalculés) ; **ventilation TVA par taux** (sous-totaux HT/TVA/TTC par taux) ; **totaux** HT/TVA/TTC.
- Source de la config émetteur : les valeurs statiques (SIREN, TVA intracom, capital, RCS…) sont une configuration du restaurant résolue à l'émission, pas des env vars en dur — même esprit que `restaurant_notification_email` du module `pickup`. Choix d'implémentation (réutiliser `pickup`, nouveau champ, ou petit modèle dédié) laissé à ce ticket ; l'exigence est qu'un changement d'identifiant légal ne demande pas de redéploiement.
- Template `buildInvoiceDocDefinition` : `frozen_data` → docDefinition pdfmake, rendu via `renderPdfDocDefinitionToBase64` (`src/lib/pdf/render.ts`, moteur déjà en place — on ne partage pas le template du Ticket cuisine, seulement le moteur).

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Une Commande fixture avec plusieurs lignes et plusieurs taux de TVA produit un `frozen_data` dont la ventilation par taux et les totaux HT/TVA/TTC sont corrects (test unitaire)
- [ ] Le taux et le montant de TVA par ligne proviennent des `tax_lines` de la commande, pas d'un recalcul
- [ ] Le total TTC du `frozen_data` égale le montant censé être encaissé
- [ ] La config émetteur (SIREN, TVA intracom, capital, RCS…) est résolue depuis une source modifiable sans redéploiement, et ses valeurs apparaissent dans `frozen_data`
- [ ] `buildInvoiceDocDefinition` produit un docDefinition portant numéro, mentions émetteur, adresse de facturation client, ventilation TVA et totaux (test unitaire, `src/**/__tests__/*.unit.spec.ts`)
- [ ] Le docDefinition se rend en PDF via `render.ts` sans erreur
