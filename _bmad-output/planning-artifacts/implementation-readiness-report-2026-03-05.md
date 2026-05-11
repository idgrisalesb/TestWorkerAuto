---
stepsCompleted: ["step-01-document-discovery", "step-02-prd-analysis", "step-03-epic-coverage-validation", "step-04-ux-alignment", "step-05-epic-quality-review", "step-06-final-assessment"]
documentsIncluded:
  prd: "_bmad-output/planning-artifacts/prd/ (sharded)"
  architecture: "_bmad-output/planning-artifacts/architecture.md"
  epics: "_bmad-output/planning-artifacts/epics.md"
  ux: "N/A - not found"
---

# Implementation Readiness Assessment Report

**Date:** 2026-03-05
**Project:** Siesa-Agents

---

## PRD Analysis

### Functional Requirements

#### Feature: Métodos (Methods Master) — FR1–FR13

| ID | Requirement |
|----|-------------|
| FR1 | A global administrator can create a Method with a unique 4-character code, name, use type, and active status. |
| FR2 | The system validates Method code uniqueness in real time on blur, before form submission. |
| FR3 | Upon successful Method creation, a company assignment dialog allows assigning the Method to one or more authorized companies. |
| FR4 | A global administrator can edit the global base fields (name, description, use type, active status); the code field is read-only after creation. |
| FR5 | A company administrator can edit overridable fields (description, use type, active status) scoped to their company without affecting others. |
| FR6 | NULL override values inherit the corresponding global base value; the system resolves the effective value automatically. |
| FR7 | A global administrator can assign or unassign a Method to/from one or more companies. |
| FR8 | A user can delete a Method only when it has no dependencies in Cost Groups, BOM, or Routes; descriptive error when dependencies exist. |
| FR9 | The system prevents modification and deletion of the seed Method record (code `0001`), returning a descriptive error. |
| FR10 | A user can view a paginated list of Methods filtered by code, name, use type, and active status, sortable by any column. |
| FR11 | The system exposes a LookupField-compatible Search endpoint for Methods, filtering by company visibility and active status. |
| FR12 | The system enforces RBAC permissions (`manufacturing.methods.*`) on every Method operation at the backend layer. |
| FR13 | The system detects concurrent edit conflicts on Methods using PostgreSQL `xmin` and returns a descriptive conflict error. |

#### Feature: Centros de Trabajo (Work Centers Master) — FR14–FR24 + sub-requirements

| ID | Requirement |
|----|-------------|
| FR14 | A global administrator can create a Work Center with: Code (unique, varchar 50), Name (varchar 250), ShortName (auto-filled), associations to Installation (required), Warehouse (optional), Cost Center (required), Responsible (optional), BurdenCode. Default values on creation defined. |
| FR14a | On Name blur, if ShortName is empty, the system auto-fills ShortName with leading characters of Name. |
| FR14b | When StorageGroupID changes, StorageID must be cleared. StorageID is only enabled when StorageGroupID has a value. |
| FR14c | StorageID must belong to the same Installation as StorageGroupID. If both StorageID and CostCenterID are set, their operational unit must match. |
| FR14d | After successful creation, system automatically presents the Company Assignment dialog. |
| FR15 | A global administrator can define standard (RateType=0) and simulation (RateType=1) cost rates for a work center. Each rate has: RateNumber, RateBurdenCode, Rate, PercentageRateNumber, CostSegmentID. Unique index on (work_center_id, rate_type, rate_number). |
| FR15a | Rate validation rules (7 rules): NoAplica→rate=0 no segment; BurdenCodes 0–10→PercentageRateNumber=0 segment required; PorcentajeLinea→not first, references prior, no follow PorcentajeTodas; PorcentajeTodas→only one allowed; Rate≠0 unless NoAplica; Percentage codes→rate<999; NIIF=0 segment→rate≥0. |
| FR16 | A company administrator can override any `IsOverridable` field of a work center scoped to their company. |
| FR17 | A NULL value in `work_centers_overrides` for any overridable field means the company inherits the global base value. |
| FR18 | A global administrator can assign substitute work centers (same Installation). A work center cannot be its own substitute. No duplicate pairs allowed. Installation cannot be changed if substitutes exist. |
| FR19 | A user can delete a work center only when it has no references in machines, routing_operations, or alternate_work_centers. On successful deletion, associated rates and override records are also deleted. |
| FR20 | System exposes a paginated list of work centers filterable by: Code, Name, Installation, IsActive, IsCritical, BurdenCode. Default sort: Code ASC. Pagination: 10/20/50/100. Actions: Edit, View, Assign Company, Delete. |
| FR21 | System exposes a LookupField-compatible `/search` endpoint for work centers, filtering by company visibility and `is_active=true`. |
| FR22 | All work center operations gated by RBAC permissions (`manufacturing.work_centers.*` and `manufacturing.work_center_rates.*`) validated before execution. |
| FR23 | Concurrent edit conflicts on work centers detected using PostgreSQL `xmin`. Descriptive error + Force/Cancel options. |
| FR24 | A global administrator can assign or unassign a work center to/from one or more companies via Company Assignment dialog. |
| FR-CALC-1 | `NumberOfMachines` calculated server-side as count of active machines linked to the work center. Read-only in UI. |
| FR-CALC-2 | `MachineSpeedFactor = Round(Sum(MachineSpeed × AverageEfficiency/100) / StandardSpeed, 2)`. If no active machines, factor=1. If factor≤0, return error. |
| FR-CALC-3 | Displayed-only calculated fields: HoursPerDay, DailyCapacity, AvailableCapacity. |
| FR-FORM-1 | Create mode: no company selector; record saved to global `work_centers` table. |
| FR-FORM-2 | Edit mode — GLOBAL context (requires `update_global`): Code, Name, ShortName editable. Restriction: StorageGroupID cannot change if assigned to routing operations. |
| FR-FORM-3 | Edit mode — Company context (requires `update`): Code, Name, ShortName read-only; overridable fields editable. |
| FR-FORM-4 | View (read-only) mode: all fields disabled. Company context selector shown. Requires `manufacturing.work_centers.read`. |

