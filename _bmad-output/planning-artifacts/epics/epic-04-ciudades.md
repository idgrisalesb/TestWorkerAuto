---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
inputDocuments:
  - _bmad-output/planning-artifacts/prd/feature-ciudades.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: create-epics-and-stories
feature: Ciudades
parallelStrategy: backend-frontend-integration
lastStep: step-03-create-stories
---

## Ciudades

> **Estrategia de paralelismo:** Epic 5 (Backend) y Epic 6 (Frontend) se ejecutan en paralelo.
> Epic 6 usa un mock adapter que replica el contrato del API. Epic 7 inicia cuando Epic 5
> tiene los endpoints operativos.

---

### Epic 5: Cities Backend API

Entregar una API REST completa, probada y production-ready para el Maestro de Ciudades, que cualquier cliente (frontend u otro servicio) pueda consumir de forma independiente. Incluye persistencia, lógica de negocio CRUD estándar (sin Override pattern), RBAC, concurrencia y el endpoint de LookupField.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E5.1:** Un administrador puede crear, editar y eliminar Ciudades vía API; las operaciones respetan RBAC (`manufacturing.cities.*`).
- [ ] **AC-E5.2:** La unicidad del código se valida en tiempo real (endpoint check-code) y al crear; códigos duplicados retornan HTTP 400 con mensaje descriptivo.
- [ ] **AC-E5.3:** El endpoint `/search` retorna Ciudades filtradas por estado activo; la respuesta cumple el contrato LookupFieldQueryBuilder v0.0.5.
- [ ] **AC-E5.4:** Intentar eliminar una Ciudad referenciada en Work Centers retorna un error descriptivo con el nombre del maestro dependiente.
- [ ] **AC-E5.5:** Dos usuarios editando la misma Ciudad simultáneamente reciben un error de conflicto (HTTP 409); ninguno pierde datos silenciosamente.

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8

---

#### Story 5.1: City Domain Entity, DB Schema & Migration

As a backend developer,
I want the `CityEntity` and `MasterDefinition` configuration defined with their corresponding database migration,
So that all subsequent stories have a stable domain model and schema to build upon.

**Acceptance Criteria:**

**Given** the solution already has the Clean Architecture scaffold and `Siesa.MasterPattern v0.1.3` installed
**When** the EF Core migration is applied
**Then** the table `mfgstructure.cities` is created with all columns, types, constraints, and indexes defined in the PRD:
- `cities`: `id` (uuid v7 PK), `code` varchar(10) unique not null, `name` varchar(250) not null, `is_active` bool not null default true, audit columns (`created_at`, `created_by_user_id`, `updated_at`, `updated_by_user_id`), `xmin` system column exposed as `rowVersion`
- Unique constraint `uq_cities_code` on `cities.code`

**Given** the `CityEntity` is mapped in EF Core
**When** the `MasterDefinition` static property is inspected
**Then** it reflects exactly: Code (IsImmutable=true, IsOverridable=false), Name (IsImmutable=false, IsOverridable=false), IsActive (IsImmutable=false, IsOverridable=false)

**Tasks:**
- [ ] Define `CityEntity : IMasterEntity` in `Domain/Cities/Entities/` with all fields, UUID v7 factory, private EF constructor
- [ ] Define `MasterDefinition DEFINITION` static field on `CityEntity` with correct IsImmutable/IsOverridable per field
- [ ] Configure EF Core entity mappings in `Infrastructure/Data/Configurations/Cities/`
- [ ] Create EF Core migration for `cities` table with all constraints
- [ ] Write unit test validating `MasterDefinition` field flags match PRD spec

---

#### Story 5.2: Create City Command + Real-time Code Uniqueness Validation

As an administrator,
I want to create a new City via POST and validate code uniqueness before submission,
So that the Cities catalog can be populated with valid, non-duplicate entries.

**Acceptance Criteria:**

**Given** I send `POST /api/v1/cities` with a valid payload `{ code, name, isActive? }` and a JWT with `manufacturing.cities.create` permission
**When** the code does not already exist in `mfgstructure.cities`
**Then** the system creates the record with `Guid.CreateVersion7()` PK, returns HTTP 201 with the created entity including `rowVersion`

