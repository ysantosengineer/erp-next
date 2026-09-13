# ERP Next demo script

Target duration: 3–4 minutes. Use a dedicated demo company and synthetic data. Never display environment variables, provider consoles, tokens, personal email, or browser password managers.

## Before recording

- Warm up the public API by opening the health endpoint.
- Confirm the demo user can access every screen in the route.
- Seed or prepare one supplier, customer, product, warehouse, and stock location.
- Close unrelated tabs and notifications; use a 16:9 viewport at readable zoom.
- Keep sensitive fields redacted and use plausible fictional business data.

## Narrative

**0:00–0:25 — Product context.** Open the dashboard. Explain that the product joins access, catalog, inventory, purchasing, sales, finance, and analytics under a company-scoped session.

**0:25–0:50 — Access control.** Briefly show users or roles. Point out that visibility improves usability, while API guards enforce the permission boundary.

**0:50–1:25 — Purchasing.** Open a purchase order and its receipt history. Explain partial/multiple receipt, idempotency, and the transaction that updates order quantities, movements, and physical balance together.

**1:25–2:05 — Inventory and sales.** Show the product balance, then a sales order. Explain physical, reserved, and available quantities. Demonstrate that reservation changes availability and shipment creates the physical stock exit.

**2:05–2:35 — Finance.** Show a payable or receivable and one partial settlement. Clarify that settlements are immutable and cash flow distinguishes forecast and realized values.

**2:35–3:05 — Analytics.** Return to the dashboard and reports, change the period, and connect indicators to persisted operational records.

**3:05–3:35 — Engineering.** Show the repository README or CI page: Next.js, NestJS, Prisma/PostgreSQL, multi-tenancy, RBAC, audit, tests with real PostgreSQL, Docker, and automated delivery.

**3:35–3:50 — Honest close.** Mention that fiscal/accounting automation, MFA, distributed throttling, advanced WMS, and automated backup validation are future work.

## Recording checklist

- The first frame explains the product without requiring narration.
- No loading spinner, cold-start failure, secret, or real customer data is visible.
- Each screen supports one sentence of the story; avoid exhaustive CRUD tours.
- Cursor movement is deliberate and audio names technical decisions accurately.
- End with the live URL and repository, then verify the exported video once.