#### Feature: Entidades Proyectadas (Projected Entities) — FR25–FR35

| ID | Requirement |
|----|-------------|
| FR25 | The service automatically registers Dapr Pub/Sub subscriptions for all required projected entity topics at startup, no manual configuration required. |
| FR26 | The system processes each incoming Dapr event by performing an idempotent upsert (or soft-delete) on the corresponding local projection table. |
| FR27 | The system validates the `tenantId` on every incoming Dapr event and rejects events with an invalid or mismatched tenant without crashing the service. |
| FR28 | Projection sync handlers are idempotent: delivering the same event N times produces the same result as delivering it once. |
| FR29 | The system runs a reconciliation BackgroundService at service startup and then periodically at a configurable interval, comparing local projection tables with origin services via Dapr Service Invocation. |
| FR30 | The reconciliation job logs the result per projected entity per execution (records updated, unchanged, errors). |
| FR31 | The reconciliation interval is configurable via application settings (`Projections:ReconciliationIntervalMinutes`). |
| FR32 | The system exposes a LookupField-compatible Search endpoint for each projected entity, applying `IsActive` and `CompanyID` filters as specified per entity. |
| FR33 | For projected entities without a direct `company_id` field, the Search endpoint applies CompanyID filtering via JOIN with the corresponding Override table. |
| FR34 | The system does not expose CRUD endpoints for projected entities; they are read-only from MfgStructure's perspective. |
| FR35 | Projected entity Search endpoints return paginated, filterable results compatible with the LookupField component contract. |

#### Access Control — FR36–FR38

| ID | Requirement |
|----|-------------|
| FR36 | The system enforces all RBAC permission checks server-side on every API operation; frontend visibility is a UX aid only and is not a security boundary. |
| FR37 | Users can only operate on companies they are authorized for; the system resolves the user's company scope from their session context. |
| FR38 | The `update_global` permission is required to modify immutable fields (Code, Name) on any master record; standard `update` covers only overridable fields in company context. |

**Total FRs: 38 (FR1–FR38) + 10 sub-requirements (FR14a–d, FR15a, FR-CALC-1–3, FR-FORM-1–4)**

---

### Non-Functional Requirements

| ID | Category | Requirement |
|----|----------|-------------|
| NFR-PERF-1 | Performance | List endpoints (Methods, Work Centers) return first page within **500ms** under normal load. |
| NFR-PERF-2 | Performance | LookupField Search endpoints return results within **300ms**. |
| NFR-PERF-3 | Performance | Dapr event handlers complete processing within **2 seconds** per event to avoid Dapr timeout. |
| NFR-SEC-1 | Security | All API endpoints require valid Bearer JWT issued by AccessManager; HTTP 401 without valid token. |
| NFR-SEC-2 | Security | RBAC enforced server-side on every operation; backend never trusts frontend-reported permissions. |
| NFR-SEC-3 | Security | `tenantId` from Dapr event payloads validated on every handler; mismatched events rejected with HTTP 400 and logged. |
| NFR-SEC-4 | Security | Sensitive fields (tokens, secrets) are never logged. |
| NFR-SEC-5 | Security | HTTP 403 returned for RBAC-unauthorized calls; `update_global` restricted to authorized users. |
| NFR-REL-1 | Reliability | Projection sync handlers must be idempotent to tolerate Dapr at-least-once delivery. |
| NFR-REL-2 | Reliability | Concurrent modification conflicts detected via PostgreSQL `xmin` optimistic locking; no silent data overwrites. |
| NFR-REL-3 | Reliability | Reconciliation BackgroundService must complete startup execution before the service begins processing the first external request. |
| NFR-REL-4 | Reliability | If reconciliation job fails for a specific entity, it must log the error and continue processing remaining entities. |
| NFR-INT-1 | Integration | All LookupField Search endpoints must conform to `Siesa.BusinessUtilities.LookupFieldQueryBuilder` v0.0.5 response contract. |
| NFR-INT-2 | Integration | Dapr Pub/Sub topic names follow platform convention `{service}.{entity}.{action}`; exact names confirmed with origin service teams. |
| NFR-INT-3 | Integration | Dapr Service Invocation used by reconciliation job must handle transient failures with retry logic; permanent failures logged per entity. |
| NFR-INT-4 | Integration | Service must register Dapr subscriptions via `app.MapSubscribeHandler()` and component YAML files; no manual sidecar configuration. |
| NFR-INT-5 | Integration | Dapr Pub/Sub component must use GCP Pub/Sub broker configured in the environment's `pubsub.yaml`. |
| NFR-DATA-1 | Data Integrity | PostgreSQL `xmin` must be read on every GET and returned to the client. On PUT/DELETE, `xmin` sent by client must match current DB value; mismatch → HTTP 409. |
| NFR-DATA-2 | Data Integrity | Deletion must be transactional — dependency checks and row deletion happen in a single transaction. |
| NFR-DATA-3 | Data Integrity | Unique index on `(work_center_id, rate_type, rate_number)` enforced at DB and application layer. |
| NFR-UX-1 | Usability | All validation errors must be field-level with descriptive messages in Spanish. |
| NFR-UX-2 | Usability | Dependent field behavior (StorageID enabled only when StorageGroupID is set; cleared on StorageGroupID change) must execute client-side without server round-trip. |
| NFR-UX-3 | Usability | Short name auto-fill must trigger on Name field blur. |
| NFR-MAIN-1 | Maintainability | Backend service must extend `BaseMasterService<WorkCenter>` from `ERP.MasterPattern` to inherit GLOBAL + Override resolution logic. |
| NFR-MAIN-2 | Maintainability | All enumeration values must be defined as C# enums and referenced consistently across frontend and backend. |
| NFR-TEST-1 | Testability | Unit test coverage ≥ 80% on Projected Entities sync handlers, search services, and reconciliation logic. |
| NFR-TEST-2 | Testability | Handlers must be testable in isolation without a live Dapr sidecar (use abstractions/mocks). |

