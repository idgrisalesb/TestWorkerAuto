---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - _bmad-output/shared-docs/Metodos.md
  - _bmad-output/shared-docs/Centros de Trabajo.md
  - _bmad-output/shared-docs/proyecciones.md
workflowType: 'prd'
lastStep: 0
briefCount: 0
researchCount: 0
brainstormingCount: 0
projectDocsCount: 3
---

# Product Requirements Document - Siesa-Agents

**Author:** SiesaTeam
**Date:** 2026-03-03

## Executive Summary

The **MfgStructure** service is the Manufacturing Structure microservice within the Siesa ERP ecosystem. This PRD defines the requirements for three foundational features of the manufacturing configuration domain: the **Methods Master**, the **Work Centers Master**, and the **Projected Entities** synchronization infrastructure.

These features form the backbone of the manufacturing module: Methods and Work Centers establish the core configuration data that drives production routing, costing, and capacity planning, while Projected Entities provides the event-driven synchronization layer that keeps local reference data consistent with upstream services (AccessManager, Inventory, Segment, ThirdParty) without tight coupling.

### What Makes This Special

The distinguishing design principle is the **GLOBAL + Override pattern** (MasterPattern library): master records are defined globally across the ERP but each company can independently override specific fields (description, use type, active status, rates) without duplicating data. This enables a multi-tenant architecture where a single master record serves all companies while respecting per-company operational differences.

The Projected Entities feature eliminates synchronous cross-service calls at query time by maintaining local projection tables populated through Dapr Pub/Sub events, with an idempotent reconciliation job as a safety net — a pattern that improves resilience and query performance while keeping referential integrity local.

## Project Classification

**Technical Type:** API Backend (microservice)
**Domain:** ERP — Manufacturing
**Complexity:** Medium-High (multi-tenant overrides, Dapr event-driven sync, concurrency control)
**Project Context:** Greenfield — new MfgStructure microservice
**Tech Stack:** .NET/C# · ASP.NET Core · PostgreSQL · EF Core · Dapr · GCP Pub/Sub

## Success Criteria

### User Success

ERP configuration administrators and manufacturing managers consider these features
successful when:

- A new Method can be created with Code, Name, and UseType in a single form submission,
  with real-time uniqueness validation on Code and automatic company assignment dialog
  presented on save.
- Company-specific overrides (Description, UseCode, IsActive) for Methods are editable
  per company without affecting other companies; NULL override values correctly inherit
  from the global base record.
- A Work Center can be configured with its capacity parameters (shifts, hours, speed,
  machines), associated to an Installation, Warehouse, Cost Center and Responsible, with
  company-level overrides for rates and operational fields.
- Projected entity data (users, companies, cost centers, storages, third parties) is
  available locally for LookupField selection without requiring synchronous calls to
  upstream services.
- All form validations are clear, actionable, and trigger at the right moment (on blur
  for uniqueness, on save for required fields).

### Business Success

- All acceptance criteria defined in functional documentation are verified and passing
  at delivery for each feature (Methods: AC-001–AC-017; Work Centers: equivalent
  coverage; Projected Entities: all 11 success criteria from the product brief).
- The immutable seed record `0001` (Method "Estándar") exists and is protected across
  all environments.
- RBAC permissions (`manufacturing.methods.*`, `manufacturing.work_centers.*`) are
  enforced at both frontend and backend layers.
- Features SBMAN-150 (Methods), SBMAN-152 (Work Centers), and SBMAN-171 (Projected
  Entities) are completed and closed in Jira.

### Technical Success

- Unit test coverage ≥ 80% on Projected Entities sync handlers, search services, and
  reconciliation logic (per product brief Section 7).
- Dapr Pub/Sub subscriptions register automatically at service startup with no manual
  intervention required.
- Projection sync handlers are idempotent: the same event delivered N times produces
  the same result as delivering it once.
