# Project Constitution: AI Coding Agent Operating Doctrine

> **Scope**: This document defines the binding rules, operational constraints, and architectural standards that any AI coding assistant or human developer must strictly follow when working on a project instantiated from this template.

---

## Document Precedence & Source of Truth Hierarchy
When resolving conflicting statements, requirements, or conventions across the repository, AI agents and human developers must adhere deterministically to the following strict hierarchy of authority (highest to lowest):

1. **`project_constitution.md`** (along with [`SETUP.md`](SETUP.md) for project instantiation) — Immutable engineering rules, architectural principles, security standards, and AI agent operating doctrine.
2. **`brain.md`** — Canonical project strategy, product context, constraints, and active project-level decisions (including Section 15 stack decisions, capability overrides, and Section 9 brand/design intent).
3. **`architecture/`** — Technical architecture specifications, system blueprints, and subsystem boundary definitions (e.g. [`database-migration-boundary.md`](architecture/database-migration-boundary.md)).
4. **`security/`** — Binding security governance: authentication flow specs, RBAC matrices, edge proxy policy, RLS/data-access policy specifications, and audit standards. *Governance and specifications only* — executable security code lives in `src/` and `supabase/migrations/`, never here.
5. **`specifications/`** — Feature and product implementation contracts, PRDs, acceptance criteria, and API schemas.
6. **`design-system/MASTER.md`** (plus `design-system/pages/<page>.md` overrides) — Canonical visual & interaction implementation system. Strictly subordinate to `brain.md` §9: `brain.md` defines brand *intent*, the design system defines visual *execution*. Page override files govern only their own route.
7. **`decisions/records/` (ADRs)** — Historical rationale for architectural decisions. *Rule*: ADRs document why a choice was made at a specific point in time; an ADR never overrides a newer documented decision or convention in `brain.md` or `architecture/`.
8. **`research/`** — Dated research findings (market, user, spikes) carrying the four-tier attribution taxonomy. Research is *evidence*: it informs decisions but never overrides any higher tier, and it may only change `brain.md` or `architecture/` through explicit user approval plus the ADR path.
9. **`product/vision.md` and other product documents** — Derived, human-readable product summaries intended for pitch and design discussions. Strictly subordinate to `brain.md`.
10. **Individual `README.md` files** — Local directory guidance, file maps, and navigation orientation only.

### Expected Reading Order for Product & Feature Implementation:
When planning, designing, or implementing features, AI agents must read product and technical documents in this deterministic sequence:
1. **`brain.md`**: Canonical project strategy, product identity, core value proposition, goals, non-goals, and stack assumptions.
2. **`product/vision.md`**: Derived executive summary of product direction and positioning.
3. **`product/personas/`**: Detailed user and buyer persona research, pain points, and workflow motivations.
4. **`product/journeys/`**: Detailed end-to-end user journeys and lifecycle state diagrams across persona touchpoints.
5. **`specifications/features/`**: Concrete, implementation-level feature contracts, input/output schemas, and acceptance criteria. (Read immediately before modifying code).
6. **`design-system/MASTER.md` and `design-system/pages/<page>.md`** (when they exist): Canonical visual and interaction implementation system. Read immediately before authoring or modifying UI code; the page override for the route being touched governs that route.

### Deterministic Conflict Resolution Rules:
- **Higher-Tier Authority Governs**: If a lower-tier document contradicts a higher-tier document, the higher-tier document wins unconditionally. The lower-tier document must be updated to align.
- **Repository State as Implementation Truth**: Running application code, active configuration files (`tsconfig.json`, `prisma/schema.prisma`, `supabase/config.toml`, `.env.example`), and version control state represent the actual implementation reality. If documentation describes an implementation feature that does not exist or differs from active code, inspect the code first, verify against `brain.md`/ADRs whether the drift is intentional, and reconcile the documentation with implementation truth.
- **Historical ADRs Do Not Override Active Rules**: An accepted ADR records intent at the time of authoring. If subsequent architectural changes supersede an ADR, the previous ADR must be marked `Superseded` with a pointer to the new decision rather than creating competing active rules.
- **Research Findings Are Evidence, Not Authority**: Documents in `research/` inform decisions but never override tiers 1–7. A research finding that contradicts `brain.md`, `architecture/`, `security/`, `specifications/`, `design-system/MASTER.md`, or an active ADR must be escalated with its attribution tags; it changes canonical truth only via explicit user approval and the ADR/supersede process.
- **Design Intent vs. Execution**: `brain.md` §9 defines brand intent; `design-system/MASTER.md` defines visual execution. When they diverge, `brain.md` governs and the design system must be regenerated or updated to align.

