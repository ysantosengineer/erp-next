# ERP Next — engineering case study

## Context

ERP Next is a portfolio product designed as commercial software rather than a collection of unrelated screens. Its central challenge was to make access control, purchasing, stock, sales, finance, and analytics agree on the same tenant and operational facts.

## Challenges and solutions

1. **Tenant isolation:** the authenticated context supplies `companyId`; services scope reads, writes, relations, and composite uniqueness to it.
2. **Stock consistency:** physical, reserved, and available quantities are separate. Ledger movements and balances change atomically.
3. **Concurrent operations:** transaction boundaries, state validation, and database constraints protect receipts, inventory approval, reservation, shipment, and settlement.
4. **Duplicate requests:** idempotency keys make the critical receiving, shipping, and settlement commands safe to retry.
5. **Historical accuracy:** commercial items store snapshots instead of depending only on mutable catalog values.
6. **Authorization:** NestJS guards enforce permissions; the frontend mirrors access for usability without becoming the security boundary.
7. **Session security:** short-lived access tokens combine with rotated, hashed refresh tokens in secure cookies.
8. **Traceability:** append-only operational records, audit events, request IDs, and structured logs make important changes explainable.
9. **Reliable delivery:** CI exercises static quality, unit tests, real PostgreSQL integration, E2E flows, builds, dependency audit, and the API image before production automation.

## Architectural decisions

- One monorepo keeps contracts, scripts, and quality gates coherent while web and API remain independently deployable.
- Modular NestJS services contain business workflows and call Prisma directly. A generic repository would add indirection without replacing Prisma's transaction semantics.
- PostgreSQL is the only operational source of truth. Dashboard results are calculated from persisted domain records, not sample constants.
- The stock ledger is immutable. Derived balances are optimized state but remain coupled transactionally to their movements.
- Multi-tenancy is row-based to keep the portfolio deployment economical while preserving explicit isolation rules.
- Production Swagger is disabled; local OpenAPI still supports development and verification.

## Trade-offs

- Process-local throttling is simple and adequate for one API instance, but horizontal scaling requires a shared Redis store.
- Manual finance avoids inventing accounting mappings, but commercial documents do not post titles automatically yet.
- A free-tier deployment is publicly demonstrable, but Render cold starts and provider quotas affect first-response latency.
- Row-level tenancy reduces infrastructure cost, while schema- or database-per-tenant could provide stronger physical isolation at greater operational cost.
- Append-only ledgers improve auditability, while full reversal workflows require additional compensating commands.
- Modular services move faster than strict ports-and-adapters here, while a future integration-heavy product may justify explicit adapters.

## Outcomes

The result is an end-to-end business system with 18 versioned migrations, broad automated coverage, reproducible CI, containerized API delivery, public health checks, and a responsive authenticated interface. More importantly, its workflows demonstrate invariants and failure handling that ordinary CRUD implementations omit.

## Lessons

- Domain status is not presentation metadata; it constrains every valid transition.
- Idempotency and concurrency should be designed with the workflow, not added after incidents.
- Tenant scope must be propagated automatically and tested negatively.
- Honest portfolio documentation is stronger when it distinguishes a implemented foundation from deferred commercial depth.

## 60-second pitch

ERP Next is a multi-tenant ERP I built with Next.js, NestJS, Prisma, and PostgreSQL. It connects purchasing, physical stock, sales reservation and shipment, manual finance, and management analytics. The interesting part is not the number of screens: critical operations are transactional, stock uses physical/reserved/available invariants, retryable commands are idempotent, permissions and tenant isolation are enforced in the API, and sensitive mutations are audited. GitHub Actions validates the system against real PostgreSQL and deploys the API, while Vercel, Render, and Neon provide a public demonstration. I documented the trade-offs instead of presenting deferred fiscal, accounting, and distributed-infrastructure features as complete.
