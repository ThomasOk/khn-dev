# Handoff — domain model landed, next: créneaux de retrait research

*2026-07-14*

## Where things stand

- `main` is up to date (`c8a9e36`), containing the merged PR #3 (`docs/domain-model`, was `fed15c2`).
- Working tree clean, on `main`, nothing pending.

## What happened this session

Ran `/grill-with-docs` on the business domain (carte + click & collect). Full interview transcript is in this session's history — not repeated here. Output:

- **`CONTEXT.md`** (repo root, new) — the first domain glossary, 24 terms across 5 clusters: the offer (Carte / Carte sur place / Produit / Variante), Formules, Le retrait, La commande et ses documents, Le client. Plus a "Not in the domain" section for Supplément (explicitly doesn't exist, kept as a guardrail).
- **Three ADRs** in `docs/adr/`:
  - `0001-formules-as-flat-priced-produits.md` — formules are Produits with one fixed-price Variante; sélections carry no money; composants are curated (opt-in), not derived. Read this before anyone proposes a bundle module or a variant-matrix formule.
  - `0002-factures-issued-frozen.md` — factures are immutable once issued, dedicated sequential counter, avoirs handled by hand (rare, ~few/year). **Explicitly deviates from the Medusa invoice tutorial's regenerate-on-STALE lifecycle** — if implementing invoicing from that tutorial, the lifecycle part must NOT be followed as-is.
  - `0003-creneaux-without-capacity.md` — créneaux are labels, not resources with capacity, by deliberate deferral (no real throughput data yet), not oversight.
- Fixed `.gitignore`: it ended with a bare `docs/` line that silently excluded the entire docs directory (including the ADRs this session produced). Now only `.claude/settings.local.json` is ignored there.
- Moved 5 old `docs/session-2026-06-24-*.md` files into `docs/session_summary/` (they were already misplaced at `docs/` root vs. the established `docs/session_summary/` location — done as part of the same commit, recorded as git renames, no content lost).

Key domain decisions worth internalizing before touching code (full reasoning in the ADRs/CONTEXT.md, not repeated here):

- Every price in the system is computed by Medusa's pricing engine only — no supplément, no line-metadata price adjustment, ever (until a deliberate future decision says otherwise).
- A Créneau de retrait is a label on the order, not a bookable resource — no capacity field, no overbooking logic, for now.
- Cancelling an order in the Medusa admin already triggers a Stripe refund automatically (`cancelOrderWorkflow` → `refundCapturedPaymentsWorkflow`, verified against the installed 2.16 source). Never refund from the Stripe dashboard directly — Medusa won't know, and a later cancellation would double-refund.
- No address in this system is ever a delivery address — Medusa's `shipping_address` field is repurposed to hold the Adresse de facturation.

## What's next

The user chose **Créneaux de retrait** as the first slice to build (over: notification+ticket cuisine, real carte data, facture). Reasoning: without pickup slots, "click & collect" is just a shop — it's the structural core the rest hangs off.

The immediate next step is **`/research`**, not `/to-spec` — there's a real unknown blocking the spec: how Medusa 2.16 actually models store pickup, and where a chosen créneau should live (shipping option / fulfillment provider metadata, cart metadata, or a custom module). The storefront's checkout already references `PICKUP_OPTION_ON` / `PICKUP_OPTION_OFF` constants (`apps/storefront/src/modules/checkout/components/shipping/index.tsx`), suggesting Medusa has *some* native pickup notion already — that needs pinning down against the docs before designing anything.

Suggested research prompt (French, matching the project's working language):

```
/research Medusa 2.16 : comment modéliser le retrait en magasin (store pickup) et où
stocker le créneau de retrait choisi par le client — shipping option / fulfillment
provider, métadonnées du panier, ou module custom ? Voir CONTEXT.md (Créneau de
retrait, Horaires de retrait) et docs/adr/0003-creneaux-without-capacity.md.
```

After research lands (in `docs/research/`), the natural sequence is `/to-spec` → `/to-tickets` → `/tdd`/`/implement` → `/code-review`.

Other slices already scoped in `CONTEXT.md`/ADRs but not yet started, in the order the user leaned toward after créneaux: notification de commande + ticket cuisine (day-one operational gap — nobody at the restaurant is currently told an order exists), facture (ADR 0002 already resolves the hard design questions), formules (ADR 0001 already resolves the hard design questions), and replacing the seed data (T-shirts/sweatpants + Standard/Express Shipping) with the real carte — this last one is config/data entry, not a feature, and could happen in parallel with any of the above.

## Good to know

- Git workflow in this repo: feature branches → PR → merge to `main` (see PRs #1, #2, #3). The user pushes and opens PRs themselves; don't push or open PRs without being asked.
- **Do not add a `Co-Authored-By: Claude` trailer to commits or PRs in this repo** — the user explicitly asked for this to stop.
- `grill-with-docs`, `grilling`, `domain-modeling`, and `handoff` all have `disable-model-invocation: true` — must be typed as slash commands by the user, an agent can't invoke them via the Skill tool on its own initiative.
- `docs/research/` and `docs/specs/` still exist but are empty — first real content will come from the créneaux research/spec work above.
- No `.scratch/` directory exists yet (created lazily when the first work ticket is filed, per `docs/agents/issue-tracker.md`).

## Suggested skills for next session

- **`/research`** (primary, first step) — run with the prompt above, or a refined version of it.
- `domain-modeling` — invoke inline (not as a fresh grilling session) if research surfaces a Medusa concept that doesn't map cleanly onto existing `CONTEXT.md` terms (e.g. if pickup turns out to be a `shipping_option` — does "Créneau" need a note clarifying it rides on a field literally named `shipping`?).