**Total NFRs: 27**

---

### Additional Requirements & Constraints

- **Architecture Pattern:** GLOBAL + Override pattern via `ERP.MasterPattern` library (`BaseMasterService<T>`) — all master records follow this contract.
- **API Design:** RESTful JSON, versioned routes (`/api/v1/`), UUID v7 primary keys, DateTimeOffset timestamps, enumerations as smallint codes.
- **Multi-tenancy:** `companyId` resolved from session context; Dapr events validated via `tenantId` field.
- **Seed Record Protection:** Method code `0001` ("Estándar") is immutable across all environments.
- **Dependency Constraints:**
  - `Siesa.BusinessUtilities.LookupFieldQueryBuilder` v0.0.5 must be available in internal NuGet registry.
  - Dapr topic name contracts must be confirmed with AccessManager, Inventory, Segment, ThirdParty teams before implementation.
  - EF Core migrations for `*_prj` tables must exist before implementing handlers.
  - Dapr pubsub component YAML must be configured in the environment.
- **Entities covered by Projected Entities (16 tables across 4 services):** User (AccessManager); CostSegment, CostSegmentOverride, Storage, StorageGroup, StorageGroupOverride, StorageOverride (Inventory); Company, OperationCenter, OperationCenterOverride, UserCompanyAssigments, CostCenter, CostCenterOverride, CostCenterGroup (Segment); ThirdParty, ThirdPartyOverride (ThirdParty).
- **Error codes standardized:** 400 Validation, 401 Auth, 403 RBAC, 404 Not Found, 409 Dependency/Concurrency conflict, 422 Immutable record violation.

### PRD Completeness Assessment

The PRD is **well-structured and thorough**. Notable strengths:
- Clear FR numbering across all three features (FR1–FR38) with explicit sub-requirements.
- User journeys map directly to specific requirements, providing excellent traceability.
- Both MVP and post-MVP scope clearly defined.
- API endpoint tables provided with HTTP methods, routes, and descriptions.
- Error response codes standardized.

Potential gaps observed (to be validated in epic coverage):
- No explicit FR for the "force save" option on concurrency conflict (mentioned in journey but not in FRs).
- Work Centers POST-MVP "Duplicate work center" (FR-EXTRA from AC-006) referenced but not formally numbered.
- `Projections:ReconciliationOnStartup` config key mentioned in feature-entidades-proyectadas.md but not in a formal NFR.

---

## Epic Coverage Validation

### Coverage Matrix

