---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - '_bmad-output/planning-artifacts/prd/feature-centros-de-trabajo.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-specification.md'
feature: 'Centros de Trabajo'
epicRange: '4-6'
lastUpdated: '2026-03-11'
---

## Centros de Trabajo

### Epic 4: Work Centers Backend API

Enable the backend team to deliver a fully functional, independently deployable Work Centers API covering all CRUD operations, the GLOBAL + Override multi-company pattern, RBAC enforcement on every endpoint, PostgreSQL `xmin` optimistic concurrency, server-side calculated fields (NumberOfMachines, MachineSpeedFactor), 7-rule rate grid validation, substitute assignment, dependency-aware deletion, and a LookupField-compatible Search endpoint. The backend is production-ready and can be consumed by any client (real or mock).

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E4.1:** A global administrator can create a Work Center via API with all required associations (Code unique, Installation, Cost Center), and the system automatically assigns default capacity values and returns the created record with its `rowVersion`.
- [ ] **AC-E4.2:** A company administrator can override any overridable field via API scoped to their company, and the effective-value resolution correctly returns the overridden value — or the global base when the override is NULL.
- [ ] **AC-E4.3:** The paginated list endpoint returns Work Centers filtered and sorted correctly; the LookupField `/search` endpoint returns only active, company-visible Work Centers in under 300 ms.
- [ ] **AC-E4.4:** Attempting to delete a Work Center referenced by Machines or Routing Operations returns a descriptive error in Spanish; deleting an unreferenced Work Center also removes its rates and override records atomically.
- [ ] **AC-E4.5:** Concurrent edits are detected via `xmin` and return HTTP 409; unauthorized operations return HTTP 403; rate grid submissions violating any of the 7 burden code rules are rejected with field-level error messages.

**FRs covered:** FR14, FR14a, FR14b, FR14c, FR14d, FR15, FR15a, FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR-CALC-1, FR-CALC-2, FR-FORM-1, FR-FORM-2, FR-FORM-3, FR-FORM-4

---

#### Story 4.1: Work Center Domain Entities & Database Migration

As a backend developer,
I want the Work Center domain entities and database schema to be in place,
So that all subsequent stories can build on a stable, correctly-modelled data foundation.

**Acceptance Criteria:**

**Given** no Work Centers tables exist in the database
**When** the EF Core migration is applied
**Then** the following tables are created with all columns, FK constraints, and indexes as specified in the PRD:
- `work_centers` (PK uuid v7, all columns per field spec, FK to projected entity tables)
- `work_center_rates` (PK uuid v7, unique index on `(work_center_id, rate_type, rate_number)`)
- `alternate_work_centers` (composite PK `(work_center_id, alternate_work_center_id)`)
- `work_centers_overrides` (composite PK `(work_center_id, company_id)`, all overridable fields nullable)

**Given** the C# domain layer
**When** the entities are reviewed
**Then**:
- `WorkCenter` implements `IMasterEntity` and uses `Guid.CreateVersion7()` for its PK
- `WorkCenterRate`, `AlternateWorkCenter`, `WorkCenterOverride` entities exist with correct property types and audit fields (`CreatedAt DateTimeOffset`, `CreatedByUserID`, `UpdatedAt`, `UpdatedByUserID`)
- `EnumBurdenCode` (0–5), `EnumRateType` (0–1), `EnumRateBurdenCode` (−1, 0–8, 11, 12) are defined as C# enums
- `WorkCenter.DEFINITION` (`MasterDefinition`) is configured with all 19 fields, `IsImmutable` / `IsOverridable` flags matching the PRD spec exactly
- EF Core `ModelBuilder` configures `HasDefaultValueSql("NOW()")` for `created_at` and `HasColumnType` for all decimal fields with precision

**And** all fields use `DateTimeOffset` (never `DateTime`) for timestamps

---

#### Story 4.2: Create Work Center Command

