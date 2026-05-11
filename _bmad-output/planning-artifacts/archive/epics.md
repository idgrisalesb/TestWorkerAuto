---
stepsCompleted: [1, 2, 3]
storiesStatus: epic-1-complete
inputDocuments:
  - _bmad-output/planning-artifacts/prd/index.md
  - _bmad-output/planning-artifacts/prd/feature-entidades-proyectadas.md
  - _bmad-output/planning-artifacts/prd/feature-metodos.md
  - _bmad-output/planning-artifacts/prd/feature-centros-de-trabajo.md
  - _bmad-output/planning-artifacts/prd/non-functional-requirements.md
  - _bmad-output/planning-artifacts/architecture.md
featureOrder:
  - Entidades Proyectadas
  - Métodos
  - Centros de Trabajo
---

# MfgStructure (Siesa-Agents) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for MfgStructure (Siesa-Agents), decomposing the requirements from the PRD and Architecture into implementable stories organized by feature.

Features are organized in the following order: Entidades Proyectadas → Métodos → Centros de Trabajo. Epic numbering is global and consecutive across all features.

## Requirements Inventory

### Functional Requirements

**Feature: Entidades Proyectadas (FR25–FR35)**

- FR25: The service automatically registers Dapr Pub/Sub subscriptions for all required projected entity topics at startup, with no manual configuration required.
- FR26: The system processes each incoming Dapr event by performing an idempotent upsert (or soft-delete) on the corresponding local projection table.
- FR27: The system validates the `tenantId` on every incoming Dapr event and rejects events with an invalid or mismatched tenant without crashing the service.
- FR28: Projection sync handlers are idempotent: delivering the same event N times produces the same result as delivering it once.
- FR29: The system runs a reconciliation BackgroundService at service startup and then periodically at a configurable interval, comparing local projection tables with the source-of-truth from origin services via Dapr Service Invocation.
- FR30: The reconciliation job logs the result per projected entity per execution (records updated, records unchanged, errors).
- FR31: The reconciliation interval is configurable via application settings (`Projections:ReconciliationIntervalMinutes`).
- FR32: The system exposes a LookupField-compatible Search endpoint for each projected entity, applying `IsActive` and `CompanyID` filters as specified per entity.
- FR33: For projected entities without a direct `company_id` field, the Search endpoint applies CompanyID filtering via a JOIN with the corresponding Override table.
- FR34: The system does not expose CRUD endpoints for projected entities; they are read-only from the perspective of MfgStructure.
- FR35: Projected entity Search endpoints return paginated, filterable results compatible with the LookupField component contract.

**Feature: Métodos (FR1–FR13)**

- FR1: A global administrator can create a Method with a unique 4-character code, name, use type, and active status.
- FR2: The system validates Method code uniqueness in real time when the user leaves the code field (on blur), before form submission.
- FR3: Upon successful Method creation, the system presents a company assignment dialog allowing the administrator to assign the new Method to one or more of their authorized companies.
- FR4: A global administrator can edit the global base fields of an existing Method (name, description, use type, active status); the code field is read-only after creation.
- FR5: A company administrator can edit the overridable fields of a Method (description, use type, active status) scoped to their company, without affecting other companies.
- FR6: NULL override values on a Method inherit the corresponding global base value; the system resolves the effective value automatically.
- FR7: A global administrator can assign or unassign a Method to/from one or more companies.
- FR8: A user can delete a Method only when it has no dependencies in Cost Groups, Bill of Materials, or Routes; the system returns a descriptive error when dependencies exist.
- FR9: The system prevents modification and deletion of the seed Method record (code `0001`), returning a descriptive error for any such attempt.
- FR10: A user can view a paginated list of Methods filtered by code, name, use type, and active status, sortable by any column.
- FR11: The system exposes a LookupField-compatible Search endpoint for Methods, filtering by company visibility and active status, consumable by Routes, BOM, and Cost Groups.
- FR12: The system enforces RBAC permissions (`manufacturing.methods.*`) on every Method operation at the backend layer.
- FR13: The system detects concurrent edit conflicts on Methods using PostgreSQL `xmin` and returns a descriptive conflict error to the user.