| FR | PRD Requirement (Summary) | Epic Coverage | Status |
|----|--------------------------|---------------|--------|
| FR1 | Method create with unique code, name, use type | Epic 2 | ✅ Covered |
| FR2 | Code uniqueness real-time validation on blur | Epic 2 | ✅ Covered |
| FR3 | Company assignment dialog post-create | Epic 2 | ✅ Covered |
| FR4 | Global admin edit base fields | Epic 2 | ✅ Covered |
| FR5 | Company admin override fields scoped to company | Epic 2 | ✅ Covered |
| FR6 | NULL override inherits global base value | Epic 2 | ✅ Covered |
| FR7 | Assign/unassign companies | Epic 2 | ✅ Covered |
| FR8 | Delete with dependency validation | Epic 2 | ✅ Covered |
| FR9 | Seed record (0001) protection | Epic 2 | ✅ Covered |
| FR10 | Paginated list with filters and sorting | Epic 2 | ✅ Covered |
| FR11 | LookupField Search endpoint (Methods) | Epic 2 | ✅ Covered |
| FR12 | RBAC enforcement (manufacturing.methods.*) | Epic 2 | ✅ Covered |
| FR13 | xmin concurrency detection (Methods) | Epic 2 | ✅ Covered |
| FR14 | Work Center create with full associations | Epic 3 | ✅ Covered |
| FR14a | ShortName auto-fill on Name blur | Epic 3 | ✅ Covered |
| FR14b | StorageID cleared on StorageGroupID change | Epic 3 | ✅ Covered |
| FR14c | StorageID/CostCenter operational unit match | Epic 3 | ✅ Covered |
| FR14d | Company assignment dialog post-create | Epic 3 | ✅ Covered |
| FR15 | Standard and simulation cost rates | Epic 4 | ✅ Covered |
| FR15a | Rate validation rules (7 rules) | Epic 4 | ✅ Covered |
| FR16 | Company override of IsOverridable fields | Epic 3 | ✅ Covered |
| FR17 | NULL override inherits global base (WC) | Epic 3 | ✅ Covered |
| FR18 | Substitute work centers assignment | Epic 4 | ✅ Covered |
| FR19 | Delete with dependency validation (WC) | Epic 3 | ✅ Covered |
| FR20 | Paginated list with filters (WC) | Epic 3 | ✅ Covered |
| FR21 | LookupField Search endpoint (WC) | Epic 3 | ✅ Covered |
| FR22 | RBAC enforcement (manufacturing.work_centers.*) | Epic 3 | ✅ Covered |
| FR23 | xmin concurrency detection + Force/Cancel (WC) | Epic 3 | ✅ Covered |
| FR24 | Assign/unassign companies (WC) | Epic 3 | ✅ Covered |
| FR25 | Dapr Pub/Sub auto-registration at startup | Epic 1 (Story 1.3) | ✅ Covered |
| FR26 | Idempotent upsert handler per entity | Epic 1 (Stories 1.4, 1.5) | ✅ Covered |
| FR27 | tenantId validation + rejection without crash | Epic 1 (Stories 1.4, 1.5) | ✅ Covered |
| FR28 | Handler idempotency (N deliveries = same result) | Epic 1 (Stories 1.4, 1.5) | ✅ Covered |
| FR29 | Reconciliation BackgroundService (startup + periodic) | Epic 1 (Story 1.7) | ✅ Covered |
| FR30 | Per-entity reconciliation logging | Epic 1 (Story 1.7) | ✅ Covered |
| FR31 | Configurable reconciliation interval | Epic 1 (Story 1.7) | ✅ Covered |
| FR32 | LookupField Search endpoints for projected entities | Epic 1 (Story 1.6) | ✅ Covered |
| FR33 | CompanyID filtering via JOIN with Override table | Epic 1 (Story 1.6) | ✅ Covered |
| FR34 | No CRUD endpoints on projected entities | Epic 1 (Story 1.6) | ✅ Covered |
| FR35 | Paginated LookupField response contract | Epic 1 (Story 1.6) | ✅ Covered |
| FR-CALC-1 | NumberOfMachines server-side calculation | Epic 4 | ✅ Covered |
| FR-CALC-2 | MachineSpeedFactor calculation | Epic 4 | ✅ Covered |
| FR-CALC-3 | Display-only capacity calculated fields | Epic 4 | ✅ Covered |
| FR-FORM-1 | Create mode form behavior | Epic 3 | ✅ Covered |
| FR-FORM-2 | Edit mode — GLOBAL context | Epic 3 | ✅ Covered |
| FR-FORM-3 | Edit mode — Company context | Epic 3 | ✅ Covered |
| FR-FORM-4 | View (read-only) mode | Epic 3 | ✅ Covered |
| **FR36** | **Server-side RBAC enforcement; frontend is UX aid only** | **NOT IN COVERAGE MAP** | **❌ MISSING** |
| **FR37** | **Users operate only on authorized companies; scope from session** | **NOT IN COVERAGE MAP** | **❌ MISSING** |
| **FR38** | **update_global permission required to modify immutable fields** | **NOT IN COVERAGE MAP** | **❌ MISSING** |

### Missing Requirements

#### Critical Missing FRs

**FR36:** The system enforces all RBAC permission checks server-side on every API operation; frontend visibility is a UX aid only and is not a security boundary.
- **Impact:** Critical security requirement. If not explicitly tracked, there is a risk that RBAC is implemented at the UI layer only, leaving backend endpoints unprotected.
- **Note:** Partially implicit in FR12 (Methods RBAC) and FR22 (WC RBAC), but FR36 applies globally to ALL endpoints.
- **Recommendation:** Add to Epic 1 (Projected Entities search endpoints) as an acceptance criterion, and reinforce in Epics 2 and 3 stories.

**FR37:** Users can only operate on companies they are authorized for; the system resolves the user's company scope from their session context.
- **Impact:** Multi-tenancy isolation requirement. Missing explicit story coverage means no developer has been assigned to verify that company scope is enforced at runtime.
- **Recommendation:** Add as an explicit acceptance criterion to Story 1.6 (LookupField), and to the RBAC/auth stories in Epics 2 and 3.