As a global administrator,
I want to create a new Work Center via the API,
So that I can register productive units with all required capacity and association data.

**Acceptance Criteria:**

**Given** a global administrator with `manufacturing.work_centers.create` permission sends `POST /api/v1/work-centers`
**When** the request body contains a unique `Code`, valid `StorageGroupID`, and valid `CostCenterID`
**Then**:
- The Work Center is persisted to `work_centers` with the provided values
- Default values are applied server-side: `IsActive=true`, `BurdenCode=0`, `StandardSpeed=1`, `NumberOfShifts=0`, `HoursPerShift=8`, `AveragePerformance=100`, `DesiredLoadPercentage=100`, `IsCritical=false`, `UsePlantCalendar=false`
- `NumberOfMachines=0` and `MachineSpeedFactor=1` are set (no machines linked yet)
- If `ShortName` is omitted or empty, the server auto-fills it with the leading characters of `Name` (up to 50 chars)
- The response is HTTP 201 with the created DTO including `rowVersion` (xmin as uint)

**Given** the same request but with a `Code` that already exists
**When** the command is executed
**Then** HTTP 422 is returned with a field-level error: *"El código del centro de trabajo ya existe"*

**Given** a request where `StorageID` is provided but does not belong to the same `StorageGroupID` Installation
**When** the command is executed
**Then** HTTP 422 is returned with a descriptive error for the FK constraint violation

**Given** a request from a user without `manufacturing.work_centers.create`
**When** the endpoint is called
**Then** HTTP 403 is returned

---

#### Story 4.3: Get Work Center & LookupField Search

As a user of the system,
I want to retrieve a single Work Center and search for Work Centers via a LookupField endpoint,
So that I can view detail data and other masters (Routes, Machines) can discover work centers.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_centers.read` calls `GET /api/v1/work-centers/{id}`
**When** no `companyId` query parameter is provided (GLOBAL context)
**Then** the response contains the global base values for all fields plus `rowVersion`

**Given** the same call with `?companyId={id}` where the company has overrides
**When** MasterPattern's effective-value resolver processes the request
**Then** overridden fields show the company value; fields with NULL override show the global base value

**Given** a user calls `GET /api/v1/work-centers/search?q=CNC&companyId={id}`
**When** the LookupFieldQueryBuilder v0.0.5 (linq2db) processes the request
**Then**:
- Only Work Centers with `is_active=true` (resolved with company override) are returned
- Only Work Centers assigned to the requesting user's company appear
- Results match partial code/name search (case-insensitive)
- Results are sorted Code ASC
- Response time is under 300 ms
- Response shape conforms to the LookupField contract

**Given** a user without `manufacturing.work_centers.read`
**When** either endpoint is called
**Then** HTTP 403 is returned

---

#### Story 4.4: Work Center Paginated List

As a user with read access,
I want to retrieve a paginated, filterable, and sortable list of Work Centers,
So that I can browse and find work centers efficiently.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_centers.read` calls `GET /api/v1/work-centers`
**When** no filters are provided
**Then**:
- Results are returned sorted by `code` ASC
- Default page size is 20; response includes `totalCount`, `page`, `pageSize`, `totalPages`

**Given** the request includes filters: `?code=CNC&isActive=true&storageGroupId={id}&isCritical=true&burdenCode=1`
**When** the query is executed
**Then** only records matching all provided filters are returned (Code partial match is case-insensitive)

**Given** the request includes `?sortBy=name&sortDirection=desc&pageSize=50&page=2`
**When** the query is executed
**Then** results are sorted by Name DESC and the correct page slice is returned

**Given** a request with `pageSize=100` applied to a dataset of 10,000 records
**When** the query is executed
**Then** the response is returned in under 500 ms

---

#### Story 4.5: Update Work Center with Concurrency & Field Validation

