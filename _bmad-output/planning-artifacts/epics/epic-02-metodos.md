---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
inputDocuments:
  - _bmad-output/planning-artifacts/prd/feature-metodos.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
workflowType: create-epics-and-stories
feature: Methods
parallelStrategy: backend-frontend-integration
lastStep: step-03-create-stories
---

## Métodos

> **Estrategia de paralelismo:** Epic 2 (Backend) y Epic 3 (Frontend) se ejecutan en paralelo desde el día 1.
> Epic 3 usa un mock adapter que replica el contrato del API. Epic 4 inicia cuando Epic 2 tiene
> suficientes endpoints operativos.

---

### Epic 2: Methods Backend API

Entregar una API REST completa, probada y production-ready para el Maestro de Métodos, que cualquier cliente (frontend u otro servicio) pueda consumir de forma independiente. Incluye persistencia, lógica de negocio GLOBAL+Override, RBAC, concurrencia y el endpoint de LookupField.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E2.1:** Un administrador global puede crear, editar y eliminar Métodos vía API; el registro semilla `0001` ("Estándar") no puede ser modificado ni eliminado bajo ninguna circunstancia.
- [ ] **AC-E2.2:** Un administrador de empresa puede guardar overrides de Description, UseCode e IsActive para su empresa; estos overrides no impactan a otras empresas; un campo sin override hereda el valor global automáticamente.
- [ ] **AC-E2.3:** El endpoint `/search` retorna Métodos filtrados por empresa activa, estado activo y UseCode de contexto (excluyendo CostingOnly para Rutas/BOM); la respuesta cumple el contrato LookupFieldQueryBuilder v0.0.5.
- [ ] **AC-E2.4:** Intentar eliminar un Método referenciado en Grupos de Costos, Lista de Materiales o Rutas retorna un error con el nombre específico del maestro dependiente.
- [ ] **AC-E2.5:** Dos usuarios editando el mismo Método simultáneamente reciben un error de conflicto (HTTP 409) con opción Force/Cancel; ninguno pierde sus datos silenciosamente.

**FRs covered:** FR1, FR2, FR4, FR5, FR6, FR7, FR8, FR9, FR11, FR12, FR13

---

#### Story 2.1: Method Domain Entity, DB Schema & Seed Migration

As a backend developer,
I want the `MethodEntity`, `MethodOverrideEntity`, and `MasterDefinition` configuration defined with their corresponding database migrations,
So that all subsequent stories have a stable domain model and schema to build upon.

**Acceptance Criteria:**

**Given** the solution already has the Clean Architecture scaffold and `Siesa.MasterPattern v0.1.3` installed
**When** the EF Core migration is applied
**Then** the tables `mfgstructure.methods` and `mfgstructure.methods_overrides` are created with all columns, types, constraints, and indexes defined in the PRD:
- `methods`: `id` (uuid v7 PK), `code` varchar(4) unique not null, `name` varchar(250) not null, `description` varchar(2000) nullable, `use_code` smallint not null, `is_active` bool not null default true, `is_immutable` bool not null default false, audit columns, `xmin` system column exposed as `rowVersion`
- `methods_overrides`: composite PK `(method_id, company_id)`, nullable overridable fields, audit columns
- Unique constraint `uq_methods_code` on `methods.code`
- FK `methods_overrides.method_id → methods.id`

**Given** the migration runs successfully
**When** the seed data migration step executes
**Then** the record `{ code: "0001", name: "Estándar", use_code: 0, is_active: true, is_immutable: true }` exists in `mfgstructure.methods` and cannot be absent (migration fails with clear error if insert fails)

**Given** the `MethodEntity` is mapped in EF Core
**When** the `MasterDefinition` static property is inspected
**Then** it reflects exactly: Code (IsImmutable=true, IsOverridable=false), Name (IsImmutable=true, IsOverridable=false), Description (IsImmutable=false, IsOverridable=true), UseCode (IsImmutable=false, IsOverridable=true), IsActive (IsImmutable=false, IsOverridable=true)

**Tasks:**
- [ ] Define `MethodEntity : IMasterEntity` in `Domain/Methods/Entities/` with all fields, UUID v7 factory, private EF constructor
- [ ] Define `MethodOverrideEntity` in `Domain/Methods/Entities/` with composite PK and nullable overridable fields
- [ ] Define `EnumMethodUseCode` enum (0=ManufacturingAndCosting, 1=ManufacturingOnly, 2=CostingOnly)
- [ ] Define `MasterDefinition DEFINITION` static field on `MethodEntity` with correct IsImmutable/IsOverridable per field
- [ ] Configure EF Core entity mappings in `Infrastructure/Data/Configurations/Methods/`
- [ ] Create EF Core migration for `methods` and `methods_overrides` tables with all constraints
- [ ] Add seed migration inserting record `0001` with `is_immutable = true`
- [ ] Write unit test validating `MasterDefinition` field flags match PRD spec

