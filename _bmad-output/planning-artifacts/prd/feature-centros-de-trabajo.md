---
stepsCompleted: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11]
inputDocuments:
  - '_bmad-output/shared-docs/Centros_de_Trabajo.md'
workflowType: 'prd'
lastStep: 11
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 1
feature: 'Centros de Trabajo'
---

# Product Requirements Document — Work Centers Feature

**Author:** SiesaTeam
**Date:** 2026-03-04
**Product:** Siesa-Agents — ERP Manufacturing Module
**Source Document:** `_bmad-output/shared-docs/Centros_de_Trabajo.md`

---

## Executive Summary

The **Work Centers** feature is the central master data catalog for productive units in the Manufacturing module. A work center defines a production area with configurable capacity parameters (shifts, hours per shift, standard speed, number of machines) and associations to an Installation, Warehouse, Cost Center, and a Responsible party.

This master is essential for three downstream processes:
- **Capacity planning** — available hours, load percentages, and critical resource flagging.
- **Production costing** — standard and simulation cost rates per burden code are defined here and consumed by production orders.
- **Operation routing** — work centers are assigned to routing steps; the LookupField Search endpoint enables other masters (Machines, Routes) to reference them.

The feature follows the **GLOBAL + Override** pattern (`ERP.MasterPattern`): global administrators define the base record; company administrators can override most fields scoped to their company. Immutable fields (Code, Name, ShortName) are protected and can only be changed with the `UPDATE_GLOBAL` permission.

### What Makes This Special

- **Multi-company isolation via Override pattern**: a single work center record can be configured differently per company (description, capacity params, status, cost center, etc.) without duplicating data.
- **Automatic capacity calculations**: Number of Machines and Machine Speed Factor are computed server-side from the Machines master, keeping the work center always consistent.
- **Cost rate flexibility**: Both standard and simulation rate grids with rich burden code semantics (percentage-on-line, percentage-on-all, etc.) support sophisticated cost modelling.
- **Dependency-aware deletion**: the system protects data integrity by refusing deletion when routes or machines reference the work center.
- **Concurrent edit safety**: PostgreSQL `xmin`-based optimistic locking prevents silent data overwrites.

---

## Project Classification