**Given** I send `POST /api/v1/cities` with a code that already exists
**When** the command validates uniqueness
**Then** the system returns HTTP 400 Problem Details with error message "The city already exists" referencing the `code` field

**Given** I send `GET /api/v1/cities/check-code?code=001` (uniqueness check endpoint for on-blur)
**When** the code exists
**Then** returns HTTP 200 `{ "exists": true }`; when it does not exist, returns HTTP 200 `{ "exists": false }`; response must arrive within 200ms

**Given** I send `POST /api/v1/cities` with a JWT that lacks `manufacturing.cities.create`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Given** I send `POST /api/v1/cities` with Code missing or Name missing
**When** FluentValidation executes
**Then** returns HTTP 400 with field-level error array indicating which fields are required

**Tasks:**
- [ ] Implement `CreateCityCommand` + `CreateCityCommandHandler` in `Application/Cities/Commands/`
- [ ] Add FluentValidation validator: Code required (max 10 chars), Name required (max 250 chars)
- [ ] Implement code uniqueness check in handler (via repository)
- [ ] Implement `GET /api/v1/cities/check-code` lightweight endpoint using linq2db for < 200ms response
- [ ] Implement `POST /api/v1/cities` Minimal API endpoint in `API/Endpoints/Cities/`
- [ ] Add RBAC middleware check for `manufacturing.cities.create`
- [ ] Write integration tests: happy path, duplicate code (400), missing fields (400), unauthorized (403)

---

#### Story 5.3: Edit City + Concurrency Control

As an administrator,
I want to edit the name and active status of an existing City,
So that I can update city metadata while the system detects concurrent edits.

**Acceptance Criteria:**

**Given** I send `PUT /api/v1/cities/{id}` with `{ name, isActive, rowVersion }` and a JWT with `manufacturing.cities.update`
**When** the city exists and `rowVersion` matches the current `xmin`
**Then** the system updates Name and IsActive on the `cities` record and returns HTTP 200 with updated entity and new `rowVersion`

**Given** I send `PUT /api/v1/cities/{id}` and attempt to change `code`
**When** the command handler processes the request
**Then** the `code` field is ignored (read-only after creation); the record's code remains unchanged

**Given** I send `PUT /api/v1/cities/{id}` with a `rowVersion` that does not match the current `xmin`
**When** concurrency validation runs
**Then** returns HTTP 409 Problem Details: "The city has been modified by another user" with `{ "forceUrl": "/api/v1/cities/{id}?force=true" }` hint

**Given** I send `PUT /api/v1/cities/{id}` with a JWT that lacks `manufacturing.cities.update`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `UpdateCityCommand` + handler with `BaseMasterService<CityEntity>` orchestration
- [ ] Add `xmin` concurrency validation; expose `?force=true` bypass (requires `manufacturing.cities.update`)
- [ ] Map `PUT /api/v1/cities/{id}` Minimal API endpoint
- [ ] Write integration tests: happy path, concurrency conflict (409), code ignored, unauthorized (403)

---

#### Story 5.4: Delete City with Dependency Guard

As a user with delete permission,
I want to delete a City that has no active dependencies,
So that the Cities catalog can be kept clean without breaking dependent masters.

**Acceptance Criteria:**

**Given** I send `DELETE /api/v1/cities/{id}` with JWT with `manufacturing.cities.delete` and the city has no references in Work Centers
**When** the service checks dependencies
**Then** the system deletes the city and returns HTTP 204

**Given** I send `DELETE /api/v1/cities/{id}` and the city is referenced in `work_centers`
**When** the dependency guard runs
**Then** returns HTTP 409 Problem Details: "The city is referenced by Work Centers. It cannot be deleted"

**Given** I send `DELETE /api/v1/cities/{id}` with JWT lacking `manufacturing.cities.delete`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `DeleteCityCommand` + handler
- [ ] Add dependency check against `work_centers` table; returns specific error message
- [ ] Map `DELETE /api/v1/cities/{id}` Minimal API endpoint
- [ ] Write integration tests: safe delete (204), dependency guard (409 with correct message), unauthorized (403)

---

#### Story 5.5: Cities List Query — Pagination, Filtering & Sorting

As a user with read permission,
I want to query a paginated, filtered list of Cities,
So that I can find and review cities without loading the entire catalog at once.