**FR38:** The `update_global` permission is required to modify immutable fields (Code, Name) on any master record; standard `update` permission covers only overridable fields in company context.
- **Impact:** Referenced in Epic 3 epics-level acceptance criteria (AC-E3.5) but not in the coverage map. Risk: developers may miss enforcing this on Methods (not just Work Centers).
- **Recommendation:** Add explicitly to Epic 2 coverage map and ensure Methods create/edit stories include `update_global` enforcement in acceptance criteria.

### Structural Gap — CRITICAL

> ⚠️ **CRITICAL: Epics 2, 3, and 4 have NO user stories defined.**

The `epics.md` document status is `storiesStatus: epic-1-complete`. Epics 2, 3, and 4 contain only epic-level acceptance criteria and the FR coverage map, but **zero individual user stories**.

This means:
- **Epic 2 (Methods Master):** 13 FRs to implement, 0 stories written.
- **Epic 3 (Work Centers Core):** 17 FRs to implement, 0 stories written.
- **Epic 4 (Work Centers Rates):** 6 FRs to implement, 0 stories written.

**No implementation can begin on Epics 2, 3, or 4 until stories are written.**

### NFR Coverage Assessment

The epics document lists NFR1–NFR10 which maps to the 10 key NFRs from the main PRD `non-functional-requirements.md`. However, the following NFRs from feature-level PRDs are **not explicitly tracked** in the epics:

| Missing NFR | Source | Description |
|-------------|--------|-------------|
| NFR-UX-1 | feature-centros-de-trabajo.md | All validation errors field-level in Spanish |
| NFR-UX-2 | feature-centros-de-trabajo.md | Dependent field behavior client-side (no server round-trip) |
| NFR-UX-3 | feature-centros-de-trabajo.md | Short name auto-fill triggers on Name field blur |
| NFR-DATA-1 | feature-centros-de-trabajo.md | xmin read on GET, validated on PUT/DELETE |
| NFR-DATA-2 | feature-centros-de-trabajo.md | Deletion transactional (dependency checks + row deletion) |
| NFR-DATA-3 | feature-centros-de-trabajo.md | Unique index (work_center_id, rate_type, rate_number) |
| NFR-MAIN-1 | feature-centros-de-trabajo.md | Extend BaseMasterService<WorkCenter> from ERP.MasterPattern |
| NFR-MAIN-2 | feature-centros-de-trabajo.md | All enumerations as C# enums |
| NFR-TEST-1 | feature-entidades-proyectadas.md | ≥ 80% unit test coverage on sync/search/reconciliation |
| NFR-TEST-2 | feature-entidades-proyectadas.md | Handlers testable without live Dapr sidecar |
| NFR-SEC-4 | non-functional-requirements.md | Sensitive fields never logged |
| NFR-INT-4 | non-functional-requirements.md | Register Dapr subscriptions via app.MapSubscribeHandler() |
| NFR-INT-5 | feature-entidades-proyectadas.md | GCP Pub/Sub broker via pubsub.yaml |

*Note: Several of these (NFR-TEST-1, NFR-INT-4) ARE addressed in Epic 1 stories' acceptance criteria, even if not in the formal NFR tracking table.*

### Coverage Statistics

- Total PRD FRs: 50 (FR1–FR38 + FR14a/b/c/d, FR15a, FR-CALC-1/2/3, FR-FORM-1/2/3/4)
- FRs covered in epics coverage map: 47
- FRs missing from coverage map: 3 (FR36, FR37, FR38)
- **Coverage percentage: 94%**
- Epics with stories fully defined: 1 / 4
- Epics missing stories: 3 (Epics 2, 3, 4) — **CRITICAL BLOCKER**

---

## UX Alignment Assessment

### UX Document Status

**Not Found** — No UX design document exists in `_bmad-output/planning-artifacts/`.

### Scope Assessment: Is UX Implied?

The **architecture document** explicitly classifies this project as:
> "Primary domain: API Backend microservice (no frontend)"

This is corroborated by:
- The main PRD Project Classification: "Technical Type: API Backend (microservice)"
- The architecture scope exclusively covers backend services, endpoints, and data layers
- No frontend technology is included in the architecture tech stack

**However, the Work Centers feature PRD has an inconsistency:**
> `feature-centros-de-trabajo.md` classifies itself as: "Technical Type: Full-stack ERP feature — REST API backend (C# / .NET) + React web frontend"

This inconsistency indicates that this PRD was potentially written from a broader feature perspective, but the current sprint's implementation scope is **API Backend only**. The React frontend for Work Centers is out of scope for this project.

### UX-Implied Requirements in PRD

The PRD contains several requirements that reference client-side behavior. These are interpreted as **API contract requirements** (what the backend must support), not as frontend implementation requirements:

| Requirement | PRD Location | Interpretation |
|-------------|-------------|----------------|
| Real-time code uniqueness validation on blur | FR2, FR14a | API endpoint that accepts async validation requests |
| Company assignment dialog post-create | FR3, FR14d | API: compound create-then-assign transaction or two-step flow |
| LookupField search responses | FR11, FR21, FR32 | API response contract (LookupFieldQueryBuilder v0.0.5) |
| Error messages in Spanish | NFR-UX-1 | API error response messages must be in Spanish |
| Dependent field behavior (StorageID cleared) | FR14b, NFR-UX-2 | API validation rules (validated server-side even if also done client-side) |
| Force/Cancel options on concurrency conflict | FR23 | API: return enough context (xmin, conflict details) for client to offer Force/Cancel |

### Alignment Issues

1. **Scope Inconsistency:** `feature-centros-de-trabajo.md` claims "Full-stack" scope while the architecture is API-only. This needs explicit clarification to ensure developers don't assume frontend work is in scope.

2. **NFR-UX requirements in epics:** NFR-UX-1, NFR-UX-2, NFR-UX-3 from the Work Centers PRD are not tracked in the epics NFR list. These have valid API-side implications (Spanish error messages, server-side field dependency validation) that should be tracked.

### Warnings

> **INFO:** No UX document is expected for an API-only microservice. This is not a gap.

> **WARNING:** The Work Centers PRD (`feature-centros-de-trabajo.md`) classifies itself as "Full-stack" which contradicts the architecture scope. Recommend clarifying in the epics or PRD that the **React frontend is out of scope for this sprint** to prevent developer confusion.

> **INFO:** All UX-implied requirements have been correctly re-interpreted as API contract requirements. No frontend implementation is blocked or needed for implementation readiness.

---

## Epic Quality Review

### Best Practices Applied

Standards from `create-epics-and-stories` workflow applied to all 4 epics and 7 stories (Epic 1 only — Epics 2, 3, 4 have no stories).

---

### Epic 1: Projected Entities Synchronization Infrastructure

#### User Value Assessment

**Concern — Technical Epic Naming:** The title "Projected Entities Synchronization Infrastructure" reads as a technical milestone, not a user-centric outcome.

**Mitigation:** Epic 1's acceptance criteria ARE user-outcome focused:
- AC-E1.2: "When an origin service publishes an event, the corresponding local projection table reflects the change within 5 seconds" — measurable outcome
- AC-E1.4: "Downstream features can successfully look up projected entities via Search endpoints" — downstream user value
- AC-E1.5: "After a restart following downtime, the service automatically recovers projection consistency" — operational outcome

**Verdict:** 🟡 Minor concern — consider renaming to "Enable Real-Time Master Data Synchronization from Origin Services" to be more outcome-oriented. Not blocking.

#### Epic Independence

✅ Epic 1 stands completely alone. No dependency on Epics 2, 3, or 4. It IS the prerequisite.

#### Story Quality — Story 1.1: Solution Scaffold & Infrastructure Setup

✅ **Greenfield Justification:** Greenfield projects require an initial setup story. This is valid.

🟠 **Story Sizing — Potentially Oversized:** Story 1.1 bundles:
- Solution creation (4 projects)
- 10+ NuGet package registrations
- Docker Compose setup (3 containers)
- API middleware configuration (Problem Details, Scalar, Serilog, Bearer JWT)

Each of these could be a separate story. For implementation, this creates a story where "done" requires multiple independent developer tasks that are hard to parallelism. **Recommendation:** Consider splitting into (a) Solution Scaffold + Docker and (b) API Middleware & Package Configuration. Not blocking but may slow sprint velocity.

✅ **AC Format:** Given/When/Then properly structured.
✅ **Completable independently.**

#### Story Quality — Story 1.2: EF Core Configurations & Migrations

🟡 **All-Tables-Upfront Pattern:** Creates all 14 `*_prj` tables in a single story. The general best practice is "create tables when first needed." However, the architecture explicitly states migrations must precede ALL handlers — so this is an **intentional and justified exception.**

✅ AC format: Given/When/Then ✅
✅ Independent ✅
✅ Verifiable (migration applies successfully, UUIDv7 PKs, DateTimeOffset timestamps) ✅

#### Story Quality — Story 1.3: Dapr Pub/Sub Subscription Registration

✅ Clear user value: service receives events automatically without manual ops intervention.
✅ AC format: Given/When/Then ✅
✅ Depends only on Story 1.1 (scaffold must exist) — no forward dependencies ✅

#### Story Quality — Story 1.4: Projection Sync Handlers — AccessManager & Inventory

🟠 **Story Sizing — Large:** Story 1.4 implements handlers for **7 entities** across 2 services (AccessManager + Inventory). This is a significant implementation block. If one entity handler has a complex issue, the entire story is blocked.

**Recommendation:** Consider splitting into Story 1.4a (AccessManager — 1 entity) and Story 1.4b (Inventory — 6 entities). Not blocking but reduces risk.

✅ AC covers: happy path (upsert within 2s), idempotency (N deliveries = same state), tenantId rejection (without crash).
✅ Completable without forward dependencies.
✅ Dependencies: Story 1.2 (tables must exist) — acceptable backward dependency.

#### Story Quality — Story 1.5: Projection Sync Handlers — Segment & ThirdParty

