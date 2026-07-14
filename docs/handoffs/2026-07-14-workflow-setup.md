# Handoff — khn-dev workflow setup

*2026-07-14*

## Next session focus

Run `/grill-with-docs` on the business domain: the restaurant's **carte** (menu) and the **click & collect** ordering flow. Goal: build the repo's first `CONTEXT.md` (domain glossary) through the grilling interview rather than inventing terms upfront.

Suggested opening prompt for that command:

```
/grill-with-docs le domaine métier du site : la carte du restaurant et le fonctionnement du click & collect (produits, suppléments, créneaux de retrait, commande)
```

If a narrower scope turns out easier to finish in one sitting, restrict it to a single sub-topic (e.g. just pickup slots) instead of the whole domain at once.

## Where things stand

This is a continuation of the workflow-setup session captured in `~/Downloads/session-workflow-medusa-matt-pocock-2026-07-13.md` (adopting the Matt Pocock skill-driven workflow: setup → grill-with-docs → research → prototype → to-spec → to-tickets → tdd/implement → code-review → QA → handoff). That doc already covers the earlier decisions (single-context domain docs, local-markdown issue tracker in `.scratch/`, why `AGENTS.md` was kept over `CLAUDE.md`). Read it for that background — not duplicated here.

This session:

1. **Enriched `AGENTS.md`** (repo root) with Medusa and Next.js technical conventions, reviewed and confirmed with the user:
   - Medusa: check the installed version (`@medusajs/*` pinned to 2.16.0) before proposing APIs; prefer native modules; business logic in Workflows (`apps/backend/src/workflows/`); no direct cross-module access — use Module Links (`apps/backend/src/links/`); notifications via the existing `resend-notification` module.
   - Next.js: 15.5 / React 19, App Router at `apps/storefront/src/app/[countryCode]/`, feature code under `src/modules/<feature>/`, talk to the backend via the Medusa JS SDK (`src/lib/data/`).
   - Project: click & collect replaces shipping/delivery; domain vocabulary explicitly deferred to `CONTEXT.md`/ADRs, not invented in `AGENTS.md`.

2. **Discovered and fixed a gap in the installed skill set**: `/grill-with-docs` depends on `/grilling` and `/domain-modeling`, neither of which had been installed — only a subset of `mattpocock/skills` was present locally. Fetched both from `https://github.com/mattpocock/skills` (`skills/productivity/grilling/`, `skills/engineering/domain-modeling/`) into `~/.agents/skills/`, symlinked into `~/.claude/skills/`, and added matching entries to `~/.agents/.skill-lock.json`. Both skills now show up as available and are confirmed working.

3. Walked the user through **what `CONTEXT.md` will actually contain** (a domain glossary only — terms + one/two-line definitions + `_Avoid_` synonyms, no implementation detail, no specs) and its purpose (shared vocabulary, a reference other skills read before proposing work, a way to surface contradictions against ADRs/code). Format reference: `~/.agents/skills/domain-modeling/CONTEXT-FORMAT.md`.

`CONTEXT.md` does not exist yet — by design, `/domain-modeling` creates it lazily on the first resolved term, during the grilling session.

## Good to know

- `grill-with-docs`, `grilling`, `domain-modeling`, and `handoff` all have `disable-model-invocation: true` — the user must type the slash command directly; an agent cannot invoke them via a Skill tool call.
- `docs/adr/`, `docs/research/`, `docs/handoffs/`, `docs/specs/` all exist but are currently empty.
- No `.scratch/` directory exists yet (created lazily when the first work ticket is filed, per `docs/agents/issue-tracker.md`).

## Suggested skills for next session

- **`grill-with-docs`** (primary) — run this first, with a domain-focused prompt as above.
- `domain-modeling` and `grilling` are invoked internally by `grill-with-docs`; no need to call them directly.