**Acceptance Criteria:**

**Given** I send `GET /api/v1/cities?page=1&pageSize=20` with a valid JWT with `manufacturing.cities.read`
**When** the query executes
**Then** returns HTTP 200 with a paginated response: `{ items: [...], totalCount, page, pageSize }` containing all cities sorted by Code ASC by default; response arrives within 500ms for datasets up to 10,000 records

**Given** I send `GET /api/v1/cities?code=med&name=med&isActive=true`
**When** filters are applied
**Then** returns only cities matching ALL provided filters (AND logic); `code` and `name` are partial-match case-insensitive; `isActive` is exact-match

**Given** I send `GET /api/v1/cities?sortBy=name&sortDir=desc`
**When** sorting is applied
**Then** returns cities sorted by the specified column in the specified direction

**Given** I send `GET /api/v1/cities` with a JWT lacking `manufacturing.cities.read`
**When** RBAC is evaluated
**Then** returns HTTP 403 Problem Details

**Tasks:**
- [ ] Implement `GetCitiesListQuery` + handler using LinqKit composable predicates
- [ ] Add pagination support (page, pageSize 10/20/50/100)
- [ ] Add column filtering (code partial, name partial, isActive exact)
- [ ] Add column sorting (code, name, isActive; default: code ASC)
- [ ] Map `GET /api/v1/cities` Minimal API endpoint
- [ ] Write integration tests: default list, filter combinations, sorting, pagination, unauthorized (403)

---

#### Story 5.6: LookupField Search Endpoint

As a dependent master (Work Centers),
I want to search Cities via a LookupField-compatible endpoint,
So that administrators can select cities from standard lookup components.

**Acceptance Criteria:**

**Given** I send `GET /api/v1/cities/search?query=med` with a valid JWT
**When** the query executes
**Then** returns cities where `code` OR `name` contains "med" (case-insensitive), with `is_active = true`; response conforms to `LookupFieldQueryBuilder v0.0.5` contract; arrives within 300ms

**Given** the endpoint is called without a query string
**When** the query executes
**Then** returns all active cities (up to configured page size)

**Tasks:**
- [ ] Implement `SearchCitiesQuery` + handler using linq2db for < 300ms performance
- [ ] Apply `LookupFieldQueryBuilder v0.0.5` response shape (label, value, extra fields)
- [ ] Implement active-status filtering (active only by default)
- [ ] Map `GET /api/v1/cities/search` Minimal API endpoint
- [ ] Write integration tests: basic search, empty query, inactive excluded
- [ ] Performance test: verify < 300ms with 10,000 records via Testcontainers

---

### Epic 6: Cities Frontend (Microfrontend)

Entregar un microfrontend completo y funcional para el Maestro de Ciudades, desarrollado contra un mock adapter del API backend, listo para conectarse al API real cuando Epic 5 esté disponible. Incluye lista paginada con filtros, formulario de creación/edición, y acciones de eliminación.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E6.1:** El administrador ve la lista paginada de Ciudades con filtros por Código, Nombre e IsActive; puede navegar, filtrar y ordenar sin fricciones.
- [ ] **AC-E6.2:** Al crear una Ciudad, el formulario valida unicidad del código en tiempo real (on blur) y campos requeridos; muestra mensajes de error claros.
- [ ] **AC-E6.3:** Al editar, el campo Código es de solo lectura; Nombre e IsActive son editables.
- [ ] **AC-E6.4:** Al eliminar, el sistema muestra confirmación con nombre de la ciudad; si hay dependencias, muestra error descriptivo.

**FRs covered:** FR1 (UI), FR2 (UI), FR3 (UI), FR4 (UI), FR5 (UI)

---

#### Story 6.1: Microfrontend Setup + MasterCrud Shell + Mock Adapter

As a frontend developer,
I want the microfrontend scaffolded with the siesa-ui-kit `MasterCrud` shell and a mock adapter that simulates the Cities API contract,
So that all subsequent frontend stories can be developed and validated independently of the real backend.

**Acceptance Criteria:**

**Given** the microfrontend module is registered in the Single-SPA shell
**When** I navigate to the Cities route
**Then** the `MasterCrud` component renders with the correct title "Ciudades", toolbar, and empty list (mock data)