---

#### Story 2.2: Create Method Command + Real-time Code Uniqueness Validation

As a global administrator,
I want to create a new Method via POST and validate code uniqueness before submission,
So that the Methods catalog can be populated with valid, non-duplicate entries.

**Acceptance Criteria:**

**Given** I send `POST /api/v1/methods` with a valid payload `{ code, name, useCode, description?, isActive? }` and a JWT with `manufacturing.methods.create` permission
**When** the code does not already exist in `mfgstructure.methods`
**Then** the system creates the record with `Guid.CreateVersion7()` PK, returns HTTP 201 with the created entity including `rowVersion`, and Code is trimmed and uppercased

**Given** I send `POST /api/v1/methods` with a code that already exists
**When** the command validates uniqueness
**Then** the system returns HTTP 400 Problem Details with error message "The method already exists" referencing the `code` field

**Given** I send `GET /api/v1/methods/check-code?code=ABCD` (uniqueness check endpoint for on-blur)
**When** the code exists
**Then** returns HTTP 200 `{ "exists": true }`; when it does not exist, returns HTTP 200 `{ "exists": false }`; response must arrive within 200ms

**Given** I send `POST /api/v1/methods` with a JWT that lacks `manufacturing.methods.create`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Given** I send `POST /api/v1/methods` with Code missing or Name missing
**When** FluentValidation executes
**Then** returns HTTP 400 with field-level error array indicating which fields are required

**Tasks:**
- [ ] Implement `CreateMethodCommand` + `CreateMethodCommandHandler` in `Application/Methods/Commands/`
- [ ] Add FluentValidation validator: Code required (max 4 chars), Name required (max 250 chars)
- [ ] Implement code uniqueness check in handler (via repository)
- [ ] Implement `GET /api/v1/methods/check-code` lightweight endpoint using linq2db for < 200ms response
- [ ] Implement `POST /api/v1/methods` Minimal API endpoint in `API/Endpoints/Methods/`
- [ ] Add RBAC middleware check for `manufacturing.methods.create`
- [ ] Write integration tests: happy path, duplicate code (400), missing fields (400), unauthorized (403)

---

#### Story 2.3: Edit Method — Global Context (Immutable Fields + Seed Protection)

As a global administrator,
I want to edit the global base fields of an existing Method,
So that I can update method metadata without affecting company-specific overrides.

**Acceptance Criteria:**

**Given** I send `PUT /api/v1/methods/{id}` with `{ name, description, useCode, isActive, rowVersion }` and a JWT with `manufacturing.methods.update_global`
**When** the method exists and `rowVersion` matches the current `xmin`
**Then** the system updates Name, Description, UseCode, IsActive on the global `methods` record and returns HTTP 200 with updated entity and new `rowVersion`

**Given** I send `PUT /api/v1/methods/{id}` and attempt to change `code`
**When** the command handler processes the request
**Then** the `code` field is ignored (read-only after creation); the record's code remains unchanged

**Given** I send `PUT /api/v1/methods/0001-...` (the seed record with is_immutable=true)
**When** the service evaluates the immutability guard
**Then** returns HTTP 409 Problem Details: "Methods with code 0001 cannot be modified"

**Given** I send `PUT /api/v1/methods/{id}` with a `rowVersion` that does not match the current `xmin`
**When** concurrency validation runs
**Then** returns HTTP 409 Problem Details: "The method has been modified by another user" with `{ "forceUrl": "/api/v1/methods/{id}?force=true" }` hint

**Given** I send `PUT /api/v1/methods/{id}` with a JWT that has only `manufacturing.methods.update` (not `update_global`)
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `UpdateMethodGlobalCommand` + handler with `BaseMasterService<MethodEntity>` orchestration
- [ ] Add seed immutability guard in service (check `is_immutable` before any write)
- [ ] Add `xmin` concurrency validation; expose `?force=true` bypass (requires `update_global`)
- [ ] Map `PUT /api/v1/methods/{id}` Minimal API endpoint
- [ ] Write integration tests: happy path, seed guard (409), concurrency conflict (409), missing `update_global` (403)

---

#### Story 2.4: Edit Method — Company Override (GLOBAL+Override Pattern)