As a global or company administrator,
I want to update a Work Center's fields via the API,
So that I can keep capacity, association, and configuration data current with proper conflict protection.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_centers.update_global` sends `PUT /api/v1/work-centers/{id}` with `rowVersion` matching the current `xmin`
**When** the request modifies `Code`, `Name`, or `ShortName`
**Then** the record is updated, calculated fields are recomputed, and the response includes the new `rowVersion`

**Given** a user with only `manufacturing.work_centers.update` (no `update_global`) sends the same request with `Code` modified
**When** the command is processed
**Then** HTTP 403 is returned with: *"No tiene permiso para modificar campos inmutables"*

**Given** any PUT where the client's `rowVersion` does NOT match the current DB `xmin`
**When** the command is executed
**Then** HTTP 409 is returned with: *"El centro de trabajo ha sido modificado por otro usuario"*

**Given** a PUT (GLOBAL context) on a Work Center that is referenced in `routing_operations` and the request changes `StorageGroupID`
**When** the command is processed
**Then** HTTP 422 is returned: *"No se puede cambiar la instalación: el centro de trabajo está asignado a rutas de operación"*

**Given** a PUT with company context (`?companyId={id}`) from a user with `manufacturing.work_centers.update`
**When** the request sets an overridable field to `null`
**Then** the `work_centers_overrides` row stores NULL for that field and the effective value returns the global base

**Given** the PUT succeeds (any context)
**When** NumberOfMachines and MachineSpeedFactor are recalculated
**Then** they are always derived from the Machines master (never taken from the request body)

---

#### Story 4.6: Work Center Rates Management

As a global administrator,
I want to manage standard and simulation cost rate grids for a Work Center via the API,
So that accurate production costing data is available for all burden code combinations.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_center_rates.update` sends a POST to create a new rate
**When** the rate has `RateBurdenCode=-1` (NotApplicable)
**Then** the rate is saved with `Rate=0` and `CostSegmentID=null`; any other combination is rejected

**Given** a rate submission where `RateBurdenCode` is in range 0–10
**When** validated server-side
**Then** `PercentageRateNumber` must be 0 and `CostSegmentID` must be provided; else HTTP 422

**Given** a rate with `RateBurdenCode=11` (PorcentajeLinea)
**When** validated
**Then** it must not be the first rate, must reference a prior valid `RateNumber`, must not immediately follow a `PorcentajeTodas(12)` rate; violations return HTTP 422

**Given** a rate with `RateBurdenCode=12` (PorcentajeTodas)
**When** validated
**Then** only one such rate is allowed per `(work_center_id, rate_type)`; second attempt returns HTTP 422

**Given** a rate where `Rate=0` but `RateBurdenCode ≠ -1`
**When** validated
**Then** HTTP 422 is returned

**Given** a rate where the linked `CostSegmentID` has `NIIF=0` and `Rate < 0`
**When** validated
**Then** HTTP 422 is returned

**Given** a new rate submitted with a `RateNumber` that already exists for the same `(work_center_id, rate_type)`
**When** the insert is attempted
**Then** HTTP 422 is returned: *"El número de tarifa ya existe para este tipo"*

---

#### Story 4.7: Substitute Work Centers Management