- `tenantId` validation is enforced on every event handler; invalid tenant events are
  rejected without fatal errors.
- Concurrency conflicts on Methods and Work Centers are detected via PostgreSQL `xmin`
  and return a meaningful error to the user.
- The GLOBAL + Override pattern resolves correctly: NULL override fields inherit from
  the global base; non-NULL fields return the company-specific value.
- Reconciliation job executes on service startup and then on the configured interval
  (`Projections:ReconciliationIntervalMinutes`, default 60), logging results per entity.

### Measurable Outcomes

| Criterion | Target |
|-----------|--------|
| Acceptance criteria passing (Methods) | AC-001 to AC-017 — 100% |
| Acceptance criteria passing (Work Centers) | Equivalent AC set — 100% |
| Projected Entities success criteria | 11/11 from product brief |
| Unit test coverage (Projected Entities) | ≥ 80% |
| Concurrency conflict detection | Functional via xmin |
| Override resolution correctness | NULL = inherit, NOT NULL = override |
| Dapr subscription on startup | Automatic, 0 manual steps |

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

## User Journeys

### Journey 1: Carlos (Global ERP Administrator) — Onboarding a New Manufacturing Method

Carlos is the ERP platform administrator at a multi-company manufacturing group using
Siesa. The engineering team has just designed a new production method called "Lean
Assembly" that needs to exist globally before any company can use it in their Bills of
Materials and Routes. Carlos has been handed a one-pager from engineering with the
method's code, name, and intended use.

He opens the Methods master, clicks "Add", and types the 4-character code. The moment
he tabs away, the system validates uniqueness in real time — no waiting, no submitting
a broken form. He fills in the name, selects "Manufacturing and Costing" as the use
type, and saves. Immediately, a company assignment dialog appears. Carlos selects the
three companies that will initially use this method and confirms.

The breakthrough: within two minutes, a globally consistent method record exists,
already visible to every company in the ERP — and those three companies can immediately
start configuring their own override settings without Carlos touching anything else.

*This journey reveals requirements for:*
- Real-time uniqueness validation on Code (on blur)
- Create form with defaults (UseCode = ManufacturingAndCosting, IsActive = true)
- Immediate company assignment dialog post-save
- Global record visibility across all companies

---

### Journey 2: Valentina (Company Manufacturing Administrator) — Adapting a Work Center for Her Plant

Valentina manages manufacturing configuration for Compañía Norte, one of five companies
in the group. The global ERP team has created a Work Center called "Línea de Ensamble 1"
with standard parameters, but Norte's plant runs a different shift schedule and uses a
different cost center than the global default.

She opens Work Centers, finds the record, and selects her company context from the
context selector. The form shows the global (read-only) fields — Code and Name — and the
overridable fields pre-populated with the inherited global values. She changes the
shift count to 2 (instead of the global 3), updates the cost center via LookupField to
Norte's specific cost center, and saves.

The moment of relief: when the routing team at Compañía Norte builds their production
routes, they see "Línea de Ensamble 1" with Norte's shift structure — not the global
default. Meanwhile, the other four companies continue seeing their own configurations
undisturbed.

*This journey reveals requirements for:*
- Company context selector in edit mode
- Overridable fields: editable per company, inheriting global value when NULL
- Immutable fields (Code, Name): visible but read-only in company context
- LookupField for Cost Center, Installation, Warehouse (from projected entities)

---

### Journey 3: Andrés (Read-Only Consultant) — Auditing Method Assignments

Andrés is an external ERP consultant auditing the manufacturing configuration before
go-live. He has `read` permission only. He needs to verify that all methods are correctly
assigned to the right companies and that the seed record "0001 — Estándar" is protected.

He opens the Methods list, which loads paginated with Code, Name, UseType, and Status
columns. He filters by UseType = "Costing Only" to find any methods that shouldn't be
used in routing — the filter works instantly on the server. He clicks "View" on method
0001 and confirms it shows all fields as read-only. He tries to click "Edit" — the
button isn't there. He checks the company assignments via the list actions — no
"Delete" button appears for 0001 either.