**Feature: Centros de Trabajo (FR14–FR24, FR-CALC, FR-FORM)**

- FR14: A global administrator can create a Work Center with: Code (unique, varchar 50), Name (varchar 250), ShortName (varchar 50, auto-filled from Name), and associations to Installation (StorageGroupID, required), Warehouse (StorageID, optional), Cost Center (CostCenterID, required), Responsible (ThirdPartyManagerID, optional), BurdenCode.
- FR14a: On Name blur, if ShortName is empty, the system auto-fills ShortName with the leading characters of Name.
- FR14b: When StorageGroupID changes, StorageID must be cleared. StorageID is only enabled when StorageGroupID has a value.
- FR14c: StorageID must belong to the same Installation as StorageGroupID. If StorageID and CostCenterID are both set, their operational unit (C.O.) must match.
- FR14d: After successful creation, the system automatically presents the Company Assignment dialog to assign the work center to one or more companies.
- FR15: A global administrator can define standard (RateType=0) and simulation (RateType=1) cost rates for a work center. Each rate has: RateNumber (sequential), RateBurdenCode (EnumRateBurdenCode), Rate (decimal), PercentageRateNumber (reference), CostSegmentID (FK to cost segments). Unique index on (work_center_id, rate_type, rate_number).
- FR15a: Rate validation rules: (1) NoAplica(-1) → rate=0, no segment. (2) BurdenCodes 0–10 → PercentageRateNumber=0, segment required. (3) PorcentajeLinea(11) → not first rate; references a prior rate; segment required; cannot follow PorcentajeTodas. (4) PorcentajeTodas(12) → only one allowed; segment required. (5) Rate ≠ 0 unless NoAplica. (6) Percentage burden codes → rate < 999. (7) If segment has NIIF=0 → rate ≥ 0.
- FR16: A company administrator can override any `IsOverridable` field of a work center scoped to their company.
- FR17: A NULL value in `work_centers_overrides` for any overridable field means the company inherits the global base value.
- FR18: A global administrator can assign substitute work centers (AlternateWorkCenter) to a work center. Substitutes must belong to the same Installation. A work center cannot be its own substitute. No duplicate pairs allowed.
- FR19: A user can delete a work center only when it has no references in: `machines` table, `routing_operations` table, or `alternate_work_centers` (as a substitute). On successful deletion, associated rates and company override records are also deleted.
- FR20: The system exposes a paginated list of work centers filterable by: Code, Name, Installation, IsActive, IsCritical, BurdenCode. Default sort: Code ASC. Column-header sorting supported.
- FR21: The system exposes a LookupField-compatible `/search` endpoint for work centers, filtering by company visibility and `is_active=true`.
- FR22: All work center operations are gated by RBAC permissions validated against Access Manager before execution. Permission set: `manufacturing.work_centers.*` and `manufacturing.work_center_rates.*`.
- FR23: Concurrent edit conflicts on work centers are detected using PostgreSQL `xmin`. Force/Cancel options provided on conflict.
- FR24: A global administrator can assign or unassign a work center to/from one or more companies via the Company Assignment dialog.
- FR-CALC-1: `NumberOfMachines` is calculated server-side as the count of active machines linked to the work center. Read-only in the UI.
- FR-CALC-2: `MachineSpeedFactor = Round(Sum(MachineSpeed × AverageEfficiency / 100) / StandardSpeed, 2)` for active machines. If no active machines, factor = 1.
- FR-CALC-3: Display-only calculated fields: HoursPerDay = NumberOfShifts × HoursPerShift; DailyCapacity = MachineSpeedFactor × HoursPerDay; AvailableCapacity = DailyCapacity × (AveragePerformance/100) × (DesiredLoadPercentage/100).
- FR-FORM-1: Create mode: no company selector; record saved to global `work_centers` table.
- FR-FORM-2: Edit mode — GLOBAL context (requires `update_global`): Code, Name, ShortName are editable.
- FR-FORM-3: Edit mode — Company context (requires `update`): Code, Name, ShortName shown read-only; overridable fields editable.
- FR-FORM-4: View (read-only) mode: all fields disabled. Requires `manufacturing.work_centers.read`.