As a global administrator,
I want to assign and remove substitute Work Centers via the API,
So that production planners can redirect operations to alternative work centers when needed.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_centers.update_global` sends a POST to add a substitute
**When** the `AlternateWorkCenterID` belongs to a Work Center with the same `StorageGroupID` (Installation)
**Then** the `alternate_work_centers` record is created and HTTP 201 is returned

**Given** the same request but `AlternateWorkCenterID` references a Work Center in a different Installation
**When** the command is processed
**Then** HTTP 422: *"El centro de trabajo sustituto debe pertenecer a la misma instalación"*

**Given** a request where `AlternateWorkCenterID == WorkCenterID` (self-substitution)
**When** validated
**Then** HTTP 422: *"Un centro de trabajo no puede ser su propio sustituto"*

**Given** a request for a pair `(work_center_id, alternate_work_center_id)` that already exists
**When** the insert is attempted
**Then** HTTP 422: *"El sustituto ya está asignado a este centro de trabajo"*

**Given** a Work Center that has at least one substitute assigned
**When** a PUT attempts to change its `StorageGroupID`
**Then** HTTP 422: *"No se puede cambiar la instalación: el centro de trabajo tiene sustitutos asignados"*

**Given** a DELETE to remove a substitute
**When** the pair exists and the user has `update_global`
**Then** the record is removed and HTTP 204 is returned

---

#### Story 4.8: Company Assignment & Dependency-Aware Delete

As a global administrator,
I want to assign Work Centers to companies and delete unreferenced Work Centers,
So that companies can access the work centers they need and obsolete records can be cleaned up safely.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_centers.assign` sends `POST /api/v1/work-centers/{id}/companies` with a list of company IDs
**When** the request is processed
**Then**:
- A `work_centers_overrides` row is created for each new company (with `AssignedAt` timestamp and `AssignedByUserID`)
- Existing override rows for companies not in the list are deleted (unassign)
- HTTP 200 is returned with the updated list of assigned companies

**Given** a user with `manufacturing.work_centers.delete` sends `DELETE /api/v1/work-centers/{id}` and the work center is referenced in `machines`
**When** the delete is attempted
**Then** HTTP 409: *"El centro de trabajo existe en el maestro de máquinas. No se puede eliminar."*

**Given** the same DELETE but the reference is in `routing_operations`
**When** validated
**Then** HTTP 409: *"El centro de trabajo existe en el maestro de rutas. No se puede eliminar."*

**Given** the same DELETE but the work center is itself a substitute in `alternate_work_centers`
**When** validated
**Then** HTTP 409: *"El centro de trabajo es sustituto de otro centro de trabajo. No se puede eliminar."*

**Given** a DELETE on a Work Center with no dependencies but with rates, substitutes, and company overrides
**When** the transactional delete executes
**Then** the `work_center_rates`, `alternate_work_centers`, and `work_centers_overrides` rows are deleted in the same transaction, and HTTP 204 is returned

**Given** a DELETE where the client's `rowVersion` does not match the current `xmin`
**When** processed
**Then** HTTP 409: *"El centro de trabajo ha sido modificado por otro usuario"*

---

### Epic 5: Work Centers Frontend UI (Mock-Driven)

The frontend team delivers the complete Work Centers user interface — paginated list with filters and row actions, a 6-tab CRUD form (Generales, Capacidad, Tarifas Estándar, Tarifas Simulación, Sustitutos, Descripción), all four form modes (Create / Edit-Global / Edit-Company / View), the `InheritedField` component with "Heredado" badge and "Restablecer" button, Company Assignment dialog, real-time capacity display fields, and the rate grid with client-side 7-rule validation — all driven by **MSW mock data**. The UI is fully navigable, tested, and integration-ready.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E5.1:** A user can navigate the Work Centers list, apply all available filters (Code, Name, Status, Installation, IsCritical, BurdenCode), paginate results, and access Edit / View / Assign Company / Delete actions per row — all rendered correctly with mock data.
- [ ] **AC-E5.2:** A global administrator can open the Create form, fill in all fields across 6 tabs (with ShortName auto-fill on Name blur, StorageID enabling/clearing on Installation change), save, and see the Company Assignment dialog automatically — all using mocks.
- [ ] **AC-E5.3:** A company administrator can open Edit-Company mode, see immutable fields as read-only display text, edit overridable fields, see the "Heredado" badge on inherited NULL values, and reset a field to NULL with "Restablecer" — all validated visually with mocks.
- [ ] **AC-E5.4:** The rate grids (Standard and Simulation) enforce all 7 burden code validation rules client-side with descriptive error messages in Spanish before submission.
- [ ] **AC-E5.5:** The Capacity tab displays HoursPerDay, DailyCapacity, and AvailableCapacity in real-time as the user changes capacity inputs; concurrency conflict and delete dependency messages appear with the correct UX (Force/Cancel modal, Spanish dependency error).