---

## Template Defaults vs. Project-Specific Decisions
This repository provides an enterprise-ready baseline (Next.js + Prisma + Supabase + TypeScript). However:
1. **Template Defaults Are Baselines, Not Mandates**: Not every project requires the full stack. A marketing website, content blog, or client-side utility does not need authentication, database migrations, or payments.
2. **Project Sovereignty**: The project requirements defined in [`brain.md`](brain.md) and [`specifications/`](specifications/) dictate which capabilities are activated. Never force unwanted architectural complexity (such as user accounts or database tables) into a project that does not ask for them.
3. **Strictness Where Activated**: Conditional rules (such as authentication or database policies) only activate when those features are required. When a capability *is* active, its architectural, security, and quality rules are absolute and non-negotiable.

---

## Article I: Research Before Assumptions
1. **Never Guess or Assume**: Always inspect existing schemas, route structures, and file implementations before proposing or writing code.
2. **Locate Ground Truth**: Check active configuration files (`tsconfig.json`, `prisma/schema.prisma`, `supabase/config.toml`, `.env.example`) rather than inferring versions or conventions.
3. **Inspect Before Modifying**: Read the target file in its entirety or within its immediate module boundary before executing replacements.

---

## Article II: NotebookLM & Knowledge Retrieval
1. **Consult Deep Knowledge First**: Before architecting complex domain features, consult NotebookLM notebooks or project research folders (`research/`, `specifications/`) for domain context, research notes, and technical spikes.
2. **Synthesize External Context**: When research documents exist, cite the relevant research finding or specification section in technical proposals.
3. **Feed Learnings Back**: When resolving non-trivial architectural spikes or tricky integration bugs, summarize the findings into a research note or decision record.

---

## Article III: Persistent Project Memory
1. **Living Brain Synchronization**: Maintain [`brain.md`](brain.md) as the canonical persistent source of truth. Whenever meaningful progress occurs, milestones complete, or constraints shift, update the *Project Metadata* header (`Last Updated`, `Updated By`, `Current Phase`) and the *Current Project State* section, and synchronize derived documents (such as [`product/vision.md`](product/vision.md)).
2. **Respect Historical Context**: Consult [`decisions/records/`](decisions/records) (ADRs) to understand why previous choices were made before proposing refactors. Remember that ADRs provide historical rationale and do not override newer decisions in `brain.md` or `architecture/`.
3. **No Amnesia**: Never revert or rewrite established conventions documented in [`brain.md`](brain.md) or [`architecture/`](architecture/) without explicit user confirmation and an ADR.

---

## Article IV: Architecture Before Implementation
1. **Plan First**: For any change extending beyond a trivial single-line fix, formulate an implementation plan detailing the affected files, system boundaries, and migration steps.
2. **Review Boundaries**: Ensure changes respect the separation of concerns:
   - UI presentation lives in `src/components/` and `src/app/`.
   - Domain logic lives in `src/server/services/`.
   - Data access lives in `src/server/repositories/` and Prisma.
   - Executable authentication code lives strictly in `src/lib/auth/`.
   - Executable edge request interception (Proxy) lives strictly at `src/proxy.ts` (Next.js 16+ convention; exported function `proxy`).
   - Executable RLS SQL migrations live strictly in `supabase/migrations/*.sql`.
   - The root `security/` directory is strictly for governance documentation, access matrices, and policy specifications—never executable code.
3. **Obtain Alignment**: When making architectural additions or breaking changes, present the proposal to the user before editing code.

---