Same sizing concern as Story 1.4 — 7 entities across 2 services.

🟠 **Sizing concern applies.** See Story 1.4 recommendation.

✅ AC adds important "single entity handler failure doesn't abort other handlers" — well-specified.
✅ No forward dependencies.

#### Story Quality — Story 1.6: LookupField Search Endpoints

✅ Clear user value: LookupField consumers get fast, paginated, filtered results.
✅ AC covers: positive path, 405 on CRUD attempts (FR34), 401 on missing auth (NFR4), < 300ms performance (NFR2).
✅ No forward dependencies (needs Story 1.2 tables, but they precede this).
✅ 9 searchable entities in one story — acceptable because all follow the same LookupFieldQueryBuilder contract pattern.

#### Story Quality — Story 1.7: Reconciliation BackgroundService

✅ Clear user/operational value: automatic data recovery after downtime.
✅ AC covers: startup blocking behavior (NFR9), periodic schedule (FR31), per-entity logging (FR30), error isolation (NFR10).
✅ Depends on Stories 1.4 + 1.5 (reuses handlers) — handlers defined before reconciliation ✅.

---

### Epic 2: Methods Master

**Status: No stories defined.**

Epic-level quality assessment only:

✅ **User Value:** "Enable global administrators to manage the complete lifecycle of manufacturing Methods" — user-centric outcome ✅
✅ **Epic Independence:** Methods depend only on Epic 1 (projected entities for audit fields + company assignments). No dependency on Epics 3 or 4. ✅
✅ **FR Coverage:** FR1–FR13 all mapped ✅
✅ **AC-E2.1 through AC-E2.5:** User-focused, measurable, Given outcome stated ✅

🔴 **CRITICAL:** No user stories exist. Cannot assess story sizing, dependencies, or AC completeness. **Implementation cannot begin.**

🟠 **Missing Force-Save API Contract:** AC-E2.5 mentions "Force/Cancel options" for concurrency conflicts. No story defines what the API must return (xmin, ETag, or conflict details object) to enable a client to implement Force Save. This needs an explicit story-level AC.

---

### Epic 3: Work Centers Core Operations

**Status: No stories defined.**

Epic-level quality assessment only:

✅ **User Value:** "Enable global administrators to create and manage Work Centers" — user-centric ✅
✅ **Epic Independence:** Depends on Epic 1 (projected entities). Does NOT depend on Epic 2 (Methods). These two epics could be parallelized. ✅
✅ **FR Coverage:** 17 FRs mapped ✅

🔴 **CRITICAL:** No user stories exist. **Implementation cannot begin.**

🟡 **Parallelization Opportunity:** Epic 3 has NO dependency on Epic 2. The defined feature order (Methods → Work Centers) is sequential but not required. Teams could implement Epics 2 and 3 in parallel once Epic 1 is complete.

🟠 **Epic Scope is Very Large:** 17 FRs in Epic 3 covering: CRUD forms, 4 form modes, concurrency, company assignments, RBAC, LookupField search, dependency-aware deletion, and field-level dependency logic (FR14b, FR14c). When stories are written, this epic may need 6–10 stories. Recommend careful story sizing.

---

### Epic 4: Work Centers Cost Rates, Calculated Fields & Substitutes

**Status: No stories defined.**

Epic-level quality assessment only:

✅ **User Value:** "Enable global administrators to define standard and simulation cost rate grids" — user-centric ✅
✅ **Epic Independence:** Depends on Epic 1 (projected entities for CostSegments) and Epic 3 (work centers must exist before rates can be assigned). Sequential dependency on Epic 3 is correct and necessary. ✅
✅ **FR Coverage:** FR15, FR15a, FR18, FR-CALC-1, FR-CALC-2, FR-CALC-3 mapped ✅

🔴 **CRITICAL:** No user stories exist. **Implementation cannot begin.**

🟠 **Rate Validation Complexity:** FR15a has 7 complex validation rules for the rate grid. When the story is written, the AC for rate validation must enumerate all 7 rules explicitly with separate Given/When/Then scenarios. A single vague AC like "rate validation enforced" is insufficient.

---

### Best Practices Compliance Checklist

| Epic | User Value | Independent | Stories Written | Stories Sized OK | Forward Deps | Clear AC | FR Traceability |
|------|-----------|-------------|-----------------|-----------------|--------------|----------|-----------------|
| Epic 1 | ✅ (debatable naming) | ✅ | ✅ | 🟠 1.1/1.4/1.5 large | ✅ None | ✅ | ✅ |
| Epic 2 | ✅ | ✅ | ❌ MISSING | N/A | N/A | ✅ (epic level) | ✅ |
| Epic 3 | ✅ | ✅ | ❌ MISSING | N/A | N/A | ✅ (epic level) | ✅ |
| Epic 4 | ✅ | ✅ | ❌ MISSING | N/A | N/A | ✅ (epic level) | ✅ |

### Quality Violations Summary

#### 🔴 Critical Violations

1. **Epics 2, 3, 4 — No user stories defined.** Implementation cannot begin on 36 of the 50 FRs.

#### 🟠 Major Issues