**FRs covered:** FR14a, FR14b, FR14c, FR14d, FR15a, FR16, FR17, FR18, FR19, FR20, FR22, FR23, FR24, FR-CALC-3, FR-FORM-1, FR-FORM-2, FR-FORM-3, FR-FORM-4

---

#### Story 5.1: Work Centers Module Setup & List View

As a user with read access,
I want to open the Work Centers module and see a filterable, paginated list,
So that I can browse and find work centers quickly.

**Acceptance Criteria:**

**Given** the Work Centers module is configured in the Manufacturing microfrontend routing
**When** a user navigates to `/manufacturing/work-centers`
**Then** the list view renders with columns: Code, Name, ShortName, IsActive (status chip), Installation, IsCritical

**Given** MSW mock handlers are registered for `GET /api/v1/work-centers`
**When** the list loads
**Then** mock data is displayed correctly; pagination controls show page size options 10/20/50/100; default sort is Code ASC

**Given** the user types in the Code filter
**When** the input changes (debounced)
**Then** the mock handler is called with the `code` query parameter and the list re-renders

**Given** the user applies any combination of filters (Name, IsActive, Installation LookupField, IsCritical, BurdenCode)
**When** each filter is changed
**Then** the list updates accordingly using mock responses

**Given** the user has `manufacturing.work_centers.create` permission (from mock auth context)
**When** the list renders
**Then** a "Nuevo" button is visible; without the permission, it is hidden

**Given** each row in the list
**When** rendered with the appropriate mock permissions
**Then** Edit, View, Assign Company, and Delete action buttons appear per permission rules

---

#### Story 5.2: Work Center Create Form — Generales & Capacidad Tabs

As a global administrator,
I want to create a new Work Center using the multi-tab form,
So that I can register all general and capacity data in a single, guided flow.

**Acceptance Criteria:**

**Given** the user clicks "Nuevo"
**When** the Create form opens
**Then** it shows in Create mode (no company selector) with 6 tabs; the Generales tab is active and all fields have correct default values applied (IsActive=true, BurdenCode=NoHours, etc.)

**Given** the user fills in the `Name` field and then leaves it (blur)
**When** `ShortName` is currently empty
**Then** `ShortName` is auto-filled client-side with the leading characters of `Name`

**Given** the user selects a `StorageGroupID` (Installation) from the LookupField
**When** `StorageGroupID` changes
**Then** `StorageID` is cleared and re-enabled for a new selection (using mock LookupField data)

**Given** `StorageGroupID` is empty
**When** the user focuses on the `StorageID` LookupField
**Then** the field is disabled with a tooltip explaining it requires Installation first

**Given** the user opens the Capacidad tab
**When** values for `NumberOfShifts`, `HoursPerShift`, `AveragePerformance`, and `DesiredLoadPercentage` are entered
**Then** the calculated display fields update in real-time:
- HoursPerDay = NumberOfShifts × HoursPerShift
- DailyCapacity = MachineSpeedFactor × HoursPerDay
- AvailableCapacity = DailyCapacity × (AveragePerformance/100) × (DesiredLoadPercentage/100)

**Given** `NumberOfMachines` and `MachineSpeedFactor` fields in Capacidad
**When** rendered
**Then** they are always read-only (never editable inputs)

---

#### Story 5.3: Work Center Form — Rates, Substitutes & Save Flow

As a global administrator,
I want to define rate grids and substitute work centers in the form and save the record,
So that costing and alternative routing data are captured as part of the same creation flow.

**Acceptance Criteria:**

**Given** the user opens the Tarifas Estándar tab
**When** they add a rate row
**Then** the grid shows: RateBurdenCode (select), Rate (number), PercentageRateNumber (number, conditionally enabled), CostSegmentID (LookupField) with Add/Delete row actions

