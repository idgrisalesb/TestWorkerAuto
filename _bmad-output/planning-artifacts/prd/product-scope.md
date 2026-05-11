## Product Scope

### MVP — Minimum Viable Product

- **Feature: Projected Entities** (SBMAN-171) — foundational infrastructure; Methods
  and Work Centers depend on projected data for FK references (users, companies,
  cost centers, storages). Must be delivered first or in parallel.
  - Dapr Pub/Sub subscription endpoints per entity
  - Idempotent sync handlers (upsert/soft-delete)
  - Search endpoints (LookupField) per projected entity with correct IsActive and
    CompanyID filters
  - Reconciliation BackgroundService (startup + periodic)
- **Feature: Methods Master** (SBMAN-150) — GLOBAL + Override CRUD, seed protection,
  RBAC, LookupField Search endpoint for downstream consumers.
- **Feature: Work Centers Master** (SBMAN-152) — GLOBAL + Override CRUD with capacity
  parameters, rates (standard + simulation), substitute work centers, RBAC.

### Growth Features (Post-MVP)

- Routes (Ingeniería de Procesos — Rutas, SBMAN-151)
- Machines (SBMAN-153)
- Bill of Materials (Listas de Materiales, SBMAN-154)

### Vision (Future)

- Full manufacturing configuration domain completed (Costs, Floor Control, Fine
  Planning) per SBMAN roadmap.