As a company administrator,
I want to save company-scoped overrides for overridable Method fields,
So that my company's configuration differs from the global defaults without affecting other companies.

**Acceptance Criteria:**

**Given** I send `PUT /api/v1/methods/{id}/overrides` with `{ companyId, description?, useCode?, isActive?, rowVersion }` and a JWT with `manufacturing.methods.update`
**When** the method is assigned to the company and `rowVersion` matches
**Then** the system upserts the row in `methods_overrides` for `(method_id, company_id)` with only the provided fields; omitted fields are stored as NULL (inherit global)

**Given** the company override row has `use_code = NULL` and `is_active = NULL`, only `description` is set
**When** I query the effective method for that company via `GET /api/v1/methods/{id}?companyId={id}`
**Then** the response shows: `description` = the override value; `useCode` = global base value; `isActive` = global base value; each field includes a `source` indicator ("override" | "global")

**Given** I send `PUT /api/v1/methods/{id}/overrides` with a `companyId` to which the method is not assigned
**When** the service validates company membership
**Then** returns HTTP 404 Problem Details: "The method is not assigned to this company"

**Given** I send `PUT /api/v1/methods/{id}/overrides` with a JWT that lacks `manufacturing.methods.update`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `UpsertMethodOverrideCommand` + handler; leverage `BaseMasterService<MethodEntity>` override resolution
- [ ] Implement `GET /api/v1/methods/{id}` effective-value query with `?companyId` optional param; include `source` field per overridable property
- [ ] Map `PUT /api/v1/methods/{id}/overrides` and `GET /api/v1/methods/{id}` Minimal API endpoints
- [ ] Write integration tests: upsert override, partial override + inheritance verification, not-assigned company (404), unauthorized (403)

---

#### Story 2.5: Company Assignment — Assign and Unassign

As a global administrator,
I want to assign and unassign Methods to companies,
So that each company has visibility only over the Methods relevant to their operations.

**Acceptance Criteria:**

**Given** I send `POST /api/v1/methods/{id}/companies` with `{ companyIds: [uuid, ...] }` and JWT with `manufacturing.methods.assign`
**When** the method exists and all `companyIds` are valid (exist in `segm_companies_prj`)
**Then** the system creates rows in `methods_overrides` for each new `(method_id, company_id)` pair (idempotent — already assigned companies are not duplicated) and returns HTTP 200 with updated assignment list

**Given** I send `DELETE /api/v1/methods/{id}/companies/{companyId}` with JWT with `manufacturing.methods.assign`
**When** the method is assigned to that company
**Then** the system deletes the row from `methods_overrides` for `(method_id, company_id)` and returns HTTP 204

**Given** I send `GET /api/v1/methods/{id}/companies` with JWT with `manufacturing.methods.read`
**When** the method has assignments
**Then** returns the list of assigned companies with their override summaries (which fields are overridden vs inherited)

**Given** I send `POST /api/v1/methods/{id}/companies` with a JWT lacking `manufacturing.methods.assign`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `AssignMethodToCompaniesCommand` + handler (idempotent batch insert into `methods_overrides`)
- [ ] Implement `UnassignMethodFromCompanyCommand` + handler
- [ ] Implement `GetMethodCompanyAssignmentsQuery` + handler
- [ ] Map `POST /api/v1/methods/{id}/companies`, `DELETE /api/v1/methods/{id}/companies/{companyId}`, `GET /api/v1/methods/{id}/companies` endpoints
- [ ] Write integration tests: assign (idempotent), unassign, list assignments, unauthorized (403)

---

#### Story 2.6: Delete Method with Dependency Guard + Seed Protection

As a user with delete permission,
I want to delete a Method that has no active dependencies,
So that the Methods catalog can be kept clean without breaking dependent masters.

**Acceptance Criteria:**

**Given** I send `DELETE /api/v1/methods/{id}` with JWT with `manufacturing.methods.delete` and the method has no references in Cost Groups, BOM, or Routes tables
**When** the service checks dependencies
**Then** the system deletes the method and all its `methods_overrides` rows and returns HTTP 204

**Given** I send `DELETE /api/v1/methods/{id}` and the method is referenced in `t803_mf_grupos_costos`
**When** the dependency guard runs
**Then** returns HTTP 409 Problem Details: "The method exists in the Cost Groups master. It cannot be deleted"

**Given** I send `DELETE /api/v1/methods/{id}` and the method is referenced in `t820_mf_lista_material`
**When** the dependency guard runs
**Then** returns HTTP 409 Problem Details: "The method exists in the Bill of Materials master. It cannot be deleted"