Andrés finishes his audit confident that the system protects the immutable seed and
provides a clean filtered view for compliance review.

*This journey reveals requirements for:*
- List view with column filters (UseType, Status, Code, Name)
- View mode: all fields read-only
- Edit/Delete actions hidden or disabled based on RBAC
- No Delete action available for seed record 0001

---

### Journey 4: MfgStructure Service — Resolving a LookupField at Runtime

The Work Centers master form needs to display a Cost Center selector. When Valentina
opens the form, the LookupField component sends a search request to
`GET /projections/cost-centers/search?query=norte&companyId=...`. The endpoint uses
`LookupFieldQueryBuilder` to filter active cost centers visible to her company, joins
with the CostCenter overrides table to apply the CompanyID filter, and returns paginated
results within milliseconds — without calling the Segment service.

Valentina types "norte", sees "Centro de Costo Norte — CC-001" appear in the dropdown,
and selects it. No loading spinner, no cross-service latency, no failure risk from
Segment being temporarily unavailable.

The backstory: this works because three hours earlier, when the Segment service
published a `segmentos.costcenter.created` event, the MfgStructure Dapr subscription
handler received it, validated the tenantId, and upserted the record into
`segm_cost_centers_prj`. The reconciliation job had also run at service startup to
backfill any events missed during deployment.

*This journey reveals requirements for:*
- Dapr Pub/Sub subscription endpoint for each projected entity
- Idempotent upsert handler per entity type
- tenantId validation on every received event
- Search endpoint per projected entity with LookupFieldQueryBuilder
- CompanyID filtering via Override JOIN where applicable
- Reconciliation BackgroundService (startup + periodic interval)

---

### Journey 5: Felipe (Platform Engineer) — Diagnosing a Stale Projection

Felipe gets an alert: a Work Center form in production is showing an outdated cost
center name. He checks the MfgStructure logs and finds that the
`segmentos.costcenter.updated` event was delivered but the handler returned a 500 due
to a transient DB connection error. Because Dapr uses at-least-once delivery, the event
was retried and eventually succeeded — but a 20-minute gap existed.

Felipe checks the reconciliation job logs: the next scheduled run (60-minute interval)
had already corrected the stale record and logged "1 updated / 0 errors" for the
CostCenter entity. No manual intervention needed.

He adjusts the reconciliation interval to 30 minutes for the production environment via
`Projections:ReconciliationIntervalMinutes = 30` in the config and deploys. The gap
is now acceptable within SLA.

*This journey reveals requirements for:*
- Per-entity result logging in reconciliation job (updated / unchanged / error counts)
- Configurable reconciliation interval via appsettings
- At-least-once delivery idempotency (retry-safe handlers)
- Reconciliation triggered at service startup before first request is processed

---

### Journey Requirements Summary

| Capability Area | Revealed By |
|----------------|-------------|
| Real-time Code uniqueness validation | Journey 1 |
| Post-save company assignment dialog | Journey 1 |
| Company context selector in edit mode | Journey 2 |
| GLOBAL + Override field resolution | Journey 2 |
| LookupField for projected entities (Cost Center, Installation, etc.) | Journey 2, 4 |
| List filters by UseType, Status, Code, Name | Journey 3 |
| RBAC-driven UI action visibility | Journey 3 |
| Seed record protection (0001) | Journey 3 |
| Dapr event subscription + idempotent upsert handlers | Journey 4, 5 |
| tenantId validation per event | Journey 4 |
| LookupField Search endpoints with CompanyID/IsActive filters | Journey 4 |
| Reconciliation BackgroundService (startup + periodic) | Journey 4, 5 |
| Per-entity reconciliation logging | Journey 5 |
| Configurable reconciliation interval | Journey 5 |