2. **Story 1.1 — Oversized scaffold story.** Recommend splitting into (a) Solution + Docker and (b) Middleware + Package Config.
3. **Stories 1.4 and 1.5 — Each handles 7 entities.** Recommend splitting by individual service (4 stories instead of 2).
4. **Force-Save contract undefined.** AC-E2.5 and FR23/AC-E3.5 reference Force/Cancel behavior but no story defines the API response contract needed to enable this.
5. **FR36/FR37/FR38 not in stories.** Three critical access-control requirements have no story coverage.

#### 🟡 Minor Concerns

6. **Epic 1 naming is technical.** Rename for user-outcome framing.
7. **Epic 2 and Epic 3 parallelization opportunity not documented.** Teams could accelerate delivery.
8. **Rate grid validation AC** (when Epic 4 stories are written) must enumerate all 7 FR15a rules explicitly.

---

## Summary and Recommendations

### Overall Readiness Status

> ## 🟠 NEEDS WORK — PARTIAL IMPLEMENTATION READINESS

Epic 1 (Projected Entities) is **READY for implementation**. Epics 2, 3, and 4 are **NOT READY** due to missing user stories. The project can start Epic 1 immediately, but Epics 2–4 require story creation before development can begin.

---

### Critical Issues Requiring Immediate Action

| Priority | Issue | Impact |
|----------|-------|--------|
| 🔴 P1 | Epics 2, 3, 4 have ZERO user stories | 36 of 50 FRs (72%) have no implementation path |
| 🔴 P2 | FR36, FR37, FR38 missing from epic coverage map | 3 cross-cutting access-control requirements untracked |
| 🟠 P3 | Force-Save API contract undefined | Developers have no spec for concurrency conflict resolution response payload |
| 🟠 P4 | Work Centers PRD scope inconsistency ("Full-stack" vs API-only) | Risk of developers implementing out-of-scope frontend work |
| 🟠 P5 | NFR-UX-1/2/3 and NFR-DATA/MAIN/TEST not in epics NFR list | These requirements may not be tested or validated at delivery |

---

### Recommended Next Steps

1. **[IMMEDIATE] Run `create-story` or `create-epics-and-stories` workflow for Epic 2 (Methods Master)** — Generate 5–7 user stories covering: Method CRUD, company assignment, LookupField search endpoint, RBAC enforcement, xmin concurrency + Force Save API response. Target: sprint-ready within 1 day.

2. **[IMMEDIATE] Run `create-story` or `create-epics-and-stories` workflow for Epic 3 (Work Centers Core)** — Generate 6–9 stories covering: WC CRUD, 4 form modes, company assignment, field dependencies (FR14b/FR14c), LookupField, RBAC, xmin. Story for Force-Save must define the API response payload explicitly.

3. **[IMMEDIATE] Run `create-story` workflow for Epic 4 (Work Centers Rates & Calculated Fields)** — Generate 3–4 stories for rate grid CRUD with all 7 validation rules, calculated fields, and substitute assignment.

4. **[HIGH] Add FR36, FR37, FR38 to the epics coverage map** — Add as acceptance criteria to relevant stories in Epics 1, 2, and 3 (server-side enforcement AC, company scope resolution, update_global enforcement on Methods).

5. **[MEDIUM] Clarify Work Centers PRD scope** — Update `feature-centros-de-trabajo.md` project classification from "Full-stack" to "API Backend" to prevent developer confusion about React frontend scope.

6. **[MEDIUM] Proceed with Epic 1 implementation immediately** — Epic 1 is fully ready with 7 well-defined stories. Begin with Story 1.1 (scaffold) while stories for Epics 2–4 are being written in parallel.

7. **[LOW] Consider splitting Stories 1.4 and 1.5** — Each handles 7 entities; splitting by service (AccessManager / Inventory-Storage / Inventory-CostSegment / Segment-Company / Segment-CostCenter / ThirdParty) reduces risk and improves sprint velocity.

8. **[LOW] Document parallelization option** — Note in sprint planning that Epics 2 and 3 are independent and can be assigned to separate team members simultaneously after Epic 1 completes.

---

### Issues by Category

| Category | Critical | Major | Minor |
|----------|---------|-------|-------|
| Story completeness | 1 (Epics 2–4 missing) | — | — |
| FR coverage | 1 (FR36–38 missing) | — | — |
| Story quality | — | 3 (sizing, force-save, scope) | 2 |
| NFR tracking | — | 1 (13 NFRs untracked) | — |
| UX alignment | — | — | 1 (scope label) |
| **TOTAL** | **2** | **4** | **3** |

---

### Final Note

This assessment identified **9 issues across 5 categories**. The two critical issues (missing stories, missing FR coverage) must be addressed before Epics 2, 3, and 4 can begin implementation. Epic 1 is implementation-ready today.

The PRD is thorough and well-structured. The architecture is comprehensive. The foundational work is solid — the primary gap is story decomposition for 3 of the 4 epics.

**Assessors:** BMAD Implementation Readiness Workflow (Expert Product Manager + Scrum Master)
**Date:** 2026-03-05
**Report file:** `_bmad-output/planning-artifacts/implementation-readiness-report-2026-03-05.md`