**Given** the mock adapter is in place
**When** any story calls the Cities service
**Then** the mock returns data matching the exact shape of the real API contract (same DTO structure as Epic 5); the mock is configured in a single `cities.mock.ts` file replaceable by the real adapter in Epic 7

**Given** the MasterCrud configuration is applied
**When** the list renders
**Then** the columns Code, Name, IsActive (Activo/Inactivo badge) are visible; per-row actions Edit, View, Delete are rendered

**Tasks:**
- [ ] Scaffold microfrontend module (Single-SPA registration, routing for Cities)
- [ ] Create `CitiesService` interface and `CitiesMockAdapter` implementing it — all responses match Epic 5 DTO contracts
- [ ] Configure `MasterCrud` base: columns (code, name, isActive badge), per-row actions, pagination (10/20/50/100)
- [ ] Set up dark mode via Tailwind `class` strategy on `html` element

---

#### Story 6.2: Cities List View — Pagination, Column Filters & Sorting

As a user with read permission,
I want to see a paginated, filterable list of Cities,
So that I can quickly find the city I need.

**Acceptance Criteria:**

**Given** the Cities list is open with mock data (20+ records)
**When** I change the page size to 10
**Then** only 10 records are shown; pagination controls display the correct total count

**Given** I type "med" in the Code filter input
**When** the filter is applied (on change with debounce)
**Then** only cities whose code contains "med" (case-insensitive) are displayed

**Given** I click the "Name" column header
**When** sorting is applied
**Then** the list re-sorts by Name ASC; clicking again sorts DESC; the active sort column is visually indicated

**Given** all filters are active
**When** I click "Clear filters"
**Then** all filter inputs reset and the full paginated list is shown

**Tasks:**
- [ ] Configure `MasterCrud` column filter inputs: Code (text, partial), Name (text, partial), IsActive (select: All/Activo/Inactivo)
- [ ] Wire pagination controls to `CitiesService.list()` mock call with page/pageSize params
- [ ] Wire column sort headers to `CitiesService.list()` with sortBy/sortDir params
- [ ] Add debounce (300ms) to text filter inputs
- [ ] Add "Clear filters" button that resets all filter state

---

#### Story 6.3: Create City Form + Real-time Code Uniqueness Validation

As an administrator,
I want to create a new City with real-time code uniqueness validation,
So that I can confidently add cities knowing conflicts will be surfaced before submission.

**Acceptance Criteria:**

**Given** I click "Add" (Nueva) in the list toolbar
**When** the create form opens
**Then** the form shows fields: Code (max 10 chars, focused), Name, IsActive (toggle, default true)

**Given** I type a code that already exists and move focus to the next field (on blur)
**When** the uniqueness check resolves (mock or real < 200ms)
**Then** an inline error appears below the Code field: "La ciudad ya existe"; the Save button is disabled

**Given** I complete Code and Name with valid values and click Save
**When** the mock adapter confirms success
**Then** the form closes, the list refreshes with a success toast: "Ciudad [code] '[name]' creada correctamente"

**Given** I submit the form with Code empty or Name empty
**When** client-side validation runs
**Then** inline error messages appear on the required fields; form does not submit

**Tasks:**
- [ ] Configure `MasterCrud` create form: field definitions (code max 10, name max 250, isActive toggle)
- [ ] Implement on-blur code uniqueness check calling `CitiesService.checkCode()`; show inline error on conflict
- [ ] Set default values: isActive = true
- [ ] Wire create form submit to `CitiesService.create()`
- [ ] On success: show named success toast, refresh list
- [ ] On field validation failure: show field-level errors, disable Save

---

#### Story 6.4: Edit City Form + Delete with Confirmation

As an administrator,
I want to edit a City and delete cities safely,
So that I can manage the catalog while the system prevents accidental data loss.

**Acceptance Criteria:**

**Given** I click "Edit" on a city in the list
**When** the edit form opens
**Then** Code field is rendered as display text (read-only); Name and IsActive are editable

**Given** I modify Name to a new value and click Save
**When** the mock adapter confirms success
**Then** the form shows a success toast: "Ciudad [code] actualizada correctamente"; the list reflects the updated name