## Article V: Next.js App Router Conventions
1. **Idiomatic App Router Only**: All application routing must reside strictly under `src/app/`. Never introduce legacy `pages/` directory patterns.
2. **Server-First by Default**: Default to React Server Components (RSC) for data fetching, rendering, and performance. Only add `"use client"` when state, effects, or browser event listeners are strictly required.
3. **Clean Route Handlers & Server Actions**:
   - Use Server Actions (`"use server"`) for mutations and form handling.
   - Use Route Handlers (`src/app/api/.../route.ts`) exclusively for webhooks, external integrations, or public REST endpoints.
4. **Logical Route Groups**: Use parenthesis route groups (e.g., `(marketing)`, `(auth)`, `(dashboard)`) to organize layouts and access levels without polluting the URL structure.

---

## Article VI: Single Database Migration Pipeline, ORM & Security Boundary
*(Applies to projects utilizing a relational database and Supabase)*
1. **Dormant When Unused**: If a project is purely static or client-side with no persistence requirements, database tooling remains dormant.
2. **Single Migration Pipeline**: When database persistence is utilized, adhere unconditionally to [`architecture/database-migration-boundary.md`](architecture/database-migration-boundary.md). Supabase SQL is the **single source of truth** for all database migrations.
3. **Supabase Owns All Migrations**:
   - All tables, columns, constraints, foreign keys, enums, indexes, PostgreSQL extensions (`uuid-ossp`, `pgvector`), Row-Level Security (RLS) policies, database triggers, stored functions, and realtime publications are authored and managed exclusively in `supabase/migrations/*.sql`.
   - Apply migrations locally via `supabase migration up`.
   - Seed data is maintained exclusively in `supabase/seed.sql`.
4. **Prisma is ORM & Client Only (Never a Migration Runner)**:
   - Prisma is strictly an Object-Relational Mapping (ORM) and type-safe query client layer.
   - `prisma/schema.prisma` is a **derived, committed** schema representation generated from the live database via `prisma db pull`.
   - Never author schema changes directly in `schema.prisma` expecting them to apply to PostgreSQL.
   - Never execute `prisma migrate dev`, `prisma migrate deploy`, or `prisma migrate reset`.
   - The `prisma/migrations/` and `prisma/seeds/` directories must not exist.
   - TypeScript client generation is executed via `prisma generate`.
5. **Deterministic Migration Ordering**:
   - Supabase migrations execute chronologically by filename timestamp.
   - Extensions must precede tables referencing them; tables must precede RLS policies, foreign keys, or triggers referencing them.
   - Always run `db-sync.sh` (or `prisma db pull && prisma generate`) immediately after applying Supabase migrations to keep `@prisma/client` synchronized with the database.
6. **Prisma vs. Supabase RLS Authorization Boundary**:
   - **Supabase Client/PostgREST Perimeter**: Direct client and PostgREST interactions executed via the Supabase client are secured at the database layer via PostgreSQL Row-Level Security (RLS) policies evaluating authenticated claims (`auth.uid()`, roles).
   - **Prisma Connection Reality**: Server-side Prisma operations connect directly through PostgreSQL connection strings (`DATABASE_URL` / `DIRECT_URL`) as a privileged database role that bypasses PostgreSQL RLS. **Prisma queries do NOT automatically inherit Supabase RLS protections.**
   - **Explicit Scoping in Prisma Queries**: Prisma repositories, domain services, and Server Actions must never assume RLS enforces application authorization. Every Prisma query and mutation must explicitly scope operations by authenticated user, tenant, organization, or resource ownership (e.g. `where: { id: resourceId, userId: session.user.id }`).
   - **Privileged Access Isolation**: Service-role, batch, and administrative database operations must be strictly isolated, audited, and treated as privileged, never relying on client-supplied identity or client-claimed authority.
   - **Independent Security Auditing**: Security tooling, skills, and code reviews must audit Prisma database access separately from Supabase RLS migration policies.

---