### NonFunctional Requirements

- NFR1: List endpoints (Methods, Work Centers) must return results within 500ms under normal load.
- NFR2: LookupField Search endpoints must return results within 300ms.
- NFR3: Dapr event handlers must complete processing within 2 seconds per event.
- NFR4: All API endpoints require a valid Bearer JWT token issued by AccessManager; no token → HTTP 401.
- NFR5: RBAC enforced server-side on every operation; backend never trusts frontend-reported permissions.
- NFR6: `tenantId` from Dapr event payloads validated on every handler; mismatched tenant → HTTP 400 + logged warning, no crash.
- NFR7: Projection sync handlers must be idempotent to tolerate Dapr at-least-once delivery without data corruption.
- NFR8: Concurrent modification conflicts on master records detected via PostgreSQL `xmin` optimistic locking; no silent data overwrites.
- NFR9: Reconciliation BackgroundService must complete startup execution before service begins processing the first external request.
- NFR10: If reconciliation job fails for a specific entity, it must log the error and continue processing remaining entities without aborting the full job.

### Additional Requirements

- **Solution Scaffold (Epic 1 Story 1):** Greenfield .NET 10 microservice with Clean Architecture — `dotnet new` commands create solution + 4 projects (API, Application, Domain, Infrastructure).
- `Siesa.MasterPattern v0.1.3` — `BaseMasterService<T>` placed in Application layer for Methods and Work Centers override resolution.
- `Siesa.BusinessUtilities.LookupFieldQueryBuilder v0.0.5` — exact pin, used by both masters and all 9 projected entity Search endpoints.
- UUID v7 (`Guid.CreateVersion7()`) for all PKs; PostgreSQL 18+ native `uuidv7()` in migration defaults.
- `DateTimeOffset` mandatory for all timestamps (never `DateTime`); ISO 8601 with timezone in API responses.
- EF Core 10 + Npgsql for standard CRUD; linq2db for LookupField `/search` endpoints; LinqKit for composable predicates.
- Dapr sidecar: GCP Pub/Sub broker via `pubsub.yaml`; Service Invocation for reconciliation; subscriptions via `app.MapSubscribeHandler()`.
- Problem Details RFC 7807 for all errors; field-level validation errors array on HTTP 400; Spanish error messages.
- GitHub Packages (SiesaTeams org) with PAT (`read:packages`) for internal `Siesa.*` NuGet packages.
- Docker compose mandatory for local dev: PostgreSQL 18, Redis 8-alpine, Dapr Placement v1.16.9.
- **Implementation sequence:** Docker → Solution scaffold → `*_prj` migrations → Projected Entities → Methods → Work Centers.
- Audit fields: `CreatedByUserID`, `UpdatedByUserID` FK to `amgr_users_prj` on all local entities.

### FR Coverage Map