**Given** I click "Delete" on a city row
**When** the confirmation dialog appears
**Then** the dialog shows: "¿Eliminar la ciudad [code] '[name]'?"; confirming calls the delete endpoint

**Given** the delete returns a dependency error
**When** the error is displayed
**Then** the toast shows the specific error message from the backend (e.g., "La ciudad está referenciada en Centros de Trabajo. No puede eliminarse")

**Tasks:**
- [ ] Configure `MasterCrud` edit form: Code as display text, Name and IsActive editable
- [ ] Wire edit save to `CitiesService.update()`
- [ ] Implement delete confirmation dialog with city code and name
- [ ] Wire delete confirm to `CitiesService.delete()`
- [ ] Display success/error toast based on response
- [ ] Handle dependency guard errors (409) with descriptive message

---

### Epic 7: Cities Integration & E2E

Conectar el microfrontend al API backend real (reemplazando el mock adapter), validar los journeys de usuario end-to-end con backend y frontend reales, y resolver cualquier brecha de contrato descubierta durante la integración.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E7.1:** Todos los journeys (crear, editar, eliminar con dependencias) funcionan de punta a punta sin mocks.
- [ ] **AC-E7.2:** Los mensajes de error del backend aparecen en español en la UI de forma precisa.
- [ ] **AC-E7.3:** La suite de tests E2E pasa en CI, cubriendo los 3 journeys del PRD.

**FRs covered:** FR1–FR8 (validación completa end-to-end)

---

#### Story 7.1: API Integration — Replace Mock Adapter with Real API Client

As a frontend developer,
I want to replace the mock adapter with a real HTTP client connected to the Cities backend API,
So that all frontend interactions use production data and backend validation.

**Acceptance Criteria:**

**Given** the real backend (Epic 5) is deployed to the development environment
**When** I swap `CitiesMockAdapter` for `CitiesApiAdapter` in the service configuration
**Then** all existing frontend features (list, create, edit, delete) work against real data without any frontend component changes

**Given** the `CitiesApiAdapter` calls any endpoint
**When** the backend returns HTTP 401 or 403
**Then** the frontend shows the appropriate session-expired or access-denied message

**Given** the API is unreachable (network error or 5xx)
**When** any service call fails
**Then** a toast error appears with a descriptive message; the user is not left in a broken UI state

**Tasks:**
- [ ] Implement `CitiesApiAdapter` implementing the same `CitiesService` interface as the mock
- [ ] Map all backend Problem Details error codes to Spanish UI messages
- [ ] Configure base URL, JWT Bearer injection, and request/response interceptors
- [ ] Register adapter via environment config (mock vs. real toggle)
- [ ] Verify all DTO shapes between frontend and backend; fix any mismatches

---

#### Story 7.2: E2E Tests — Full City Lifecycle

As a QA engineer,
I want automated E2E tests covering all city lifecycle scenarios,
So that regressions are caught automatically before each release.

**Acceptance Criteria:**

**Given** the E2E suite runs against a real backend with a clean test database
**When** the "Create City" test executes
**Then** it covers: open form → enter code → blur (uniqueness check passes) → fill name → save → verify city appears in list

**Given** the E2E runs the "Edit City" test
**When** the test edits a city
**Then** it covers: open edit → verify Code is read-only → change Name → save → verify list reflects change

**Given** the E2E runs the "Delete with Dependency" test
**When** a city referenced by a Work Center is deleted
**Then** the error message names the dependent master; no deletion occurs

**Given** the E2E runs the "Safe Delete" test
**When** a city with no dependencies is deleted
**Then** a confirmation dialog appears; on confirm, the city disappears from the list

**Given** the E2E runs the "Concurrency Conflict" test
**When** a stale rowVersion is submitted
**Then** the HTTP 409 response is surfaced in the UI

**Tasks:**
- [ ] Write test: happy-path create (Journey 1 from PRD)
- [ ] Write test: duplicate code validation (on blur + on submit)
- [ ] Write test: edit city (Journey 1 continuation)
- [ ] Write test: delete blocked by dependency (Journey 3 from PRD)
- [ ] Write test: safe delete with confirmation dialog
- [ ] Write test: concurrency conflict simulation
- [ ] Verify all 8 Acceptance Criteria from PRD (AC-001 through AC-008) are covered
