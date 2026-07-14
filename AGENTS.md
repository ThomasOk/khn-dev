# AGENTS.md

## Project

khn-dev is a pnpm monorepo for a restaurant website.

- `apps/backend` — Medusa v2.16 backend
- `apps/storefront` — Next.js 15 storefront
- `docs/agents` — agent documentation
- `docs/adr` — Architecture Decision Records
- `docs/research` — temporary research notes
- `docs/specs` — functional specifications
- `docs/handoffs` — handoffs between sessions

### Goals

- Present the restaurant's menu
- Support click & collect
- Follow Medusa best practices

## Agent skills

### Issue tracker

No external tracker chosen yet. Specs live in `docs/specs/`, work tickets live in `.scratch/`. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root, shared across backend and storefront. See `docs/agents/domain.md`.

## Medusa conventions (`apps/backend`)

- **Check the installed version before proposing an API or pattern.** The backend pins `@medusajs/*` to **2.16.0** (see `apps/backend/package.json`) — don't assume behavior from a different major/minor version or from training data. When in doubt, check the version first, then consult the Medusa docs MCP / `medusa-dev` skill for that version.
- Prefer **native Medusa modules** (product, order, cart, fulfillment, promotion, etc.) over building a custom module when Medusa already covers the capability.
- Multi-step business logic goes in a **Workflow** (`apps/backend/src/workflows/`), not ad-hoc chained service calls in an API route or subscriber.
- **No direct cross-module access.** Modules only reach each other through **Module Links** (`apps/backend/src/links/`). If you find yourself importing another module's service directly, stop and model a link instead.
- Custom API routes live under `apps/backend/src/api/{admin,store}/`, following Medusa's file-based routing.
- Notifications go through the existing `resend-notification` module (`apps/backend/src/modules/resend-notification/`) rather than a new provider, unless a decision to change providers is recorded in an ADR.
- The `medusa-dev` plugin's skills (`building-with-medusa`, `building-admin-dashboard-customizations`) encode these patterns in more detail and should be consulted for backend/admin work.

## Next.js conventions (`apps/storefront`)

- Stack: Next.js **15.5**, React **19**, TypeScript, App Router at `apps/storefront/src/app/[countryCode]/`.
- Feature code lives under `src/modules/<feature>/` (e.g. `cart`, `checkout`, `products`, `account`) — follow this existing split rather than introducing a new top-level structure.
- Talk to the backend through the **Medusa JS SDK** (`src/lib/data/`), not raw `fetch` calls to admin/store routes.
- The `ecommerce-storefront` plugin's `storefront-best-practices` skill encodes data-fetching and checkout/cart patterns and should be consulted for storefront work.

## Project (restaurant) conventions

- Domain is a restaurant menu + click & collect ordering flow — no shipping/delivery in the traditional e-commerce sense; pickup slots and store-only fulfillment replace shipping where Medusa's model assumes delivery.
- Domain vocabulary (menu structure, supplements, pickup slots, etc.) is **not invented here** — it gets defined progressively in `CONTEXT.md` and `docs/adr/` as real decisions are made, via `/grill-with-docs` and related skills.