## Article VII: Authentication & Authorization
*(Conditional: Applies when the project requires authentication, user sessions, or access control)*
1. **Omitted on Public Sites**: If the project is a public marketing website, static blog, or unauthenticated tool, authentication libraries, cookies, and route guards are omitted.
2. **Supabase Auth as Default Provider**: When user authentication is required, use Supabase Auth for identity management, session tokens, and OAuth callbacks.
3. **Cookie-Based SSR Sessions**: Use `@supabase/ssr` with secure HTTP-only cookies to handle authentication across Server Components, Server Actions, and Route Handlers.
4. **Defense in Depth**:
   - **Edge Protection**: Next.js Proxy (`src/proxy.ts`) verifies session validity and guards protected route groups.
   - **Server Logic Guards**: Server Actions and API routes must independently verify the authenticated user ID and role; never rely solely on edge proxy request interception.
   - **Application Query Boundary**: Prisma repositories and services must explicitly enforce user/tenant scoping on all data operations.
   - **Database Policies**: PostgreSQL Row-Level Security (RLS) acts as the database perimeter for Supabase client queries and storage.
5. **RBAC Discipline**: Validate permissions against defined role matrices (`security/rbac/`) before fulfilling administrative actions.
6. **Client & Helper Boundaries**: Supabase client factories for browser, Server Components, and Server Actions (`@supabase/ssr`) are defined exclusively in `src/lib/db/supabase.ts`. Authentication-specific helper functions (e.g. `getServerSession()`, `requireUser()`) reside in `src/lib/auth/` and consume those clients. Never create competing Supabase client factories in `src/lib/auth/`. Executable edge request interception resides strictly at `src/proxy.ts` (exporting function `proxy`). The root `security/` directory is strictly for documentation and specifications.

---

## Article VIII: Security
1. **Row-Level Security (Database Projects)**: For any project utilizing a database, every table must have `ENABLE ROW LEVEL SECURITY;` applied before shipping to production. Tables storing public data (e.g. public blogs, published products) must have explicit public-read policies; tables storing user, tenant, or sensitive data must enforce strict ownership filters. Never rely solely on application-layer filtering for client-accessible Supabase endpoints.
2. **Secret Isolation**:
   - Never expose `SUPABASE_SERVICE_ROLE_KEY`, database connection strings, or private API keys to the browser.
   - Only variables explicitly prefixed with `NEXT_PUBLIC_` may appear in client bundles.
3. **Input Sanitization & Output Encoding**: Protect against XSS, injection, and SSRF attacks across all form inputs and URL parameters.
4. **Security Headers**: Maintain strict HTTP security headers (Content Security Policy, HSTS, X-Frame-Options) in Next.js edge proxy (`src/proxy.ts`) and `next.config.ts`.
5. **Code Location Boundary**: Executable edge request interception must reside strictly at `src/proxy.ts` (Next.js 16+ convention). Executable RLS SQL migrations must reside strictly in `supabase/migrations/*.sql`. The root `security/` directory is reserved exclusively for security governance, access matrices, and specification documents.

---

## Article IX: Validation
*(Conditional: Applies when the application processes user-submitted data, form inputs, Server Actions, API requests, webhooks, or untrusted external input)*
1. **Untrusted Boundary Defense**: When an application endpoint or handler processes external, untrusted input (e.g. form submissions, Server Action arguments, external webhook payloads, or dynamic API route bodies/query parameters), validate the payload immediately using a strict Zod schema.
2. **No Overhead for Trusted/Static Values**: Zod validation is not required for static UI-only search params, compile-time constants, or internal trusted function calls where no untrusted external boundary is crossed.
3. **Co-located Validators**: Store reusable Zod schemas under `src/server/validators/` or adjacent to their respective domain modules.
4. **Fail Fast with Type-Safe Errors**: Reject malformed requests immediately with formatted, actionable validation errors before passing parameters to domain services or database queries.

---

## Article X: Testing Standards
1. **Canonical Testing Stack**:
   - **Unit & Integration Tests**: **Vitest** is the canonical default runner.
   - **End-to-End Tests**: **Playwright** is the canonical browser automation runner.
   - **Jest Policy**: Jest is supported *only* as an explicit project-level override documented in `brain.md` §15 and backed by an ADR in `decisions/records/`. Jest must never be installed alongside Vitest by default.
2. **Test Pyramid (Scaled to Active Features)**:
   - **Unit Tests (`testing/unit/`)**: Mandatory for all projects. Test pure domain logic, utility functions (`src/lib/utils/`), state stores, and custom hooks in complete isolation.
   - **Integration Tests (`testing/integration/`)**: Required when Server Actions, API route handlers, or database repositories exist. Test operations against a local test database or API mocks.
   - **End-to-End Tests (`testing/e2e/`)**: Test critical user flows (e.g. checkout, lead form submissions, core product workflows, or authentication) using Playwright.