**Given** I send `DELETE /api/v1/methods/0001-...` (seed record, is_immutable=true)
**When** the immutability guard runs
**Then** returns HTTP 409 Problem Details: "Methods with code 0001 cannot be deleted"

**Given** I send `DELETE /api/v1/methods/{id}` with JWT lacking `manufacturing.methods.delete`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `DeleteMethodCommand` + handler
- [ ] Add dependency check against `t803_mf_grupos_costos`, `t820_mf_lista_material`, and routing_operations tables; each dependency returns its specific error message
- [ ] Add seed immutability guard (check `is_immutable` before delete)
- [ ] Cascade delete: on success, also delete all `methods_overrides` rows for that method
- [ ] Map `DELETE /api/v1/methods/{id}` Minimal API endpoint
- [ ] Write integration tests: safe delete (204), each dependency type (409 with correct message), seed guard (409), unauthorized (403)

---

#### Story 2.7: Methods List Query — Pagination, Filtering & Sorting

As a user with read permission,
I want to query a paginated, filtered list of Methods,
So that I can find and review methods without loading the entire catalog at once.

**Acceptance Criteria:**

**Given** I send `GET /api/v1/methods?page=1&pageSize=20` with a valid JWT with `manufacturing.methods.read`
**When** the query executes
**Then** returns HTTP 200 with a paginated response: `{ items: [...], totalCount, page, pageSize }` containing all methods sorted by Code ASC by default; response arrives within 500ms for datasets up to 10,000 records

**Given** I send `GET /api/v1/methods?code=000&name=stan&useCode=0&isActive=true`
**When** filters are applied
**Then** returns only methods matching ALL provided filters (AND logic); `code` and `name` are partial-match case-insensitive; `useCode` and `isActive` are exact-match

**Given** I send `GET /api/v1/methods?sortBy=name&sortDir=desc`
**When** sorting is applied
**Then** returns methods sorted by the specified column in the specified direction

**Given** I send `GET /api/v1/methods` with a JWT lacking `manufacturing.methods.read`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `GetMethodsListQuery` + handler using LinqKit composable predicates for multi-filter support
- [ ] Add pagination support (page, pageSize 10/20/50/100)
- [ ] Add column filtering (code partial, name partial, useCode exact, isActive exact)
- [ ] Add column sorting (code, name, useCode, isActive; default: code ASC)
- [ ] Map `GET /api/v1/methods` Minimal API endpoint
- [ ] Write integration tests: default list, filter combinations, sorting, pagination, unauthorized (403)
- [ ] Performance test: verify < 500ms with 10,000 records via Testcontainers

---

#### Story 2.8: LookupField Search Endpoint

As a dependent master (Routes, BOM, Cost Groups),
I want to search Methods via a LookupField-compatible endpoint,
So that planners can select methods filtered by company context and UseCode applicability.

**Acceptance Criteria:**

**Given** I send `GET /api/v1/methods/search?query=stan&companyId={id}` with a valid JWT
**When** the query executes
**Then** returns methods where `code` OR `name` contains "stan" (case-insensitive), assigned to the specified company OR globally available, with `is_active = true` (resolved including company overrides); response conforms to `LookupFieldQueryBuilder v0.0.5` contract; arrives within 300ms

**Given** the caller sends `?excludeUseCode=2` (Routes/BOM context — exclude CostingOnly)
**When** the UseCode filter is applied
**Then** methods with effective `use_code = 2` (CostingOnly) are excluded from results

**Given** the caller sends `?excludeUseCode=1` (Costing context — exclude ManufacturingOnly)
**When** the UseCode filter is applied
**Then** methods with effective `use_code = 1` (ManufacturingOnly) are excluded from results

**Given** the endpoint is called without `companyId`
**When** the query executes
**Then** returns all globally active methods without company-scoped filtering (fallback for contexts without company session)

**Tasks:**
- [ ] Implement `SearchMethodsQuery` + handler using linq2db for < 300ms performance
- [ ] Apply `LookupFieldQueryBuilder v0.0.5` response shape (label, value, extra fields)
- [ ] Implement active-status resolution including company override (effective IsActive)
- [ ] Implement `excludeUseCode` optional filter
- [ ] Map `GET /api/v1/methods/search` Minimal API endpoint
- [ ] Write integration tests: basic search, UseCode exclusion (each case), company-scoped, no-company fallback
- [ ] Performance test: verify < 300ms with 10,000 records via Testcontainers

---

### Epic 3: Methods Frontend (Microfrontend)

