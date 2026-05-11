## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Platform MVP — build the foundational configuration layer that enables
all downstream manufacturing features (Routes, BOM, Cost Groups, Floor Control).
Without Methods, Work Centers, and Projected Entities, no other manufacturing feature
can function correctly.

**Resource Requirements:** Small focused backend team (2-3 engineers); frontend team
for master CRUD forms. Projected Entities is a prerequisite and should be delivered
first or in parallel with the first master.

### MVP Feature Set (Phase 1) — Current Sprint

**Core User Journeys Supported:** Journeys 1-5 (all mapped journeys)

**Must-Have Capabilities:**

- Projected Entities synchronization infrastructure (foundational — blocks all other features)
- Methods Master: full CRUD with GLOBAL + Override pattern, seed protection, RBAC
- Work Centers Master: full CRUD with GLOBAL + Override pattern, capacity fields, RBAC
- LookupField Search endpoints for all three features
- Company assignment flow post-create

### Post-MVP Features

**Phase 2 — Ingeniería de Procesos:**
- Routes (SBMAN-151)
- Machines (SBMAN-153)

**Phase 3 — Ingeniería de Producto:**
- Bill of Materials + BOM analysis + explosion queries (SBMAN-154–170)
- Activate/close dates (SBMAN-149)

### Risk Mitigation Strategy

**Technical Risks:**
- Dapr topic names must be confirmed with AccessManager, Inventory, Segment, ThirdParty
  teams before implementing subscription handlers. Mitigation: coordinate topic
  contracts early; use stub handlers during development.

**Dependency Risks:**
- `Siesa.BusinessUtilities.LookupFieldQueryBuilder` v0.0.5 must be available in the
  internal NuGet registry. Mitigation: verify package availability before sprint start.
- EF Core migrations for `*_prj` tables must exist before implementing handlers.

**Resource Risks:**
- If team capacity is reduced, Projected Entities infrastructure can be scoped to only
  the entities required by Methods and Work Centers in Phase 1
  (SEGM_CompanyPrj, SEGM_CostCenterPrj, INVT_StoragePrj, AMGR_UserPrj).