**Given** the user sets `RateBurdenCode = NotApplicable(-1)`
**When** the row is validated
**Then** `Rate` is forced to 0 and `CostSegmentID` is cleared and disabled client-side

**Given** the user sets `RateBurdenCode = PorcentajeLinea(11)` as the first rate row
**When** blur or save is triggered
**Then** client-side validation shows: *"El código de carga Porcentaje sobre una línea no puede ser el primero"*

**Given** the user attempts to add a second `PorcentajeTodas(12)` rate
**When** the row type is selected
**Then** immediate inline error: *"Solo se permite un Porcentaje sobre las demás líneas por tarifa"*

**Given** a Rate = 0 with a BurdenCode other than NotApplicable
**When** blur validation runs
**Then** error: *"La tarifa debe ser diferente de cero"*

**Given** the Sustitutos tab
**When** the user adds an alternate work center via LookupField
**Then** the substitute appears in the grid; the LookupField is filtered to show only work centers (from mock) with the same Installation

**Given** the user clicks Save with all required fields valid
**When** the mock POST responds with 201
**Then** the Company Assignment dialog opens automatically (FR14d)

---

#### Story 5.4: Company Assignment Dialog

As a global administrator,
I want to assign or unassign Work Centers to companies via a dialog,
So that each company can access only the work centers relevant to them.

**Acceptance Criteria:**

**Given** the Create form save succeeds
**When** the Company Assignment dialog opens automatically
**Then** it displays a list of all available companies (from mock) with checkboxes; companies already assigned are pre-checked

**Given** the user checks/unchecks companies and clicks "Guardar"
**When** the mock `POST /api/v1/work-centers/{id}/companies` is called
**Then** the dialog closes and a success toast is shown

**Given** the user clicks "Omitir" or closes the dialog
**When** the dialog dismisses
**Then** no assignment call is made and the user returns to the list view

**Given** the user clicks "Assign Company" from a list row action
**When** the dialog opens for that existing Work Center
**Then** companies already assigned are pre-checked; the user can modify and save

**Given** the dialog is open
**When** the mock returns an error
**Then** an inline error message is displayed within the dialog (not a page redirect)

---

#### Story 5.5: Edit Form — Global Context