Entregar un microfrontend completo y funcional para el Maestro de Métodos, desarrollado contra un mock adapter del API backend, listo para conectarse al API real cuando Epic 2 esté disponible. Incluye lista paginada, formulario dual-contexto (Global/Empresa), selector de empresa tipo pill, herencia visual de overrides, y diálogo de asignación de empresa.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E3.1:** El administrador ve la lista paginada de Métodos con filtros por Código, Nombre, UseCode e IsActive; puede navegar, filtrar y ordenar sin fricciones.
- [ ] **AC-E3.2:** Al crear un Método, el formulario valida unicidad del código en tiempo real (on blur), establece defaults correctos (UseCode = Manufacturing and Costing) y abre automáticamente el diálogo de asignación de empresa al guardar con éxito.
- [ ] **AC-E3.3:** Al editar en contexto Empresa, el selector pill muestra claramente la empresa activa; los campos sin override muestran el valor heredado global de forma visual diferenciada (componente `InheritedField` con etiqueta "Heredado").
- [ ] **AC-E3.4:** El registro semilla `0001` muestra visualmente su inmutabilidad antes de intentar editar; los campos inmutables se renderizan como texto de solo lectura (no como inputs deshabilitados).
- [ ] **AC-E3.5:** Cambiar de contexto Global → Empresa no recarga la página ni pierde cambios no guardados; la transición es inmediata con adaptación visual del estado de edición de los campos.

**FRs covered:** FR2 (UI side), FR3, FR4 (UI), FR5 (UI), FR6 (UI), FR7 (UI), FR9 (UI), FR10

---

#### Story 3.1: Microfrontend Setup + MasterCrud Shell + Mock Adapter

As a frontend developer,
I want the microfrontend scaffolded with the siesa-ui-kit `MasterCrud` shell and a mock adapter that simulates the Methods API contract,
So that all subsequent frontend stories can be developed and validated independently of the real backend.

**Acceptance Criteria:**

**Given** the microfrontend module is registered in the Single-SPA shell
**When** I navigate to the Methods route
**Then** the `MasterCrud` component renders with the correct title "Métodos", toolbar, and empty list (mock data)

**Given** the mock adapter is in place
**When** any story calls the Methods service
**Then** the mock returns data matching the exact shape of the real API contract (same DTO structure as Epic 2 — coordinated at sprint start); the mock is configured in a single `methods.mock.ts` file replaceable by the real adapter in Epic 4

**Given** the MasterCrud configuration is applied
**When** the list renders
**Then** the columns Code, Name, UseCode (display label), IsActive (Activo/Inactivo badge) are visible; per-row actions Edit, View, Assign Company, Delete are rendered (Delete hidden for record `0001`)

**Tasks:**
- [ ] Scaffold microfrontend module (Single-SPA registration, routing)
- [ ] Install and configure `siesa-ui-kit`; apply TailwindCSS 4+ design tokens (primary `#0e79fd`, Inter font)
- [ ] Create `MethodsService` interface and `MethodsMockAdapter` implementing it — all responses match Epic 2 DTO contracts
- [ ] Configure `MasterCrud` base: columns (code, name, useCode label, isActive badge), per-row actions, pagination (10/20/50/100)
- [ ] Set up dark mode via Tailwind `class` strategy on `html` element

---

#### Story 3.2: Methods List View — Pagination, Column Filters & Sorting

As a user with read permission,
I want to see a paginated, filterable list of Methods,
So that I can quickly find the method I need without scrolling through the entire catalog.

**Acceptance Criteria:**

**Given** the Methods list is open with mock data (20+ records)
**When** I change the page size to 10
**Then** only 10 records are shown; pagination controls display the correct total count and page indicators

**Given** I type "est" in the Code filter input
**When** the filter is applied (on change with debounce)
**Then** only methods whose code contains "est" (case-insensitive) are displayed; other filters remain active

**Given** I select "Manufacturing Only" from the UseCode filter dropdown
**When** the filter is applied
**Then** only methods with use_code = 1 are displayed

**Given** I click the "Name" column header
**When** sorting is applied
**Then** the list re-sorts by Name ASC; clicking again sorts DESC; the active sort column is visually indicated with an arrow icon

**Given** all filters are active
**When** I click "Clear filters"
**Then** all filter inputs reset and the full paginated list is shown

**Tasks:**
- [ ] Configure `MasterCrud` column filter inputs: Code (text, partial), Name (text, partial), UseCode (select: All/ManufacturingAndCosting/ManufacturingOnly/CostingOnly), IsActive (select: All/Activo/Inactivo)
- [ ] Wire pagination controls to `MethodsService.list()` mock call with page/pageSize params
- [ ] Wire column sort headers to `MethodsService.list()` with sortBy/sortDir params
- [ ] Add debounce (300ms) to text filter inputs to avoid excessive calls
- [ ] Add "Clear filters" button that resets all filter state