| FR | Epic | Theme |
|----|------|-------|
| FR25 | Epic 1 | Dapr Pub/Sub subscription registration |
| FR26 | Epic 1 | Idempotent upsert handler |
| FR27 | Epic 1 | tenantId validation |
| FR28 | Epic 1 | Handler idempotency |
| FR29 | Epic 1 | Reconciliation BackgroundService |
| FR30 | Epic 1 | Reconciliation logging |
| FR31 | Epic 1 | Reconciliation interval config |
| FR32 | Epic 1 | LookupField Search endpoints for projected entities |
| FR33 | Epic 1 | CompanyID filtering via JOIN with Override table |
| FR34 | Epic 1 | No CRUD endpoints on projected entities |
| FR35 | Epic 1 | Paginated LookupField response contract |
| FR1 | Epic 2 | Method create |
| FR2 | Epic 2 | Code uniqueness real-time validation |
| FR3 | Epic 2 | Company assignment dialog post-create |
| FR4 | Epic 2 | Global admin edit base fields |
| FR5 | Epic 2 | Company admin override fields |
| FR6 | Epic 2 | NULL override inherits global |
| FR7 | Epic 2 | Assign/unassign companies |
| FR8 | Epic 2 | Delete with dependency validation |
| FR9 | Epic 2 | Seed record protection |
| FR10 | Epic 2 | Paginated list with filters |
| FR11 | Epic 2 | LookupField Search endpoint |
| FR12 | Epic 2 | RBAC enforcement |
| FR13 | Epic 2 | xmin concurrency detection |
| FR14 | Epic 3 | Work Center create with associations |
| FR14a | Epic 3 | ShortName auto-fill on blur |
| FR14b | Epic 3 | StorageID cleared on StorageGroupID change |
| FR14c | Epic 3 | StorageID/CostCenter operational unit match |
| FR14d | Epic 3 | Company assignment dialog post-create |
| FR16 | Epic 3 | Company override of IsOverridable fields |
| FR17 | Epic 3 | NULL override inherits global |
| FR19 | Epic 3 | Delete with dependency validation |
| FR20 | Epic 3 | Paginated list with filters |
| FR21 | Epic 3 | LookupField Search endpoint |
| FR22 | Epic 3 | RBAC enforcement |
| FR23 | Epic 3 | xmin concurrency detection + Force/Cancel |
| FR24 | Epic 3 | Assign/unassign companies |
| FR-FORM-1 | Epic 3 | Create mode form |
| FR-FORM-2 | Epic 3 | Edit mode — GLOBAL context |
| FR-FORM-3 | Epic 3 | Edit mode — Company context |
| FR-FORM-4 | Epic 3 | View (read-only) mode |
| FR15 | Epic 4 | Standard & simulation cost rates |
| FR15a | Epic 4 | Rate grid validation rules (7 rules) |
| FR18 | Epic 4 | Substitute Work Center assignment |
| FR-CALC-1 | Epic 4 | NumberOfMachines server-side calculation |
| FR-CALC-2 | Epic 4 | MachineSpeedFactor calculation |
| FR-CALC-3 | Epic 4 | Display-only capacity calculated fields |

## Epic List

## Entidades Proyectadas

### Epic 1: Projected Entities Synchronization Infrastructure

Deliver the complete Dapr Pub/Sub synchronization infrastructure inside MfgStructure: solution scaffold, EF Core projection table migrations, idempotent sync handlers for all 14 projected entities, LookupField Search endpoints, and a periodic reconciliation BackgroundService. This epic is the mandatory prerequisite that unblocks all other features.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E1.1:** The service starts successfully and all 14 projection tables are populated with current data before the first external request is served.
- [ ] **AC-E1.2:** When an origin service publishes an event (created/updated/status_changed/deleted), the corresponding local projection table reflects the change within 5 seconds.
- [ ] **AC-E1.3:** Events with an invalid or mismatched tenant are silently rejected (logged) without crashing the service or corrupting local data.
- [ ] **AC-E1.4:** Downstream features (Methods, Work Centers) can successfully look up projected entities (Companies, StorageGroups, CostCenters, etc.) via the Search endpoints with correct filtering by company and active status.
- [ ] **AC-E1.5:** After a restart following downtime, the service automatically recovers projection consistency via the reconciliation job, with no manual intervention required.

**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35

#### Story 1.1: Solution Scaffold & Infrastructure Setup

As a developer,
I want the MfgStructure .NET 10 solution scaffolded with Clean Architecture layers, all required NuGet packages, and Docker compose running,
So that the team has a working, buildable baseline before any feature code is written.

**Acceptance Criteria:**