As a global administrator,
I want to edit a Work Center in GLOBAL context (all fields including immutable ones),
So that I can correct the code, name, or any other base configuration.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_centers.update_global` clicks Edit from the list
**When** the form opens in Edit-Global mode
**Then** `Code`, `Name`, and `ShortName` are editable inputs; the form is pre-filled with data from the mock GET response including `rowVersion`

**Given** the Work Center has routing operations assigned (mock indicates this)
**When** the Edit-Global form renders
**Then** the `StorageGroupID` field is disabled with a tooltip: *"No se puede cambiar la instalación: el centro de trabajo está asignado a rutas de operación"*

**Given** the user modifies allowed fields and clicks Save
**When** the mock PUT is called with the correct `rowVersion`
**Then** success toast is shown and the form closes

**Given** the mock simulates a `409 Conflict` (concurrency conflict)
**When** the save is attempted
**Then** a modal dialog appears with two options: **"Forzar guardado"** and **"Cancelar"**

**Given** the user clicks "Forzar guardado"
**When** the PUT is re-sent with `?force=true`
**Then** the mock accepts and the form saves successfully

---

#### Story 5.6: Edit Form — Company Context & InheritedField Component

As a company administrator,
I want to edit a Work Center in company context with clear visual distinction between overridden and inherited values,
So that I can configure company-specific settings without confusion about what is overriding the global base.

**Acceptance Criteria:**

**Given** a user with `manufacturing.work_centers.update` opens Edit mode
**When** the form loads with a company context selector
**Then** only companies where the Work Center is assigned (from mock) appear in the selector dropdown

**Given** the user selects a company in the context selector
**When** the form re-loads with company-specific data from mock
**Then** `Code`, `Name`, and `ShortName` are shown as read-only **display text** (not disabled inputs — no greyed-out styling)

**Given** an overridable field that has a `null` override (inherited from global)
**When** rendered using the `InheritedField` component
**Then** the field shows a "Heredado" badge alongside the global base value; the field is still editable

**Given** the user types a value into an inherited field
**When** the field gets a non-null value
**Then** the "Heredado" badge disappears and a "Restablecer" button appears

**Given** the user clicks "Restablecer" on a field with an override
**When** the action is confirmed
**Then** the field returns to the "Heredado" state (override will be saved as NULL)

**Given** the user saves in company context
**When** the mock PUT with `?companyId={id}` is called
**Then** success toast is shown; the list view still shows the global base values (not the company override)

---

#### Story 5.7: View Mode, Delete Flow & Status Toggle

As any user with read access,
I want to view Work Center details in read-only mode, safely delete unreferenced records, and toggle active status,
So that I can inspect data without risk of accidental edits and manage the lifecycle of work centers.

**Acceptance Criteria:**

**Given** a user with only `manufacturing.work_centers.read` clicks View from the list
**When** the form opens in View mode
**Then** all fields are disabled; the company context selector is still visible for navigation; no Save or Edit buttons are shown

**Given** the user changes the company in the context selector while in View mode
**When** the mock GET is called with the new `companyId`
**Then** the form refreshes showing effective values for that company (all still read-only)

**Given** the user clicks Delete from a list row
**When** a confirmation dialog appears and the user confirms
**Then** the mock `DELETE` is called; if the mock returns 409 with a dependency message
**Then** the confirmation dialog is replaced by an error message in Spanish (e.g., *"El centro de trabajo existe en el maestro de rutas. No se puede eliminar."*) with only a "Cerrar" button

**Given** the mock DELETE returns 204
**When** delete succeeds
**Then** the row is removed from the list and a success toast is shown

**Given** a user with `manufacturing.work_centers.change_status` views the list
**When** they toggle the status chip on a row
**Then** the mock PATCH/PUT for status change is called and the chip updates to the new status

---

### Epic 6: Work Centers Integration & End-to-End Validation

Connect the Work Centers frontend UI to the real backend API by replacing all MSW mocks with production API calls. Validate all user journeys end-to-end across the full stack (create, edit-global, edit-company, view, delete, search, company assignment, concurrency conflict, dependency error). The feature is production-ready, all 41 PRD acceptance criteria pass, and no mock infrastructure remains in the production bundle.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E6.1:** A global administrator completes the full creation flow end-to-end — fills the form, saves, and immediately assigns the new Work Center to companies — with all data persisting correctly in the PostgreSQL database.
- [ ] **AC-E6.2:** A company administrator opens an assigned Work Center, overrides company-specific fields, and verifies other companies' configurations are unaffected — confirmed via the real API and database.
- [ ] **AC-E6.3:** The LookupField `/search` endpoint is consumed correctly by the frontend; routes and machines forms can select active, company-visible Work Centers with results under 300 ms.
- [ ] **AC-E6.4:** All 41 PRD acceptance criteria (AC-001–AC-041) pass against the real backend, including rate validation rules, dependency delete errors, `xmin` concurrency detection, and RBAC enforcement.
- [ ] **AC-E6.5:** All MSW mock handlers for the Work Centers module have been removed; the frontend makes only real API calls in production mode and the mock code does not appear in the production bundle.

**FRs covered:** All FRs end-to-end (FR14–FR24, FR-CALC-1–3, FR-FORM-1–4)

---

#### Story 6.1: API Client Integration & Mock Removal

As a developer,
I want to replace all Work Centers MSW mocks with real API client calls,
So that the UI interacts with the actual backend and mock infrastructure is completely removed.

**Acceptance Criteria:**

**Given** the Work Centers frontend module
**When** MSW mock handlers for `/api/v1/work-centers/*` are removed
**Then** all API calls route to the real backend service; no MSW mock code for Work Centers remains in the codebase

**Given** the real `GET /api/v1/work-centers` endpoint
**When** called from the list view with the authenticated user's JWT
**Then** the list renders with real data; filters, sorting, and pagination all function correctly

**Given** the real `POST /api/v1/work-centers` endpoint
**When** the Create form is submitted with valid data
**Then** HTTP 201 is returned and the new record appears in the list

**Given** the real `GET /api/v1/work-centers/search` endpoint
**When** called from LookupField controls (Installation, Substitutes)
**Then** results are returned in under 300 ms and the LookupField displays them correctly

**Given** the real `PUT /api/v1/work-centers/{id}` endpoint
**When** the Edit form (Global or Company context) is saved
**Then** changes persist and are reflected immediately in the list and detail views

**Given** the real `DELETE /api/v1/work-centers/{id}` endpoint
**When** delete is triggered and a dependency exists
**Then** the frontend shows the Spanish dependency error message returned by the backend

---

#### Story 6.2: End-to-End User Journey Validation

As a QA engineer,
I want to validate all five core user journeys through the complete stack,
So that the Work Centers feature is confirmed production-ready before enabling downstream features (Routes, Machines).

**Acceptance Criteria:**

**Given** Journey 1 — Ricardo creates a new Work Center
**When** he fills all 6 tabs, saves, and assigns to companies via the Company Assignment dialog
**Then** the `work_centers` row and `work_centers_overrides` rows are present in the database with correct values

**Given** Journey 2 — Valentina overrides Company B settings
**When** she saves overrides for Cost Center and BurdenCode in company context
**Then** Company A's configuration remains unchanged (verified via `GET /api/v1/work-centers/{id}?companyId={companyA_id}`)

**Given** Journey 3 — Diego selects a Work Center via LookupField in the Routes form
**When** he types a partial code in the LookupField
**Then** only active, company-visible Work Centers appear and the selection is saved correctly to the routing operation

**Given** Journey 4 — Ricardo tries to delete a Work Center referenced by Routes
**When** the delete is confirmed in the UI
**Then** the backend returns 409 and the frontend shows: *"El centro de trabajo existe en el maestro de rutas. No se puede eliminar."*

**Given** Journey 5 — Two users edit the same Work Center concurrently
**When** the second save is submitted with a stale `rowVersion`
**Then** the frontend shows the Force/Cancel modal; selecting "Forzar guardado" re-sends with `?force=true` and succeeds

---

#### Story 6.3: Full Acceptance Criteria Suite & Production Readiness

As a QA engineer,
I want all 41 PRD acceptance criteria to pass and the feature to meet all NFR targets,
So that Work Centers is released as a stable foundation for the Routes and Machines features.

**Acceptance Criteria:**

**Given** the integration test suite for Work Centers backend
**When** all tests are run against the real database
**Then** acceptance criteria AC-001 through AC-041 (from `Centros_de_Trabajo.md`) all pass

**Given** the NFR performance targets
**When** measured under representative load
**Then**:
- `GET /api/v1/work-centers` with filters returns in < 500 ms for 10,000 records
- `GET /api/v1/work-centers/search` returns in < 300 ms

**Given** the production frontend bundle
**When** inspected
**Then** no MSW handler code, no mock factory functions, and no test fixtures for Work Centers are present in the output

**Given** the RBAC matrix for all Work Center permissions
**When** each endpoint is called with a user lacking the required permission
**Then** HTTP 403 is returned consistently (verified for: read, create, update, update_global, change_status, delete, assign, work_center_rates.update)

**Given** the sprint status file
**When** this story is completed
**Then** `epic-03-centros-de-trabajo` is marked as `done` with completion date in `sprint-status.yaml`