---

#### Story 3.3: Create Method Form + Real-time Code Uniqueness Validation

As a global administrator,
I want to create a new Method with real-time code uniqueness validation,
So that I can confidently fill the form knowing conflicts will be surfaced before submission.

**Acceptance Criteria:**

**Given** I click "Add" (Nueva) in the list toolbar
**When** the create form opens
**Then** the form shows fields: Code (max 4 chars, focused), Name, Description, UseCode (select, default ManufacturingAndCosting = 0), IsActive (toggle, default true); the company context selector is NOT shown in create mode

**Given** I type a code that already exists and move focus to the next field (on blur)
**When** the uniqueness check resolves (mock or real < 200ms)
**Then** an inline error appears below the Code field: "El método ya existe"; the Save button is disabled until the code is corrected

**Given** I complete Code, Name and UseCode with valid values and click Save
**When** the mock adapter confirms success
**Then** the form closes, the list refreshes, and the Company Assignment dialog opens automatically with a success toast: "Método [code] '[name]' creado correctamente"

**Given** I submit the form with Code empty or Name empty
**When** client-side validation runs
**Then** inline error messages appear on the required fields; form does not submit

**Tasks:**
- [ ] Configure `MasterCrud` create form: field definitions (code max 4, name max 250, description max 2000, useCode select, isActive toggle)
- [ ] Implement on-blur code uniqueness check calling `MethodsService.checkCode()`; show inline error on conflict
- [ ] Set default values: useCode = 0 (ManufacturingAndCosting), isActive = true
- [ ] Wire create form submit to `MethodsService.create()`
- [ ] On success: trigger company assignment dialog open + show named success toast
- [ ] On field validation failure: show field-level errors, disable Save

---

#### Story 3.4: Edit Form — Global Context (Context Pill + Immutable Fields)

As a global administrator,
I want to edit a Method in Global context with the context pill selector visible,
So that I can update global base fields while always knowing which scope I am operating in.

**Acceptance Criteria:**

**Given** I click "Edit" on a non-seed method in the list
**When** the edit form opens
**Then** the context pill selector appears below the form title showing "Global" (globe icon, purple pill); Code field is rendered as display text (not an input); Name, Description, UseCode, IsActive are editable

**Given** I modify Name to a new value and click Save
**When** the mock adapter confirms success
**Then** the form shows a success toast: "Método [code] actualizado correctamente"; the list reflects the updated name

**Given** I open method `0001` ("Estándar") in edit mode
**When** the form renders
**Then** all fields are rendered as display text (read-only); a visible badge or label states "Registro protegido — no editable"; the Save button is hidden or disabled with a tooltip explaining the restriction

**Given** I open the edit form in Global context for a method
**When** the context pill dropdown is opened
**Then** the dropdown lists "Global" + all companies this method is assigned to; switching context is possible from here

**Tasks:**
- [ ] Configure `MasterCrud` edit form in Global context: Code as display text, other base fields editable
- [ ] Implement seed record detection (code = "0001" or is_immutable = true): render all fields as display text, show "Registro protegido" badge, hide/disable Save
- [ ] Implement context pill component using siesa-ui-kit native `activeByCompany` config: shows Global (globe icon) in edit; opens company dropdown on click
- [ ] Wire edit save to `MethodsService.updateGlobal()`
- [ ] Display named success toast on save

---

#### Story 3.5: Edit Form — Company Context + InheritedField Component

As a company administrator,
I want to edit overridable Method fields in Company context with inherited values clearly displayed,
So that I can configure company-specific overrides without confusion about what is inherited vs. explicitly set.

**Acceptance Criteria:**

**Given** I am in the edit form and select a company from the context pill dropdown
**When** the context switches to Company mode
**Then** Code and Name become display text (immutable global fields); Description, UseCode, IsActive switch to editable override inputs; the transition is instant with no page reload and no loss of any unsaved global-context changes

**Given** a company has no override for `Description` (value is NULL / inherited)
**When** the Description field renders in Company context
**Then** the `InheritedField` component renders: dimmed display of the global value as placeholder text + "Heredado" badge; the field is editable — clicking it clears the inherited placeholder and allows entering an override

**Given** I set a Description override and click Save
**When** the mock adapter confirms success
**Then** the `InheritedField` for Description switches from inherited to override display style; a success toast shows: "Override de Empresa [company name] guardado"