**Given** no solution exists
**When** the developer runs the scaffold commands (`dotnet new sln`, project creation, NuGet additions)
**Then** the solution builds successfully with 4 projects: `MfgStructure.API`, `MfgStructure.Application`, `MfgStructure.Domain`, `MfgStructure.Infrastructure`
**And** `Siesa.MasterPattern v0.1.3`, `Siesa.BusinessUtilities.LookupFieldQueryBuilder v0.0.5`, `Dapr.AspNetCore`, `Dapr.Client`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `linq2db.EntityFrameworkCore`, `LinqKit.Microsoft.EntityFrameworkCore`, `FluentValidation`, `Serilog.AspNetCore`, and `Scalar.AspNetCore` are resolvable from GitHub Packages (SiesaTeams org)

**Given** the repository contains the `docker-compose.yml` and `docker-compose.override.yml` from shared-docs
**When** `docker compose up` is executed
**Then** PostgreSQL 18 (`mfgstructure-postgres`), Redis 8-alpine (`mfgstructure-redis`), and Dapr Placement v1.16.9 (`mfgstructure-dapr-placement`) start successfully

**Given** the API project is configured with Problem Details RFC 7807, Scalar API reference, Serilog structured logging, and Bearer JWT middleware
**When** the API starts (`dotnet run`)
**Then** the service responds to health check and the Scalar API reference is accessible at the configured endpoint

---

#### Story 1.2: Projected Entity EF Core Configurations & Migrations

As a developer,
I want EF Core entity configurations and database migrations for all 14 projected entity tables (`*_prj`),
So that projection tables exist in the database before any sync handlers or reconciliation jobs run.

**Acceptance Criteria:**

**Given** the MfgStructure database is running via Docker compose
**When** the EF Core migration for `*_prj` tables is applied
**Then** all 14 projected entity tables exist in the `mfgstructure` schema: `amgr_users_prj`, `invt_cost_segments_prj`, `invt_cost_segments_overrides_prj`, `invt_storages_prj`, `invt_storage_groups_prj`, `invt_storage_groups_overrides_prj`, `invt_storages_overrides_prj`, `segm_companies_prj`, `segm_user_company_assignments_prj`, `segm_cost_centers_prj`, `segm_cost_centers_overrides_prj`, `segm_cost_center_groups_prj`, `tprt_third_parties_prj`, `tprt_third_parties_overrides_prj`

**Given** the migration runs successfully
**When** a row is inserted into any `*_prj` table
**Then** the PK uses a UUIDv7 value and timestamp columns default to `NOW()` (stored as `DateTimeOffset`)
**And** no EF Core model warnings or migration errors are produced

---

#### Story 1.3: Dapr Pub/Sub Subscription Registration

As a system operator,
I want MfgStructure to automatically register all required Dapr Pub/Sub subscriptions at startup,
So that the service begins receiving projected entity events from origin services without any manual sidecar configuration.

**Acceptance Criteria:**

**Given** Dapr sidecar is running with `pubsub.yaml` pointing to the GCP Pub/Sub broker
**When** the MfgStructure API starts
**Then** all required subscriptions (one per event action per entity — created/updated/status_changed/deleted for each of the 14 entities) are registered via `app.MapSubscribeHandler()` and the Dapr subscription discovery endpoint returns all expected topics
**And** topic names follow the convention `{service}.{entity}.{action}` (e.g., `inventory.cost-segment.created`)

**Given** no manual configuration is required
**When** a new subscription is needed
**Then** adding a handler in code automatically registers the subscription at startup with no YAML changes required beyond the initial `pubsub.yaml` component definition

---

#### Story 1.4: Projection Sync Handlers — AccessManager & Inventory Entities

As a system,
I want idempotent projection sync handlers for AccessManager (User) and Inventory (CostSegment, CostSegmentOverride, Storage, StorageGroup, StorageGroupOverride, StorageOverride) events,
So that local projection tables for these 7 entities stay current with origin service data via Dapr Pub/Sub.

