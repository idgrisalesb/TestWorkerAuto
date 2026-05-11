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