3. **Regression Prevention**: Whenever fixing a bug, first write a failing test reproducing the issue, apply the fix, and verify that the test passes.
4. **Never Ship Broken Tests**: Run the test suite before declaring any task complete.

---

## Article XI: UI Quality & Design Polish
1. **Never Accept Bare/Generic Styling**: Every interface must look polished, intentional, and modern. Avoid default browser elements or generic unstyled placeholders.
2. **Curated Design Tokens**: Use consistent color palettes (e.g., Tailwind Zinc/Slate neutrals with a single brand accent), refined typography (Geist, Inter, Outfit), and harmonious spacing. When [`design-system/MASTER.md`](design-system/MASTER.md) exists, it is the canonical visual & interaction implementation system: use its tokens, typography, spacing, and component patterns; `design-system/pages/<page>.md` overrides govern their routes. The design system derives from `brain.md` §9 (brand intent) and remains strictly subordinate to it.
3. **State Completeness**: Every data-driven UI view must gracefully handle:
   - **Loading state**: Skeleton loaders or subtle spinners (no layout shifts).
   - **Empty state**: Informative illustrations/text with clear calls to action.
   - **Error state**: Actionable feedback with retry capabilities.
   - **Optimistic state**: Immediate visual feedback for mutations where appropriate.
4. **Accessibility Standards (a11y)**: All interfaces must adhere to WCAG AA contrast standards, provide full keyboard accessibility (tab navigation, focus trapping in dialogs/modals, arrow navigation in menus), use semantic HTML tags (`<main>`, `<nav>`, `<button>`, `<dialog>`), and apply appropriate ARIA roles and attributes wherever interactive behavior is not natively conveyed. Radix UI is a recommended default for accessible headless interactive primitives, but developers and AI agents may use another appropriate accessible headless/component library (e.g. React Aria, Headless UI) or well-crafted semantic HTML and standard Web APIs when justified.

---

## Article XII: Dependency Discipline
1. **Strict Scrutiny**: Before running `npm install <package>`, evaluate:
   - Is this natively supported by modern Web APIs or Next.js?
   - What is the bundle size impact?
   - Is the library actively maintained and TypeScript-native?
2. **No Redundant Libraries**: Never install overlapping packages (e.g., Axios when `fetch` is native; multiple icon sets; multiple date libraries).
3. **Pin and Audit**: Check for security advisories and avoid installing packages with unmaintained transitive dependencies.

---

## Article XIII: Documentation & Decision Records (ADRs)
1. **Self-Documenting Code**: Write clear, descriptive TypeScript identifiers and functions. Use comments exclusively to explain the "why", not the "what".
2. **Record Architectural Shifts**: Whenever introducing a new library, changing a data access pattern, or modifying security boundaries, create an ADR in `decisions/records/` using `decisions/templates/adr-template.md`.
3. **Keep Runbooks Fresh**: Document breaking operational procedures or database migration caveats in `documentation/runbooks/`.

---

## Article XIV: Git Practices & Branch Hygiene
1. **Atomic Commits**: Group changes into logical, focused units of work.
2. **Conventional Commits**: Format commit messages strictly:
   - `feat(auth): add passkey login support`
   - `fix(billing): resolve invoice rounding discrepancy`
   - `refactor(db): extract user repository from server action`
   - `docs(adr): record decision to adopt pgvector`
   - `wip(init): record interrupted initialization progress` *(initializer interruption checkpoints only)*
3. **Clean Worktrees**: Never commit temporary debug scripts, `.env.local` files, or OS artifacts.

---

## Article XV: Verification Before Claiming Completion
1. **Prove It Works**: Never claim a task is completed based on assumptions.
2. **Mandatory Checklist**:
   - [ ] TypeScript compiler passes without errors (`tsc --noEmit` or `next build`).
   - [ ] Linting rules pass without warnings.
   - [ ] Relevant unit/integration tests pass.
   - [ ] The feature has been visually or functionally inspected in the target environment.

---