**Acceptance Criteria:**

**Given** a valid Dapr event for any AccessManager or Inventory projected entity arrives with correct `tenantId`
**When** the handler processes the event
**Then** the corresponding local `*_prj` table is upserted (INSERT OR UPDATE by origin entity ID) within 2 seconds
**And** a `status_changed` or `deleted` event sets `is_active = false` on the local record

**Given** the same event is delivered N times (Dapr at-least-once delivery)
**When** each delivery is processed
**Then** the resulting database state is identical after each delivery (idempotency guaranteed)

**Given** an event with an invalid or mismatched `tenantId` arrives
**When** the handler processes the event
**Then** the event is rejected, a warning is logged (with event metadata, no sensitive data), the service returns HTTP 400, and processing of subsequent events continues without any crash or service interruption

---

#### Story 1.5: Projection Sync Handlers — Segment & ThirdParty Entities

As a system,
I want idempotent projection sync handlers for Segment (Company, UserCompanyAssigments, CostCenter, CostCenterOverride, CostCenterGroup) and ThirdParty (ThirdParty, ThirdPartyOverride) events,
So that all 14 projected entity tables are fully synchronized with origin services.

**Acceptance Criteria:**

**Given** a valid Dapr event for any Segment or ThirdParty projected entity arrives with correct `tenantId`
**When** the handler processes the event
**Then** the corresponding local `*_prj` table is upserted by origin entity ID within 2 seconds
**And** soft-delete/status_changed events set `is_active = false` on the local record

**Given** the same event is delivered N times
**When** each delivery is processed
**Then** the resulting database state is identical (idempotency)

**Given** a single entity handler fails with an unrecoverable error (e.g., DB constraint violation)
**When** the error is encountered
**Then** only that specific event handler fails; all other entity handlers remain operational and continue processing their events normally

---

#### Story 1.6: LookupField Search Endpoints for Projected Entities

As a consumer feature (Methods, Work Centers),
I want LookupField-compatible Search endpoints for all 9 searchable projected entities,
So that form LookupField controls can retrieve paginated, filterable data scoped to the caller's company context.

**Acceptance Criteria:**

**Given** a consumer sends a GET to `/api/v1/projections/{entity}/search` with pagination and filter parameters and a valid Bearer JWT
**When** the endpoint processes the request
**Then** the response conforms to the `LookupFieldQueryBuilder v0.0.5` response contract: paginated results with total count, correct page size, and filterable fields
**And** results are filtered by `is_active = true` and `company_id` matching the caller's company context
**And** for entities without a direct `company_id` column, CompanyID filtering is applied via JOIN with the corresponding Override table (FR33)
**And** the endpoint returns results in < 300ms under normal load (NFR2)

**Given** a consumer attempts a POST/PUT/DELETE on a projected entity endpoint
**When** the request is received
**Then** the system returns HTTP 405 Method Not Allowed (FR34 — no CRUD on projected entities)

**Given** the caller sends a request without a valid Bearer JWT
**When** the endpoint validates authentication
**Then** the system returns HTTP 401 (NFR4)

---

#### Story 1.7: Reconciliation BackgroundService

As a system operator,
I want a reconciliation BackgroundService that runs at service startup and periodically thereafter using Dapr Service Invocation,
So that local projection tables automatically recover consistency after downtime or missed events, without manual intervention.

**Acceptance Criteria:**

**Given** MfgStructure starts with `Projections:ReconciliationOnStartup = true`
**When** the BackgroundService initializes
**Then** reconciliation runs for all 14 projected entities via Dapr Service Invocation before the HTTP server accepts the first external request (blocking startup — NFR9)
**And** each entity's result (records updated, records unchanged, errors) is logged as a structured log entry

**Given** the service is running with `Projections:ReconciliationIntervalMinutes = 60` (configurable via appsettings)
**When** 60 minutes elapse after the last reconciliation
**Then** reconciliation runs automatically for all 14 entities

