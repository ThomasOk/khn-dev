# Factures are issued frozen, with their own sequential counter

A Facture is issued when payment is taken and is **immutable from that moment**: never edited, never deleted, never regenerated, and its number never reused. Numbering uses a **dedicated sequential counter** — chronological, gapless — not Medusa's `display_id`, not the order id, not a UUID. The only way to undo an issued Facture is an **Avoir** (credit note).

This is not a preference. A facture is an accounting artefact, and Kim-Hi Noodle's customers include professionals who will use these to reclaim VAT. A document that silently changed, or a gap in the numbering, is a problem with teeth. It is also nearly free to get right here: orders are same-day and pre-paid, so nothing about an order can legitimately change after payment anyway.

## Deliberate deviation from the Medusa invoice tutorial

We are otherwise following Medusa's official invoice-generator tutorial (`pdfmake`, module + subscriber on `order.placed`, admin widget). **Its invoice lifecycle must be rejected.** The tutorial marks invoices `STALE` when the order changes and **regenerates the PDF** — i.e. it silently rewrites an issued legal document, and a regeneration that fails or retries punches a gap in the numbering.

Follow the tutorial for the PDF mechanics. Do not follow it for the lifecycle, and verify its numbering against the gapless-counter requirement above. This is recorded because the tutorial is the obvious path, and someone implementing it as written would introduce the bug without ever realising there was a decision here.

**Trap: `pdfmake@0.3.x` changed its API, and the tutorial is written against `0.2`.** `new PdfPrinter(fonts)` — the constructor the tutorial uses — no longer exists in `0.3.x` and throws `TypeError: PdfPrinter is not a constructor` (verified by running it, `pdfmake@0.3.11` on Node 22.19 — see `docs/research/2026-07-16-medusa-notification-commande-ticket-cuisine.md` §6.4). `0.3.x` exports a singleton instead:

```js
const pdfmake = require('pdfmake')
pdfmake.addFonts({ Roboto: { normal: '…/Roboto-Regular.ttf', bold: '…/Roboto-Medium.ttf' } })
const buffer = await pdfmake.createPdf(docDefinition).getBuffer()
```

Pin `pdfmake@^0.2` to follow the tutorial verbatim, or take `0.3.x` knowing the tutorial's code needs translating to the singleton API above. Whichever is chosen, say so explicitly in `apps/backend/package.json` — don't let `pnpm add pdfmake` silently resolve to whichever is latest when this ADR gets implemented.

## Consequences

Refunds are rare at Kim-Hi Noodle (a few times a year), so **no credit-note module is built**: no Avoir counter, no admin UI. The refund itself is performed by **cancelling the Commande in the Medusa admin** — `cancelOrderWorkflow` refunds captured payments through Stripe automatically. The Avoir is then **written by hand** and filed with the Facture.

Cancelling an order does **not** touch its Facture. If refunds ever become frequent, this is the decision to revisit.

Never refund from the Stripe dashboard directly: Medusa would be unaware, and a subsequent cancellation would ask Stripe to refund a second time.
