# 03 — Émission de la Facture bout-en-bout au paiement

**Spec :** [docs/specs/facture.md](../../../docs/specs/facture.md) — Implementation Decisions § « Point d'insertion `payment.captured` », « Le workflow est un saga », « Stockage du PDF via le File Module + Module Link » ; Testing § Seam 1 ; Further Notes § « Deux emails au client »
**ADR :** [0002](../../../docs/adr/0002-factures-issued-frozen.md) — émission au paiement, figée, non compensable

**What to build:** Le vrai slice de bout en bout. Une commande dont le paiement est encaissé produit, sans intervention, une Facture : numéro attribué, PDF figé stocké, lié à la Commande, envoyé au client par un email dédié. Un rejeu de l'encaissement ne crée pas de seconde Facture ni ne brûle de numéro.

Contours :
- Nouveau subscriber sur `payment.captured` (en aval de `auto-capture-payment.ts`) qui lance `issueInvoiceWorkflow`. Pas `order.placed`. Même discipline que `kitchen-ticket-notification.ts` : `try/catch` + `logger.error`, jamais de `throw`, aucun état de commande ne dépend de la réussite de la Facture.
- `issueInvoiceWorkflow` : lit la commande, construit `frozen_data` (ticket 02), appelle `issueInvoice` (ticket 01, l'attribution numéro + insert = un seul appel atomique), **puis** rend le PDF, stocke les octets dans le File Module (`access: private`, `file_id` sur l'`Invoice`), crée le lien `invoice ↔ order`, envoie l'email client via `resend-notification` avec la pièce jointe. Les étapes post-`issueInvoice` sont retriables, **jamais compensées** (compenser rouvrirait un trou) — l'émission est terminale et idempotente.
- Email client **distinct** de la confirmation de commande (qui part à `order.placed` avant l'encaissement), avec `idempotency_key` pour dédupe le rejeu.

**Blocked by:** 01 (module + `issueInvoice`), 02 (`frozen_data` + template PDF).

**Status:** ready-for-agent

- [x] Payer un panier via les vraies routes puis, `payment.captured` réglé, on trouve une `Invoice` liée à la Commande par le Module Link, avec numéro formaté et `file_id` non nul, un PDF dans le File Module, et une notification email au client portant la pièce jointe (test HTTP integration, prior art `kitchen-ticket-notification.spec.ts`)
- [x] Le total TTC de la Facture égale le montant encaissé
- [x] Rejouer `payment.captured` : toujours une seule `Invoice`, même numéro, aucun second fichier ni seconde notification
- [x] Un échec de rendu PDF / stockage / email ne « défait » pas l'attribution du numéro déjà émise (pas de trou) et n'empêche ni la confirmation client ni le Ticket cuisine
- [x] La Facture est émise à `payment.captured`, pas à `order.placed`