**Given** reconciliation fails for one entity (e.g., origin service unreachable via Dapr Service Invocation)
**When** the job processes remaining entities
**Then** the error is logged for the failing entity with entity name and error detail, and the job continues and completes reconciliation for all remaining entities without aborting (NFR10)

---

## Métodos

### Epic 2: Methods Master

Enable global administrators to manage the complete lifecycle of manufacturing Methods (create, edit, delete, assign to companies) and enable company administrators to configure company-specific overrides. Downstream consumers (Routes, BOM, Cost Groups) can discover Methods via a LookupField Search endpoint. Full RBAC and concurrency protection are in place.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E2.1:** A global administrator can create, edit, and delete Methods, including assigning them to one or more companies; all changes are immediately reflected in the system.
- [ ] **AC-E2.2:** A company administrator can override method settings for their company without affecting other companies' configurations.
- [ ] **AC-E2.3:** Routes, BOM, and Cost Group forms can successfully select active Methods via the LookupField search, filtered by company visibility.
- [ ] **AC-E2.4:** Attempting to delete a Method with active dependencies returns a clear error message in Spanish; the seed Method (code `0001`) cannot be modified or deleted under any circumstances.
- [ ] **AC-E2.5:** Concurrent edits to the same Method by two users result in a conflict error with Force/Cancel options, preventing silent data loss.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13

## Centros de Trabajo

### Epic 3: Work Centers Core Operations

Enable global administrators to create and manage Work Centers with all required associations (Installation, Warehouse, Cost Center, Responsible), assign them to companies, and manage concurrency. Company administrators can configure company-specific overrides. All four form modes (Create, Edit-Global, Edit-Company, View) are implemented. LookupField Search endpoint enables Routes and Machines to discover work centers.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E3.1:** A global administrator can create a Work Center with all required associations (Installation, Cost Center) and immediately assign it to one or more companies in a single flow.
- [ ] **AC-E3.2:** A company administrator can view and override company-specific settings (status, cost center, capacity parameters) without affecting other companies' configurations.
- [ ] **AC-E3.3:** Routes and Machines forms can successfully select active Work Centers via the LookupField search, filtered by company visibility and active status.
- [ ] **AC-E3.4:** Deleting a Work Center referenced by routes or machines returns a specific, descriptive error in Spanish; deletion of unreferenced work centers also removes associated override records.
- [ ] **AC-E3.5:** Concurrent edits to the same Work Center are detected and presented with Force/Cancel options; users with global permission can edit the immutable fields (Code, Name, ShortName).

**FRs covered:** FR14, FR14a, FR14b, FR14c, FR14d, FR16, FR17, FR19, FR20, FR21, FR22, FR23, FR24, FR-FORM-1, FR-FORM-2, FR-FORM-3, FR-FORM-4

### Epic 4: Work Centers Cost Rates, Calculated Fields & Substitutes

Enable global administrators to define standard and simulation cost rate grids per Work Center with full validation of all 7 burden code rules. Calculated fields (NumberOfMachines, MachineSpeedFactor, and capacity display fields) are always server-authoritative and read-only. Substitute Work Center assignments enforce same-Installation constraints.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E4.1:** A global administrator can define standard and simulation cost rate grids per Work Center; the system enforces all 7 validation rules with descriptive error messages in Spanish.
- [ ] **AC-E4.2:** The Number of Machines and Machine Speed Factor fields are automatically calculated from the Machines master and are always read-only in the Work Center form.
- [ ] **AC-E4.3:** Calculated capacity fields (Hours/Day, Daily Capacity, Available Capacity) display correctly in the Capacity tab based on current configuration values.
- [ ] **AC-E4.4:** A global administrator can assign substitute Work Centers; the system enforces that substitutes belong to the same Installation and prevents self-substitution and duplicates.

**FRs covered:** FR15, FR15a, FR18, FR-CALC-1, FR-CALC-2, FR-CALC-3