**Given** I clear a previously-set override (delete the text and save)
**When** the override is saved as NULL
**Then** the field reverts to the `InheritedField` inherited display (global value as dimmed placeholder + "Heredado" badge)

**Given** I switch from Company A context to Company B context with unsaved overrides for Company A
**When** the context switch happens
**Then** a confirmation dialog asks "¿Descartar cambios no guardados de [Company A]?"; if confirmed, switches context; if cancelled, stays on Company A

**Tasks:**
- [ ] Implement `InheritedField` component: props `{ globalValue, overrideValue, label, onEdit }` — renders dimmed global value + "Heredado" badge when `overrideValue` is null; switches to editable input on interaction
- [ ] Configure `MasterCrud` Company context: Code/Name as display text, Description/UseCode/IsActive use `InheritedField` wrapper
- [ ] Implement unsaved-changes guard on context switch (confirmation dialog)
- [ ] Wire company context save to `MethodsService.updateOverride(companyId, fields)`
- [ ] Display named success toast on save

---

#### Story 3.6: Company Assignment Dialog

As a global administrator,
I want to assign and unassign Methods to companies via a dedicated dialog,
So that I can control which companies have access to each method.

**Acceptance Criteria:**

**Given** the create success flow triggers the assignment dialog (Story 3.3) OR I click "Assign Company" in the per-row actions of the list
**When** the Company Assignment dialog opens
**Then** the dialog shows a searchable list of all companies (from mock); already-assigned companies are checked; unassigned companies are unchecked

**Given** I check two new companies and click Confirm
**When** the mock adapter confirms success
**Then** the dialog closes with toast: "Método asignado a 2 empresa(s)"; the method's company list is updated

**Given** I uncheck a previously assigned company and click Confirm
**When** the mock adapter confirms success
**Then** the company is unassigned; the method no longer appears in that company's context selector

**Given** I open the dialog and click Cancel without changes
**When** the dialog closes
**Then** no changes are made; the list is unaffected

**Tasks:**
- [ ] Configure `MasterCrud` company assignment dialog using native `isCompanyLinked` / `onConfirmLinking` / `canOverrideMultiCompany` props
- [ ] Wire to `MethodsService.getCompanies()` (mock) for company list with assignment state
- [ ] Wire confirm to `MethodsService.assignCompanies(companyIds)` (mock)
- [ ] Show per-company assignment count in success toast
- [ ] Trigger dialog automatically after create success (from Story 3.3 flow)

---

### Epic 4: Methods Integration & E2E

Conectar el microfrontend al API backend real (reemplazando el mock adapter), validar todos los journeys de usuario del PRD end-to-end con backend y frontend reales, y resolver cualquier brecha de contrato o UX descubierta durante la integración. Entrega el Maestro de Métodos completamente operativo para producción.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E4.1:** Todos los journeys del PRD (crear, editar global, editar empresa, eliminar con dependencias, protección del semilla, asignación de empresa) funcionan de punta a punta sin mocks ni workarounds.
- [ ] **AC-E4.2:** El LookupField en Rutas, BOM y Grupos de Costos puede buscar y seleccionar Métodos correctamente filtrados por empresa y UseCode usando el endpoint real `/api/v1/methods/search`.
- [ ] **AC-E4.3:** Los mensajes de error del backend (dependencias, semilla inmutable, conflicto de concurrencia, código duplicado) aparecen en español en la UI de forma precisa y accionable.
- [ ] **AC-E4.4:** La suite de tests E2E pasa en CI, cubriendo los 5 journeys del PRD con backend y frontend reales ejecutando contra la base de datos de test.

**FRs covered:** FR1–FR13 (validación completa end-to-end)

---

#### Story 4.1: API Integration — Replace Mock Adapter with Real API Client

As a frontend developer,
I want to replace the mock adapter with a real HTTP client connected to the Methods backend API,
So that all frontend interactions use production data and backend validation.

**Acceptance Criteria:**

**Given** the real backend (Epic 2) is deployed to the development environment
**When** I swap `MethodsMockAdapter` for `MethodsApiAdapter` in the service configuration
**Then** all existing frontend features (list, create, edit, assign) work against real data without any frontend component changes

**Given** the `MethodsApiAdapter` calls `POST /api/v1/methods`
**When** the backend returns a validation error (HTTP 400 Problem Details)
**Then** the frontend correctly maps the `errors` array to field-level inline errors in the form

**Given** the `MethodsApiAdapter` calls any endpoint
**When** the backend returns HTTP 401 or 403
**Then** the frontend shows the appropriate session-expired or access-denied message using siesa-ui-kit error handling