**Technical Type:** Full-stack ERP feature — REST API backend (C# / .NET) + React web frontend
**Domain:** ERP Manufacturing
**Complexity:** Medium-High — GLOBAL + Override pattern, multi-company data model, RBAC, concurrency, complex rate validation rules
**Project Context:** Brownfield — extends the existing Manufacturing module microservice

---

## Success Criteria

### User Success

- A **global administrator** can create a work center, configure all capacity and rate parameters, and assign it to one or more companies without leaving the form flow.
- A **company administrator** can open edit mode, select their company context, and override any overridable field without affecting other companies.
- Any **user with read permission** can browse, filter, and sort the work center list and view detail in read-only mode.
- A **routes designer** can select a work center through the LookupField search without knowing internal identifiers.
- Users receive clear, actionable error messages for all validation failures (duplicate code, dependency conflicts, concurrency conflicts).

### Business Success

- Work Centers feature is complete and stable before the Routes and Machines features go live, since those depend on it.
- All downstream modules (Routes, Machines, Production Orders) consume work center data via the standardized Search endpoint.
- Cost calculation accuracy is maintained: rate grids support all required burden code combinations without manual workarounds.
- Multi-company deployments can configure independent capacity and cost parameters per company.

### Technical Success

- All backend endpoints enforce RBAC via Access Manager before executing any operation.
- Concurrent edits are detected using PostgreSQL `xmin` and return a descriptive conflict error — no silent data loss.
- Calculated fields (NumberOfMachines, MachineSpeedFactor) are always consistent with the Machines master.
- The Search endpoint is LookupField-compatible and filters correctly by company visibility and active status.
- All functional acceptance criteria (AC-001 through AC-041) pass.

### Measurable Outcomes

| Outcome | Target |
|---------|--------|
| All acceptance criteria passing | 100% (AC-001 – AC-041) |
| RBAC enforced on every endpoint | 100% coverage |
| Concurrency conflict detection | Detected via xMin on every write |
| LookupField Search endpoint available | Ready before Routes feature |
| Dependency validation on delete | Machines + Routes + Substitutes checked |

---

## Product Scope

### MVP — Minimum Viable Product

All FRs (FR14–FR24) are **MVP**. Work Centers is a prerequisite for Routes and Production Orders; no phasing is possible.

| # | Feature Area | Included in MVP |
|---|---|---|
| FR14 | Create work center with full capacity & association fields | Yes |
| FR15 | Define standard and simulation cost rates globally | Yes |
| FR16 | Company override of overridable fields | Yes |
| FR17 | NULL override inherits global base value | Yes |
| FR18 | Assign substitute work centers (same installation) | Yes |
| FR19 | Delete with dependency validation | Yes |
| FR20 | Paginated list with filters and sorting | Yes |
| FR21 | LookupField-compatible Search endpoint | Yes |
| FR22 | RBAC on every operation | Yes |
| FR23 | Concurrency detection via PostgreSQL xmin | Yes |
| FR24 | Assign / unassign work center to companies | Yes |

### Growth Features (Post-MVP)

- **Duplicate work center** (FR-EXTRA from AC-006): copy a work center with its rates using a new code. Requires `manufacturing.work_centers.duplicate` permission.
- **Transfer rates** between Standard and Simulation types across multiple work centers of an installation. Requires `manufacturing.work_center_rates.update`.
- **Bulk company assignment** from the list view (beyond the post-save dialog).

### Vision (Future)

- Integration with capacity planning engine to automatically compute available capacity from work center + plant calendar + shifts.
- Work center utilization dashboards consuming real-time production order data.

---

## User Journeys

### Journey 1 — Ricardo, Global Administrator — Setting Up a New Production Line

Ricardo is the ERP administrator for a manufacturing company that just opened a new CNC machining cell. He needs to register the work center before the industrial engineers can design the routing for new parts.

He opens the Work Centers master, clicks **New**, and enters the work center code `CNC-01`, name `CNC Machining Cell 1`, and short name `CNC-01` (auto-filled on name blur). He selects the installation "Plant A", cost center "Manufacturing – Direct", and sets the burden code to **Machine Hours**. In the Capacity tab he enters standard speed 120, 2 shifts, 8 hours per shift, 95% average performance, and 80% desired load. He adds 3 standard cost rates with their burden codes, rates, and cost segments. On save, the system presents the **Company Assignment dialog**: Ricardo assigns the work center to `Company A` and `Company B`. Done in under 10 minutes.

The breakthrough: next morning the Routes team assigns `CNC-01` to the new part routing via LookupField with no extra coordination needed.

**Capabilities revealed:** Create form, capacity tab, standard rates grid, company assignment dialog, post-save flow, LookupField Search.

---

### Journey 2 — Valentina, Company Administrator — Configuring Company-Specific Parameters

Valentina manages the ERP configuration for Company B, which uses a different cost center and cost rates for the same shared work center `CNC-01`. She opens the work center in edit mode, selects the **Company B** context, and updates the cost center, the burden code, and the rate values. The immutable fields (Code, Name, ShortName) are read-only in her view. She saves successfully — Company A's configuration is unchanged.

**Capabilities revealed:** Edit mode company context selector, overridable vs. read-only fields per context, `work_centers_overrides` table, permission `manufacturing.work_centers.update`.

---

### Journey 3 — Diego, Routes Engineer — Selecting a Work Center in a Routing Step

Diego is designing a routing for a new product. In the routing operation form, he needs to assign a work center. He clicks the LookupField control, types "CNC", and a filtered list appears showing only active work centers visible to his company. He selects `CNC-01`. The operation step is saved with the correct reference.

**Capabilities revealed:** Search endpoint (`/search`), LookupField compatibility, filtering by company visibility and `is_active`.

---

### Journey 4 — Ricardo — Handling a Deletion Conflict

Ricardo tries to delete an obsolete work center `WC-LEGACY`. The system returns: *"El centro de trabajo existe en el maestro de rutas. No se puede eliminar."* He decides to deactivate it instead via the status toggle, removing it from future routing selections without losing historical data.

**Capabilities revealed:** Delete with dependency validation, status deactivation, error messaging, `is_active` override.

---

### Journey 5 — Ricardo — Resolving a Concurrency Conflict

Ricardo and a colleague both open `CNC-01` for editing at the same time. His colleague saves first. When Ricardo tries to save his changes, the system shows: *"El centro de trabajo ha sido modificado por otro usuario"* and offers **Force / Cancel**. Ricardo refreshes, sees the latest state, and decides to merge his changes manually before saving successfully.

**Capabilities revealed:** `xmin`-based concurrency detection, conflict error message, force-save option.

---

### Journey Requirements Summary

| Journey | Capabilities Required |
|---|---|
| Journey 1 | Create form, capacity tab, rates grid, company assignment dialog, Search endpoint |
| Journey 2 | Edit mode, company context selector, field-level read/edit based on IsImmutable/IsOverridable, update_global vs update permissions |
| Journey 3 | Search (LookupField), active + company visibility filters |
| Journey 4 | Delete dependency validation, status update (deactivate) |
| Journey 5 | xMin concurrency detection, conflict error, force-save option |

---

## Domain-Specific Requirements

### ERP Manufacturing — Context & Constraints

The Work Centers master operates within a multi-company ERP context where:

1. **Multi-tenancy via Override pattern**: Data isolation between companies is enforced at the application layer using `work_centers_overrides`. NULL in an override field means "inherit from global base".
2. **Cross-master dependencies**: Work centers are referenced by Machines (`machines` table), Operation Routes (`routing_operations`), and Production Orders. Deletion is blocked when any of these references exist.
3. **Calculated fields are server-authoritative**: `NumberOfMachines` and `MachineSpeedFactor` are never edited directly by users; they are recalculated on each save and whenever the Machines master changes.
4. **Immutable global identity**: `Code`, `Name`, and `ShortName` require `UPDATE_GLOBAL` permission. Any UI modification to these fields must be gated behind that permission.
5. **Rate validation complexity**: The `work_center_rates` grid has 7 validation rules involving burden code ordering, percentage references, and NIIF indicators from the cost segment. These rules must be enforced on both frontend and backend.

### Compliance & Access Control

- All operations are gated by **Access Manager RBAC** — no implicit authorization based on UI hiding alone.
- The `update_global` permission is reserved for system administrators; company admins only get `update`.
- Rate editing is controlled independently via `manufacturing.work_center_rates.update`.

### Industry Pattern: GLOBAL + Override (MasterPattern)

This feature implements `BaseMasterService<WorkCenter>` from the `ERP.MasterPattern` library. Key rules:
- `IsImmutable = true` → field is GLOBAL, requires `UPDATE_GLOBAL`, not present in overrides table.
- `IsOverridable = true` → field can be set per-company in `work_centers_overrides`; NULL = inherit.
- The effective value resolver in MasterPattern handles NULL inheritance transparently.

---

## Functional Requirements

> **Source:** `_bmad-output/shared-docs/Centros_de_Trabajo.md` — Centros de Trabajo v1.0

### Work Center CRUD

| ID | Requirement |
|----|-------------|
| FR14 | A global administrator can create a Work Center with: Code (unique, varchar 50), Name (varchar 250), ShortName (varchar 50, auto-filled from Name), and associations to Installation (StorageGroupID, required), Warehouse (StorageID, optional), Cost Center (CostCenterID, required), Responsible (ThirdPartyManagerID, optional), BurdenCode. Default values on creation: IsActive=true, BurdenCode=0, StandardSpeed=1, NumberOfShifts=0, HoursPerShift=8, AveragePerformance=100, DesiredLoadPercentage=100, IsCritical=false, UsePlantCalendar=false. |
| FR14a | On Name blur, if ShortName is empty, the system auto-fills ShortName with the leading characters of Name. |
| FR14b | When StorageGroupID changes, StorageID must be cleared. StorageID is only enabled when StorageGroupID has a value. |
| FR14c | StorageID must belong to the same Installation as StorageGroupID. If StorageID and CostCenterID are both set, their operational unit (C.O.) must match. |
| FR14d | After successful creation, the system automatically presents the Company Assignment dialog to assign the work center to one or more companies. |

| ID | Requirement |
|----|-------------|
| FR15 | A global administrator can define standard (RateType=0) and simulation (RateType=1) cost rates for a work center. Each rate has: RateNumber (sequential), RateBurdenCode (EnumRateBurdenCode), Rate (decimal), PercentageRateNumber (reference), CostSegmentID (FK to cost segments). Unique index on (work_center_id, rate_type, rate_number). |
| FR15a | Rate validation rules: (1) NoAplica(-1) → rate=0, no segment. (2) BurdenCodes 0–10 → PercentageRateNumber=0, segment required. (3) PorcentajeLinea(11) → not first rate; references a prior rate; segment required; cannot follow PorcentajeTodas. (4) PorcentajeTodas(12) → only one allowed; segment required. (5) Rate ≠ 0 unless NoAplica. (6) Percentage burden codes → rate < 999. (7) If segment has NIIF=0 → rate ≥ 0. |

| ID | Requirement |
|----|-------------|
| FR16 | A company administrator can override any `IsOverridable` field of a work center scoped to their company. Overridable fields: Description, IsActive, StorageGroupID, StorageID, CostCenterID, ThirdPartyManagerID, BurdenCode, StandardSpeed, NumberOfMachines, MachineSpeedFactor, NumberOfShifts, HoursPerShift, AveragePerformance, DesiredLoadPercentage, IsCritical, UsePlantCalendar. |
| FR17 | A NULL value in `work_centers_overrides` for any overridable field means the company inherits the global base value. The effective value resolver in MasterPattern handles this transparently. |
| FR18 | A global administrator can assign substitute work centers (AlternateWorkCenter) to a work center. Substitutes must belong to the same Installation (StorageGroupID). A work center cannot be its own substitute. No duplicate (work_center_id, alternate_work_center_id) pairs allowed. If the work center has substitutes, its Installation cannot be changed. |
| FR19 | A user can delete a work center only when it has no references in: `machines` table, `routing_operations` table, or `alternate_work_centers` (as a substitute). Descriptive error messages must be shown for each dependency type. On successful deletion, associated rates and company override records are also deleted. |

### List, Search & Visibility

| ID | Requirement |
|----|-------------|
| FR20 | The system exposes a paginated list of work centers filterable by: Code (partial text), Name (partial text), Installation (LookupField), IsActive (All/Active/Inactive), IsCritical (All/Yes/No), BurdenCode. Default sort: Code ASC. Column-header sorting supported. Pagination options: 10 / 20 / 50 / 100 records per page. Actions per row: Edit, View (read-only), Assign Company, Delete. |
| FR21 | The system exposes a LookupField-compatible `/search` endpoint for work centers, filtering by company visibility (assigned companies) and `is_active=true`. Used by Routes and other masters. |

### Security & Integrity

| ID | Requirement |
|----|-------------|
| FR22 | All work center operations (read, create, update, update_global, change_status, delete, assign, duplicate) are gated by RBAC permissions validated against Access Manager before execution. Permission set: `manufacturing.work_centers.*` and `manufacturing.work_center_rates.*`. |
| FR23 | Concurrent edit conflicts on work centers are detected using PostgreSQL `xmin`. When a conflict is detected, the system returns a descriptive error message and offers Force/Cancel options. |
| FR24 | A global administrator can assign or unassign a work center to/from one or more companies via the Company Assignment dialog (post-create and from list row action). |

### Calculated Fields

| ID | Requirement |
|----|-------------|
| FR-CALC-1 | `NumberOfMachines` is calculated server-side as the count of active machines (`ind_estado=1`) linked to the work center in the Machines master. This field is read-only in the UI. |
| FR-CALC-2 | `MachineSpeedFactor = Round(Sum(MachineSpeed × AverageEfficiency / 100) / StandardSpeed, 2)` for active machines. If no active machines, factor = 1. If factor ≤ 0, the system returns an error. |
| FR-CALC-3 | Displayed-only calculated fields in the Capacity tab: HoursPerDay = NumberOfShifts × HoursPerShift; DailyCapacity = MachineSpeedFactor × HoursPerDay; AvailableCapacity = DailyCapacity × (AveragePerformance/100) × (DesiredLoadPercentage/100). |

### Edit Form Modes

| ID | Requirement |
|----|-------------|
| FR-FORM-1 | **Create mode**: no company selector; record saved to global `work_centers` table; all fields visible per their definition. |
| FR-FORM-2 | **Edit mode — GLOBAL context** (requires `update_global`): Code, Name, ShortName are editable. Restriction: if work center is assigned to routing operations, StorageGroupID cannot be changed. |
| FR-FORM-3 | **Edit mode — Company context** (requires `update`): Code, Name, ShortName shown read-only; overridable fields editable. Only companies where the work center is assigned are selectable. |
| FR-FORM-4 | **View (read-only) mode**: all fields disabled. Company context selector still shown. Requires `manufacturing.work_centers.read`. |

---

## Non-Functional Requirements

### Security

- **NFR-SEC-1**: Every HTTP endpoint must validate the caller's permissions via Access Manager before executing any operation. HTTP 403 must be returned for unauthorized calls.
- **NFR-SEC-2**: `update_global` operations (modifying Code, Name, ShortName) must be restricted to users with `manufacturing.work_centers.update_global` even if the request is authenticated.

### Data Integrity & Concurrency

- **NFR-INT-1**: PostgreSQL `xmin` must be read on every GET and returned to the client. On PUT/DELETE the `xmin` sent by the client must match the current DB value; mismatch → HTTP 409 Conflict with descriptive message.
- **NFR-INT-2**: Deletion must be transactional — dependency checks and row deletion happen in a single transaction.
- **NFR-INT-3**: The `(work_center_id, rate_type, rate_number)` unique index on `work_center_rates` must be enforced at DB and application layer.

### Performance

- **NFR-PERF-1**: Paginated list endpoint must return results in < 500 ms for up to 10,000 work centers with standard filtering.
- **NFR-PERF-2**: The LookupField `/search` endpoint must return results in < 300 ms for typical searches.

### Usability

- **NFR-UX-1**: All validation errors must be field-level with descriptive messages in Spanish.
- **NFR-UX-2**: Dependent field behavior (StorageID enabled only when StorageGroupID is set; StorageID cleared on StorageGroupID change) must execute client-side without a server round-trip.
- **NFR-UX-3**: Short name auto-fill must trigger on Name field blur.

### Maintainability

- **NFR-MAIN-1**: The backend service must extend `BaseMasterService<WorkCenter>` from `ERP.MasterPattern` to inherit GLOBAL + Override resolution logic.
- **NFR-MAIN-2**: All enumeration values (EnumBurdenCode, EnumRateType, EnumRateBurdenCode) must be defined as C# enums and referenced consistently across frontend and backend.

---

## Acceptance Criteria Summary

> Full acceptance criteria (AC-001 through AC-041) are defined in `_bmad-output/shared-docs/Centros_de_Trabajo.md` §Criterios de Aceptación.

Key acceptance criteria groups:

| Group | Criteria IDs | Theme |
|-------|-------------|-------|
| Work center CRUD | AC-001 – AC-006 | Create, edit, validate, duplicate |
| Installation/Warehouse | AC-007 – AC-011 | LookupField dependencies and restrictions |
| Capacity | AC-012 – AC-018 | Validations and calculated fields |
| Rates | AC-019 – AC-024 | Rate grid validations and transfer |
| Substitutes | AC-025 – AC-028 | Substitute assignment validations |
| Delete & status | AC-029 – AC-034 | Dependency protection, deactivation, override isolation |
| Concurrency | AC-035 – AC-037 | xMin conflict detection and recovery |
| Permissions | AC-038 – AC-041 | RBAC enforcement per operation |

---

## Data Model Reference

> Full entity definitions, field tables, and MER diagram in `_bmad-output/shared-docs/Centros_de_Trabajo.md` §Entidades.

| Entity | Table | Purpose |
|--------|-------|---------|
| WorkCenter | `work_centers` | Global base record |
| WorkCenterRate | `work_center_rates` | Standard and simulation rate lines |
| AlternateWorkCenter | `alternate_work_centers` | Substitute work center associations |
| WorkCenterOverrides | `work_centers_overrides` | Per-company field overrides (PK: work_center_id + company_id) |

**Projected entities** (read-only references from other services): Companies, StorageGroups, Storages, CostCenters, ThirdParties, Users — see `_bmad-output/shared-docs/entidades-proyectadas.md`.

---

*PRD generated from functional specification `Centros_de_Trabajo.md` v1.0 (2026-02-19). All steps completed. Next: run `/shard-doc` or proceed to Architecture.*