---

## API Backend Specific Requirements

> Step 6 (Innovation Discovery): Skipped — no disruptive innovation signals detected.
> Project is a high-quality execution of established ERP and microservices patterns.

### Project-Type Overview

MfgStructure is an **API backend microservice** exposing RESTful JSON endpoints for
manufacturing configuration masters and event-driven projection synchronization. It
follows the Siesa platform conventions: versioned routes (`/api/v1/`), RBAC via
AccessManager tokens, and LookupField-compatible search contracts.

### Endpoint Specifications

#### Methods Master

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/methods` | Paginated list with filters (code, name, useCode, isActive) |
| GET | `/api/v1/methods/{id}` | Single record (global or company-resolved view) |
| POST | `/api/v1/methods` | Create new global method |
| PUT | `/api/v1/methods/{id}` | Update global fields (requires `update_global`) |
| DELETE | `/api/v1/methods/{id}` | Delete (blocked if dependencies exist or IsImmutable) |
| POST | `/api/v1/methods/{id}/assign` | Assign method to one or more companies |
| PUT | `/api/v1/methods/{id}/companies/{companyId}` | Update company override |
| GET | `/api/v1/methods/search` | LookupField search (consumed by Routes, BOM, Cost Groups) |

#### Work Centers Master

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/work-centers` | Paginated list with filters |
| GET | `/api/v1/work-centers/{id}` | Single record (global or company-resolved view) |
| POST | `/api/v1/work-centers` | Create new global work center |
| PUT | `/api/v1/work-centers/{id}` | Update global fields (requires `update_global`) |
| DELETE | `/api/v1/work-centers/{id}` | Delete (blocked if dependencies exist) |
| POST | `/api/v1/work-centers/{id}/assign` | Assign to companies |
| PUT | `/api/v1/work-centers/{id}/companies/{companyId}` | Update company override |
| GET | `/api/v1/work-centers/search` | LookupField search (consumed by Routes) |