## Article XVI: Handling Uncertainty
1. **Clarify Rather Than Assume**: If requirements, designs, or data models are ambiguous or contradictory, ask targeted clarifying questions.
2. **Provide Concrete Options**: When asking for clarification, propose 2-3 viable technical paths with their respective trade-offs and suggest a recommended default.

---

## Article XVII: Avoiding Destructive Changes
1. **Protect Data & History**:
   - **Never** execute destructive SQL (`DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, or unqualified `DELETE`) without explicit user permission.
   - **Never** force push (`git push -f`) or delete existing migration files that have already been applied to upstream environments.
   - **Never** delete production files or configuration secrets without direct confirmation.
2. **Safe Migration Defaults**: Always prefer non-breaking additive migrations (add nullable column, backfill data, add not-null constraint) over abrupt destructive schema rewrites.

---

## Article XVIII: AI Session Protocol
To eliminate context degradation, ensure long-term traceability, and guarantee smooth hand-offs across multi-turn sessions and agent transitions, every AI coding agent must follow this lifecycle protocol:

### 1. Session Start (Orientation & Ground Truth)
Before proposing or making any code changes:
- **Read Project Brain**: Read [`brain.md`](brain.md) Section 0 (*Template Defaults vs. Decisions*), Section 12 (*Current Project State*), and Section 15 (*Key Technical Assumptions & Stack Decisions*). Check the *Project Metadata* header for phase and staleness.
- **Read Architecture & Specifications**: Consult relevant technical blueprints in [`architecture/`](architecture/) (e.g. `database-migration-boundary.md`, `tooling-conventions.md`) and active feature contracts in [`specifications/`](specifications/).
- **Consult Recent Decisions**: Read the 3 most recent Architecture Decision Records in [`decisions/records/`](decisions/records/) to understand recently accepted choices, constraints, and trade-offs.
- **Inspect Repository Ground Truth**: Check active configuration files (`tsconfig.json`, `prisma/schema.prisma`, `supabase/config.toml`, `.env.example`) and inspect existing file implementations before assuming conventions or versions.

### 2. Session During (Continuous Context Preservation)
While executing tasks and solving problems:
- **Persist Discoveries Immediately**: Record technical findings, spike conclusions, and integration caveats into project documentation (`research/spikes/`, `documentation/runbooks/`, or `specifications/`) rather than leaving them in ephemeral conversation context.
- **Record Architectural Decisions**: If a new library is introduced, a boundary is adjusted, or an established convention is modified, draft an ADR in [`decisions/records/`](decisions/records/) following [`decisions/templates/adr-template.md`](decisions/templates/adr-template.md).
- **Maintain Modular Boundaries**: Strictly respect the separation of concerns between presentation (`src/components/`, `src/app/`), server logic (`src/server/`), persistence (`prisma/`), engine security (`supabase/migrations/`), and governance (`security/`).

### 3. Session End (Memory Synchronization & Hand-Off)
Before declaring any task or working session complete:
- **Update Project Brain State**: If milestones were achieved, constraints shifted, or immediate next steps changed, update Section 12 (*Current Project State*) in [`brain.md`](brain.md).
- **Update Metadata Header**: Update the `Last Updated`, `Updated By`, and `Current Phase` fields at the top of [`brain.md`](brain.md).
- **Synchronize Derived Documents**: If product strategy or scope shifted, update [`product/vision.md`](product/vision.md) to keep it in sync with `brain.md`.
- **Leave Repository in Recoverable State**: Verify that code passes compilation (`tsc --noEmit`), passes tests, and has no leftover debug scripts or untracked temporary files. Ensure git state is clean, truthful, and immediately actionable for the next developer or agent.

### 4. Context Recovery (Handling Loss or Handoff)
If conversation context is truncated, token limits are exhausted, or a new agent instance takes over:
- **Never Guess or Fabricate Past State**: Do not attempt to guess what was previously agreed upon from conversational fragments.
- **Re-orient from Persistent Storage**: Immediately re-read the Document Precedence Hierarchy in this Constitution, followed by `brain.md` (metadata, Section 0, Section 12, Section 15), and the 3 most recent ADRs.
- **Inspect Working Tree**: Inspect recently modified files and version control status to verify the exact state of work before resuming execution.
