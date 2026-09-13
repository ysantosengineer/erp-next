# Architecture overview

## System context

```mermaid
flowchart LR
  User[Business user] --> Web[Next.js web app]
  Web -->|REST / JSON| API[NestJS API]
  API --> DB[(PostgreSQL)]
  CI[GitHub Actions] --> Web
  CI --> API
  CI -->|Prisma migrations| DB
```

The frontend and API are independently deployable parts of one npm workspace. NestJS modules own validation and business rules; services use Prisma inside explicit transactions where a workflow changes related aggregates. PostgreSQL is the source of truth.

## Modular backend

```mermaid
flowchart TB
  Auth[Auth and session] --> Access[Users, roles, permissions]
  Access --> Catalog[Categories, units, partners, products]
  Catalog --> Inventory[Warehouses, balances, movements, inventory]
  Inventory --> Purchasing[Purchase orders and receipts]
  Inventory --> Sales[Sales orders and shipments]
  Purchasing --> Finance[Payables and receivables]
  Sales --> Finance
  Finance --> Analytics[Dashboard and reports]
  Inventory --> Analytics
  Audit[Audit log] -. sensitive mutations .-> Access
  Audit -.-> Catalog
  Audit -.-> Inventory
  Audit -.-> Purchasing
  Audit -.-> Sales
  Audit -.-> Finance
```

The arrows express business dependency, not direct database access between UI screens. Automated financial posting from purchasing and sales is deliberately not implemented yet.

## Purchasing and stock

```mermaid
sequenceDiagram
  actor Buyer
  participant PO as Purchase order
  participant Receipt as Purchase receipt
  participant Stock as Stock service
  participant DB as PostgreSQL
  Buyer->>PO: Create and approve order
  Buyer->>Receipt: Receive partial or remaining quantity
  Receipt->>DB: Start transaction and lock state
  Receipt->>Stock: Append ENTRY movements
  Stock->>DB: Update physical balances
  Receipt->>DB: Update received quantities and status
  DB-->>Buyer: Commit receipt atomically
```

## Sales reservation and shipment

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Confirmed: confirm
  Confirmed --> Reserved: reserve full quantity
  Reserved --> Confirmed: release
  Reserved --> Shipped: ship and append stock exit
  Draft --> Cancelled: cancel
  Confirmed --> Cancelled: cancel
  Reserved --> Cancelled: release and cancel
  Shipped --> [*]
  Cancelled --> [*]
```

Physical quantity changes only on shipment. Reservation changes committed availability while preserving the physical balance.

## Inventory invariant

```mermaid
flowchart LR
  Physical[Physical quantity] --> Formula[Available = physical - reserved]
  Reserved[Reserved quantity] --> Formula
  Entry[ENTRY / positive adjustment] --> Physical
  Exit[EXIT / negative adjustment] --> Physical
  Sale[Sales reservation] --> Reserved
```

Movements are append-only. Balance updates and their ledger movement occur in the same transaction.

## Finance

```mermaid
flowchart LR
  Entry[Manual payable or receivable] --> Open[Open balance]
  Open --> Partial[Partial settlement]
  Partial --> Open
  Open --> Paid[Final settlement]
  Entry --> Forecast[Forecast cash flow]
  Partial --> Realized[Realized cash flow]
  Paid --> Realized
```

Settlements are immutable and idempotent. Reversals and automatic entries from commercial documents are future work.

## Authorization

```mermaid
sequenceDiagram
  actor User
  participant Guard as JWT guard
  participant RBAC as Permission guard
  participant Service
  User->>Guard: Access token
  Guard->>Guard: Validate identity and active company
  Guard->>RBAC: Authenticated context
  RBAC->>RBAC: Match required permission
  RBAC->>Service: Authorized company context
  Service-->>User: Company-scoped result
```

The UI hides actions the session cannot perform, but the API guard remains the security boundary.

## Multi-tenancy

```mermaid
flowchart TB
  Request[Authenticated request] --> Context[companyId from trusted JWT context]
  Context --> Service[Domain service]
  Service --> Filter[Prisma where: companyId]
  Service --> Create[Prisma data: companyId]
  Filter --> TenantData[(Tenant-scoped rows)]
  Create --> TenantData
  Constraint[Composite unique constraints] --> TenantData
```

Clients cannot choose another tenant through query or body fields. Business records carry `companyId`, queries filter it, relations are checked in the same scope, and uniqueness is generally composite per company.

## Delivery

```mermaid
flowchart LR
  Commit[Push or pull request] --> CI[GitHub Actions CI]
  CI --> Quality[Lint, format, types, unit tests, build]
  CI --> Integration[PostgreSQL integration and E2E]
  CI --> Image[API Docker image build]
  CI -->|main succeeds| Deploy[Production workflow]
  Deploy --> Migrate[Prisma migrate deploy / Neon]
  Migrate --> Render[Render API deploy hook]
  Render --> Smoke[Health and readiness smoke tests]
  Vercel[Vercel web deployment] --> Smoke
```

## Simplified data model

```mermaid
erDiagram
  COMPANY ||--o{ USER : owns
  COMPANY ||--o{ ROLE : defines
  USER }o--o{ ROLE : receives
  ROLE }o--o{ PERMISSION : grants
  COMPANY ||--o{ PRODUCT : owns
  COMPANY ||--o{ WAREHOUSE : owns
  WAREHOUSE ||--o{ STOCK_LOCATION : contains
  PRODUCT ||--o{ INVENTORY_BALANCE : has
  STOCK_LOCATION ||--o{ INVENTORY_BALANCE : stores
  PURCHASE_ORDER ||--o{ PURCHASE_ORDER_ITEM : contains
  PURCHASE_ORDER ||--o{ PURCHASE_RECEIPT : receives
  SALES_ORDER ||--o{ SALES_ORDER_ITEM : contains
  FINANCIAL_ENTRY ||--o{ FINANCIAL_SETTLEMENT : settles
```

For field-level detail, use the Prisma schema and [database documentation](04-modelagem-banco.md).