#### Projected Entities

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/events/projections/user-updated` | Dapr [Topic] — sync AMGR_UserPrj |
| POST | `/events/projections/company-updated` | Dapr [Topic] — sync SEGM_CompanyPrj |
| POST | `/events/projections/cost-center-updated` | Dapr [Topic] — sync SEGM_CostCenterPrj |
| POST | `/events/projections/storage-updated` | Dapr [Topic] — sync INVT_StoragePrj |
| POST | `/events/projections/third-party-updated` | Dapr [Topic] — sync TPRT_ThirdPartyPrj |
| *(one endpoint per entity × action)* | | |
| GET | `/api/v1/projections/users/search` | LookupField search — AMGR_UserPrj |
| GET | `/api/v1/projections/companies/search` | LookupField search — SEGM_CompanyPrj |
| GET | `/api/v1/projections/cost-centers/search` | LookupField search — SEGM_CostCenterPrj |
| GET | `/api/v1/projections/storages/search` | LookupField search — INVT_StoragePrj |
| GET | `/api/v1/projections/third-parties/search` | LookupField search — TPRT_ThirdPartyPrj |
| *(one search endpoint per projected entity)* | | |

### Authentication & Authorization Model

- **Token type:** Bearer JWT issued by AccessManager
- **RBAC enforcement:** Server-side on every operation; frontend mirrors visibility only
- **Permission namespace:** `manufacturing.{resource}.{action}`
- **Multi-tenant isolation:** `companyId` resolved from session context; events validated
  via `tenantId` field in Dapr event payload

### Data Schemas

- **Request/Response format:** JSON
- **ID type:** UUID v7 (`Guid.CreateVersion7()`) for all primary keys
- **Timestamps:** `DateTimeOffset` (ISO 8601 with timezone)
- **Enumerations:** transmitted as `smallint` codes with documented value mappings
- **Override resolution:** NULL field value = inherit from global base; NOT NULL = use
  company-specific override

### API Versioning

- **Strategy:** URL path prefix — `/api/v1/`
- **Breaking changes:** new major version prefix; old version maintained for one release

### Error Codes

| Scenario | HTTP Status | Message Pattern |
|----------|-------------|-----------------|
| Validation failure | 400 | Field-level errors array |
| Unauthorized | 401 | Standard bearer token error |
| Forbidden (RBAC) | 403 | `"No tiene acceso a {operation}"` |
| Not found | 404 | Resource not found |
| Dependency conflict (delete) | 409 | `"El {entity} existe en {dependency}. No se puede eliminar"` |
| Concurrency conflict (xmin) | 409 | `"El {entity} ha sido modificado por otro usuario"` |
| Immutable record | 422 | `"Los {entities} con código {code} no se pueden {operation}"` |

---

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

---

## Functional Requirements

### feature — Métodos

- FR1: A global administrator can create a Method with a unique 4-character code, name,
  use type, and active status.
- FR2: The system validates Method code uniqueness in real time when the user leaves the
  code field (on blur), before form submission.
- FR3: Upon successful Method creation, the system presents a company assignment dialog
  allowing the administrator to assign the new Method to one or more of their authorized
  companies.
- FR4: A global administrator can edit the global base fields of an existing Method
  (name, description, use type, active status); the code field is read-only after
  creation.
- FR5: A company administrator can edit the overridable fields of a Method
  (description, use type, active status) scoped to their company, without affecting
  other companies.
- FR6: NULL override values on a Method inherit the corresponding global base value;
  the system resolves the effective value automatically.
- FR7: A global administrator can assign or unassign a Method to/from one or more
  companies.
- FR8: A user can delete a Method only when it has no dependencies in Cost Groups,
  Bill of Materials, or Routes; the system returns a descriptive error when dependencies
  exist.
- FR9: The system prevents modification and deletion of the seed Method record
  (code `0001`), returning a descriptive error for any such attempt.
- FR10: A user can view a paginated list of Methods filtered by code, name, use type,
  and active status, sortable by any column.
- FR11: The system exposes a LookupField-compatible Search endpoint for Methods,
  filtering by company visibility and active status, consumable by Routes, BOM, and
  Cost Groups.
- FR12: The system enforces RBAC permissions (`manufacturing.methods.*`) on every
  Method operation at the backend layer.
- FR13: The system detects concurrent edit conflicts on Methods using PostgreSQL `xmin`
  and returns a descriptive conflict error to the user.

### feature — Centros de Trabajo

- FR14: A global administrator can create a Work Center with code, name, capacity
  parameters (shifts, hours per shift, speed, number of machines), and associations to
  an Installation, Warehouse, Cost Center, and Responsible person.
- FR15: A global administrator can define standard and simulation cost rates for a Work
  Center at the global level.
- FR16: A company administrator can override the overridable fields of a Work Center
  (description, capacity parameters, rates, active status) scoped to their company.
- FR17: NULL override values on a Work Center inherit the corresponding global base
  value; the system resolves the effective value automatically.
- FR18: A global administrator can assign substitute Work Centers (from the same
  Installation) to a Work Center.
- FR19: A user can delete a Work Center only when it has no dependencies in Routes or
  Production Orders; the system returns a descriptive error when dependencies exist.
- FR20: A user can view a paginated list of Work Centers filtered by code, name,
  installation, and active status, sortable by any column.
- FR21: The system exposes a LookupField-compatible Search endpoint for Work Centers,
  filtering by company visibility and active status, consumable by Routes.
- FR22: The system enforces RBAC permissions (`manufacturing.work_centers.*`) on every
  Work Center operation at the backend layer.
- FR23: The system detects concurrent edit conflicts on Work Centers using PostgreSQL
  `xmin` and returns a descriptive conflict error to the user.
- FR24: A global administrator can assign or unassign a Work Center to/from one or
  more companies.

### feature — Entidades Proyectadas

- FR25: The service automatically registers Dapr Pub/Sub subscriptions for all required
  projected entity topics at startup, with no manual configuration required.
- FR26: The system processes each incoming Dapr event by performing an idempotent upsert
  (or soft-delete) on the corresponding local projection table.
- FR27: The system validates the `tenantId` on every incoming Dapr event and rejects
  events with an invalid or mismatched tenant without crashing the service.
- FR28: Projection sync handlers are idempotent: delivering the same event N times
  produces the same result as delivering it once.
- FR29: The system runs a reconciliation BackgroundService at service startup and then
  periodically at a configurable interval, comparing local projection tables with the
  source-of-truth from origin services via Dapr Service Invocation.
- FR30: The reconciliation job logs the result per projected entity per execution
  (records updated, records unchanged, errors).
- FR31: The reconciliation interval is configurable via application settings
  (`Projections:ReconciliationIntervalMinutes`).
- FR32: The system exposes a LookupField-compatible Search endpoint for each projected
  entity, applying `IsActive` and `CompanyID` filters as specified per entity.
- FR33: For projected entities without a direct `company_id` field, the Search endpoint
  applies CompanyID filtering via a JOIN with the corresponding Override table.
- FR34: The system does not expose CRUD endpoints for projected entities; they are
  read-only from the perspective of MfgStructure.
- FR35: Projected entity Search endpoints return paginated, filterable results
  compatible with the LookupField component contract.

### Access Control

- FR36: The system enforces all RBAC permission checks server-side on every API
  operation; frontend visibility is a UX aid only and is not a security boundary.
- FR37: Users can only operate on companies they are authorized for; the system
  resolves the user's company scope from their session context.
- FR38: The `update_global` permission is required to modify immutable fields (Code,
  Name) on any master record; standard `update` permission covers only overridable
  fields in company context.

---

## Non-Functional Requirements

### Performance

- List endpoints (Methods, Work Centers) must return the first page of results within
  **500ms** under normal load conditions.
- LookupField Search endpoints must return results within **300ms** to avoid degrading
  the form interaction experience.
- Dapr event handlers must complete processing (upsert to DB) within **2 seconds** per
  event to avoid Dapr timeout and unnecessary retries.

### Security

- All API endpoints require a valid Bearer JWT token issued by AccessManager; requests
  without a valid token return HTTP 401.
- RBAC is enforced server-side on every operation; the backend never trusts
  frontend-reported permissions.
- `tenantId` from Dapr event payloads is validated on every handler; mismatched tenant
  events are rejected with HTTP 400 and logged, without exposing internal error details.
- Sensitive fields (tokens, secrets) are never logged; only entity keys and operation
  results appear in reconciliation logs.

### Reliability

- Projection sync handlers must be idempotent to tolerate Dapr at-least-once delivery
  without data corruption.
- Concurrent modification conflicts on master records are detected via PostgreSQL `xmin`
  optimistic locking; no silent data overwrites are permitted.
- The reconciliation BackgroundService must complete its startup execution before the
  service begins processing the first external request, ensuring projections are current
  at launch.
- If the reconciliation job fails for a specific entity, it must log the error and
  continue processing remaining entities without aborting the full job.

### Integration

- All LookupField Search endpoints must conform to the `Siesa.BusinessUtilities
  .LookupFieldQueryBuilder` v0.0.5 response contract (paginated, filterable results).
- Dapr Pub/Sub topic names follow the platform convention `{service}.{entity}.{action}`;
  exact names must be confirmed with each origin service team before implementation.
- Dapr Service Invocation used by the reconciliation job must handle transient failures
  with retry logic; permanent failures are logged per entity without crashing the job.
- The service must register its Dapr subscriptions via `app.MapSubscribeHandler()` and
  component YAML files; manual sidecar configuration is not acceptable.