**Given** the API is unreachable (network error or 5xx)
**When** any service call fails
**Then** a toast error appears with a descriptive message; the user is not left in a broken UI state

**Tasks:**
- [ ] Implement `MethodsApiAdapter` implementing the same `MethodsService` interface as the mock
- [ ] Map all backend Problem Details error codes to Spanish UI messages
- [ ] Configure base URL, JWT Bearer injection, and request/response interceptors
- [ ] Register adapter via environment config (mock vs. real toggle for testing convenience)
- [ ] Verify all DTO shapes between frontend and backend; fix any mismatches
- [ ] Write contract tests: validate `MethodsApiAdapter` against the real API endpoints

---

#### Story 4.2: E2E — Create Method & Company Assignment Journey

As a QA engineer,
I want automated E2E tests covering the full create-and-assign journey,
So that regressions are caught automatically before each release.

**Acceptance Criteria:**

**Given** the E2E suite runs against a real backend with a clean test database
**When** the "Create Method" test executes
**Then** it covers: open form → enter code → blur (uniqueness check passes) → fill name/useCode → save → company assignment dialog opens → assign 2 companies → confirm → verify method appears in list with correct data

**Given** the E2E runs the "Duplicate Code" test
**When** the same code is entered in the form
**Then** the inline error "El método ya existe" appears; Save is disabled

**Given** the E2E runs the "Required fields" test
**When** the form is submitted with empty Code
**Then** field-level validation error appears; no POST request is sent

**Tasks:**
- [ ] Set up E2E test framework (Playwright recommended) with test database seeding/cleanup
- [ ] Write test: happy-path create + company assignment (Journey 1 from PRD)
- [ ] Write test: duplicate code validation (on blur + on submit)
- [ ] Write test: required field validation
- [ ] Integrate E2E suite into CI pipeline

---

#### Story 4.3: E2E — Edit Method & Company Override Journey

As a QA engineer,
I want automated E2E tests covering edit (global) and company override journeys,
So that the GLOBAL+Override pattern is regression-tested with real data.

**Acceptance Criteria:**

**Given** the E2E runs the "Edit Global" test
**When** the test edits a method in Global context
**Then** it covers: open edit → verify Code is read-only → change Name → save → verify list reflects change → verify company overrides are unaffected

**Given** the E2E runs the "Company Override" test
**When** the test sets a Description override for Company A
**Then** it covers: switch to Company A context → verify InheritedField shows global value → type override description → save → verify Company A sees override → verify Company B still sees global value

**Given** the E2E runs the "Concurrency Conflict" test
**When** a stale rowVersion is submitted
**Then** the HTTP 409 response is surfaced in the UI as "El método ha sido modificado por otro usuario"

**Tasks:**
- [ ] Write test: edit global context (Journey 1 continuation) — with rowVersion validation
- [ ] Write test: company override — set, verify isolation, clear override (Journey 2 from PRD)
- [ ] Write test: concurrency conflict simulation (submit stale rowVersion, verify 409 UI message)

---

#### Story 4.4: E2E — Guard Scenarios (Seed, Delete Dependencies, RBAC)

As a QA engineer,
I want automated E2E tests covering all guard and error scenarios,
So that the protection mechanisms are verified end-to-end.

**Acceptance Criteria:**

**Given** the E2E runs the "Seed Record Protection" test
**When** method `0001` is loaded in the form
**Then** it covers: verify "Registro protegido" badge visible, Save hidden/disabled, delete action absent from row actions (Journey 3 from PRD)

**Given** the E2E runs the "Delete with Dependency" test
**When** a method referenced in a dependent master is deleted
**Then** the specific error message names the dependent master (Journey 4 from PRD); no deletion occurs

**Given** the E2E runs the "Safe Delete" test
**When** a method with no dependencies is deleted
**Then** a confirmation dialog appears naming the record; on confirm, the method disappears from the list (Journey 4 from PRD)

**Given** the E2E runs the "LookupField Filtering" test
**When** the Routes form opens the Method LookupField
**Then** searching returns methods excluding CostingOnly; inactive methods are absent (Journey 5 from PRD)

**Tasks:**
- [ ] Write test: seed record immutability (Journey 3 from PRD)
- [ ] Write test: delete blocked by each dependent master type (separate test per dependent)
- [ ] Write test: safe delete with confirmation dialog
- [ ] Write test: LookupField search from dependent master with UseCode filter (Journey 5 from PRD — requires mock dependent master or integration with real Routes form)
- [ ] Verify all 17 Acceptance Criteria from PRD (AC-001 through AC-017) are covered by E2E or integration tests
