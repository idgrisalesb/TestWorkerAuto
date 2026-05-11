---
project_name: 'MfgStructure (Siesa-Agents)'
user_name: 'SiesaTeam'
date: '2026-03-10'
sections_completed:
  ['technology_stack', 'language_rules', 'framework_rules', 'testing_rules', 'quality_rules', 'workflow_rules', 'anti_patterns', 'frontend_stack', 'frontend_rules', 'frontend_testing', 'frontend_anti_patterns']
status: 'complete'
rule_count: 95
optimized_for_llm: true
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents MUST follow when implementing code for MfgStructure. Focused on unobvious details that agents commonly miss._

> **SCOPE:** Full-stack — .NET 10 backend microservice + React 18 MFE frontend. Backend in `MfgStructure/`, frontend MFE in `MfgStructureFrontend/`. Feature: **Methods Master (Maestro de Métodos)**. Work Centers and Projections are backend-only at this stage; their frontend MFEs are future scope.

---

## Technology Stack & Versions

### Backend (Active)

| Technology | Version | Notes |
|------------|---------|-------|
| .NET | 10 | LTS, strict nullable, implicit usings |
| C# Minimal API | 10 | Endpoint classes per domain — NO controllers |
| Entity Framework Core | 10 | Standard CRUD, DDD aggregates, migrations |
| PostgreSQL | 18+ | DB: `mfgstructure_dev`, schema: `mfgstructure` |
| Dapr | 1.16.9 | Pub/Sub (GCP) + Service Invocation + Placement port 50006 |
| Redis | 8-alpine | Dapr state store (local Docker) |
| FluentValidation | Latest | Commands and DTOs validation |
| linq2db | Latest | LookupField `/search` endpoints (< 300ms NFR) |
| DynamicLinq | Latest | Runtime dynamic filters |
| LinqKit | Latest | Composable predicates in repositories |
| xUnit | Latest | Unit + integration tests |
| Testcontainers.PostgreSql | Latest | Real DB integration tests |
| Scalar | Latest | API docs — NO Swagger |
| Serilog | Latest | Structured logging |

### Mandatory Internal NuGet Packages (Exact Pins)

| Package | Version | Purpose |
|---------|---------|---------|
| `Siesa.MasterPattern` | **0.1.3** | `BaseMasterService<T>`, `IMasterEntity`, GLOBAL+Override |
| `Siesa.BusinessUtilities.LookupFieldQueryBuilder` | **0.0.5** | LookupField `/search` contract |

> Source: `https://nuget.pkg.github.com/SiesaTeams/index.json` — PAT with `read:packages` scope required.
> **NEVER upgrade either package** without explicit authorization — versions are contractual.

### Frontend (Active — Methods Master MFE)

| Technology | Version | Notes |
|------------|---------|-------|
| Vite | 7+ | `vite-plugin-single-spa` for MFE lifecycle |
| React | 18+ | Functional components + hooks only |
| TypeScript | 5+ | Strict mode — no `any` |
| TanStack Router | 1+ | File-based routing, `autoCodeSplitting: true` |
| TanStack Query | 5+ | ALL server state — no `useState` + `useEffect` + fetch |
| Zustand | 5+ | Active company scope (`method-context.store.ts`) only |
| siesa-ui-kit | latest | `MasterCrud` covers ~75% of UI — check before any custom component |
| TailwindCSS | 4+ | Brand token palette from `technical-preferences-ux.md` |
| React Hook Form + Zod | latest | One Zod schema per command DTO |
| Axios | latest | Single instance with Bearer JWT interceptor |
| `vite-plugin-single-spa` + `single-spa-react` | latest | CSS isolation via `cssStrategy: 'singleMife'` |
| Vitest + RTL + MSW | latest | Unit + component tests + API mocking |

**Package manager:** `pnpm` (project uses `pnpm-lock.yaml` — never switch to npm/yarn)

> siesa-ui-kit source: GitHub Packages `@siesateams` — same PAT as backend NuGet.
> Configure `.npmrc`: `@siesateams:registry=https://npm.pkg.github.com`

---

## Critical Implementation Rules

### Language-Specific Rules (C#)

- **UUID v7 always** — `Guid.CreateVersion7()` in all **master entity** factory methods. Never `Guid.NewGuid()`. EF Core migration default: `HasDefaultValueSql("uuidv7()")`. **Exception — projected entities**: ID is received from source service event payload — use `ValueGeneratedNever()` via `builder.ConfigureProjectionEntity()`. Never call `Guid.CreateVersion7()` in a `FromEvent()` method.

- **`DateTimeOffset` never `DateTime`** — All timestamp fields use `DateTimeOffset`. EF Core: `HasDefaultValueSql("NOW()")`. `DateOnly` for date-only fields, `TimeOnly` for time-only.

- **Nullable enabled globally** — `Nullable=enable` in `Directory.Build.props`. Reference properties must be nullable (`string?`) or initialized (`= null!` / `= string.Empty`).

- **ImplicitUsings enabled** — Do not add `using System;`, `using System.Collections.Generic;`, etc. — already included globally.

- **`record` for DTOs and commands/queries** — Use `record` for all request/response DTOs, commands, and queries. Use `class` for domain entities (EF Core materialization).

- **File-scoped namespaces** — Always `namespace MfgStructure.Domain.Methods.Entities;` — never with braces.

- **`private set` on entity properties** — All domain entity properties use `private set` or `init`. Never `public set`. **Exception — `IProjectionEntity` implementations:** The interface contract (`Siesa.MasterPattern.Entities.IProjectionEntity`) requires public setters on `ID`, `Code`, `IsActive`, `SourceUpdatedAt`, `LastSyncedAt` to compile. These 5 properties use `public set` only in projected entity classes. Always mutate through `FromEvent()` and `ApplyUpdate()` — never assign these properties directly outside those methods.

- **Collection init with `[]`** — C# 12+ collection expression for empty collections: `public ICollection<T> Items { get; private set; } = [];`

- **`= null!` for EF Core navigation properties** — `public MethodEntity Method { get; private set; } = null!;`

- **Enums mapped as `smallint`** — All persisted enums: `.HasColumnType("smallint")` in EF Core config.

- **File-scoped namespaces, one type per file** — Each class/record/interface/enum in its own file. Filename matches type name exactly.

### Framework-Specific Rules

#### Minimal API

- **Endpoint classes per bounded context** — `MethodEndpoints.cs`, `WorkCenterEndpoints.cs`. Never mix endpoints across bounded contexts.

- **`Results.Created` with location** — POST creation returns 201: `return Results.Created($"/api/v1/methods/{result.Id}", result);`

- **`CancellationToken` on all async handlers** — Every endpoint handler receives and passes `CancellationToken cancellationToken`.

- **`MapGroup` with tags and OpenAPI** — Always `.WithTags("Methods").WithOpenApi()` on endpoint groups.

- **`MapScalarApiReference()`** — Never `app.UseSwagger()`. Scalar only.

#### EF Core

- **`ApplyConfigurationsFromAssembly`** — Never register configurations manually in `OnModelCreating`. Always: `modelBuilder.ApplyConfigurationsFromAssembly(typeof(MfgStructureDbContext).Assembly);`

- **`UseSnakeCaseNamingConvention()` on `DbContextOptionsBuilder`** — Configured in `Program.cs` via `options.UseSnakeCaseNamingConvention()`, NOT in `OnModelCreating`. `OnModelCreating` only calls `ApplyConfigurationsFromAssembly`. Do NOT call it on `ModelBuilder`.

- **Schema explicit always** — Every `ToTable()` must include `"mfgstructure"`: `builder.ToTable("methods", "mfgstructure");`

- **`AsNoTracking()` on all read queries** — GetList, GetById, Search queries must use `AsNoTracking()`.

- **`HasPrecision(18, 2)` for decimals** — All money/rate `decimal` properties require `.HasPrecision(18, 2)`.

- **`*_prj` FK delete behavior: Restrict** — `OnDelete(DeleteBehavior.Restrict)` for all FKs pointing to projected entity tables.

- **Master → Override delete behavior: Cascade** — `OnDelete(DeleteBehavior.Cascade)` for master → override relationships.

- **No `[Column]` or `[Table]` attributes** — Convention handles all mapping. Exception: legacy integration only (document why).

#### Dapr

- **`UseCloudEvents()` before `MapSubscribeHandler()`** — Order is mandatory in Program.cs.

- **All handlers idempotent** — Implement with upsert (ON CONFLICT DO UPDATE). Dapr is at-least-once delivery.

- **`tenantId` validated per handler** — Mismatch → log warning + return HTTP 400. HTTP 400 signals to Dapr "intentional rejection — do not retry" without triggering retry storm. (Story 1.4 decision — supersedes earlier "return OK" guideline.)

- **Service Invocation for reconciliation** — Use `DaprClient.InvokeMethodAsync()`, not `HttpClient` directly.

### Testing Rules

- **TDD approach** — Write tests before or alongside implementation. No handler without corresponding test.

- **Two test projects:**
  - `MfgStructure.UnitTests` — Domain entities, handlers; EF Core InMemory
  - `MfgStructure.IntegrationTests` — Repositories, migrations, Dapr handlers; `Testcontainers.PostgreSql`

- **Test naming pattern** — `{Method}_{Scenario}_{ExpectedResult}`:
  ```
  Handle_WithValidCommand_ShouldCreateMethod
  Handle_WithDuplicateCode_ShouldThrowDomainException
  Handle_WithMismatchedRowVersion_ShouldReturnHttp409
  ```

- **EF Core InMemory limits** — Use for handler logic tests only. Never for DB constraint tests (unique, FK). Use Testcontainers for those.

- **`IAsyncLifetime` in integration tests** — Always implement for PostgreSQL container lifecycle.

- **Idempotency test per Dapr handler** — Send same event twice, verify state is identical.

- **xmin concurrency tests per PUT/DELETE** — Three test cases: correct rowVersion (200), wrong rowVersion (409), `?force=true` (200).

- **Coverage target > 80%** — Domain and Application layers primarily. Infrastructure covered by integration tests.

### Code Quality & Style Rules

- **Interfaces in Application layer** — Repository interfaces defined in `MfgStructure.Application.{BoundedContext}.Interfaces`, not Domain or Infrastructure.

- **One validator per command/query** — Separate file in `Validators/`. Never validate inside handler.

- **`sealed` on handlers and validators** — Classes not designed for inheritance should be `sealed`.

- **Structured logging with Serilog** — Never `Console.WriteLine`. Always `ILogger<T>` with structured template: `_logger.LogInformation("Method {MethodId} created by {UserId}", id, userId);`

- **Domain error messages centralized** — Spanish error strings in static `DomainErrors` class. Never hardcoded in multiple places.

- **Constructor DI only** — Never use Service Locator (`IServiceProvider.GetService<T>()`) in business logic.

- **`var` for obvious types, explicit for clarity** — `var method = new MethodEntity(...)` ✅ — `var x = GetSomething()` ❌

- **`ConfigureAwait(false)` not needed in ASP.NET Core** — No `SynchronizationContext`. Add only in shared library code.

### Development Workflow Rules

- **Backend in `MfgStructure/` subfolder** — All .NET code lives in `business-manufactura-structure-poc/MfgStructure/`. Never create .NET files at repo root.

- **Frontend in `MfgStructureFrontend/` subfolder** — All React/TypeScript code lives in `business-manufactura-structure-poc/MfgStructureFrontend/`. Never create frontend files at repo root or inside `MfgStructure/`.

- **Docker required for local dev** — Start infrastructure before running API:
  ```bash
  cd MfgStructure && docker compose up -d
  ```

- **Run API with Dapr sidecar** — Never `dotnet run` alone:
  ```bash
  dapr run --app-id mfgstructure --app-port 5000 --dapr-http-port 3500 -- dotnet run
  ```

- **Run frontend MFE** — Separate terminal from backend:
  ```bash
  cd MfgStructureFrontend && pnpm install && pnpm dev
  # MFE served at http://localhost:3001
  ```

- **`VITE_API_URL` required** — Frontend needs `MfgStructureFrontend/.env.local` with `VITE_API_URL=http://localhost:5000`. Never hardcode the API URL.

- **siesa-ui-kit GitHub Packages** — Requires `.npmrc` in `MfgStructureFrontend/` with PAT token for `@siesateams` registry. Same PAT as backend NuGet (`read:packages` scope).

- **Migrations order** — `*_prj` projection tables in a dedicated migration applied FIRST, before business tables.

- **`nuget.config` required** — `MfgStructure/nuget.config` must exist with SiesaTeams GitHub Packages source. Build fails without it.

- **`Directory.Build.props` — no unilateral changes** — Affects all projects in solution. Changes require team consensus.

- **Implementation sequence is mandatory:**
  1. Projected Entities (14 `*_prj` tables + Dapr handlers)
  2. Methods master (validates GLOBAL+Override pattern)
  3. Work Centers master (complex — rates, calculated fields, substitutes)

- **Secrets in environment variables** — Never hardcode connection strings, PATs, or JWT secrets. Use `appsettings.Development.json` (gitignored) or env vars.

### Critical Don't-Miss Rules

#### MasterPattern — Projection Infrastructure

`Siesa.MasterPattern v0.1.3` provides dedicated types for projected entities. Use them exclusively:

| Type | Namespace | Usage |
|------|-----------|-------|
| `IProjectionEntity` | `Siesa.MasterPattern.Entities` | Interface for all single-PK `*_prj` domain classes |
| `ConfigureProjectionEntity<T>()` | `Siesa.MasterPattern.EntityFramework` | EF Core extension — sets `ValueGeneratedNever()` on ID, `SourceUpdatedAt` required, `LastSyncedAt` with `DEFAULT NOW()` |
| `EFCoreProjectionConnection<T>` | `Siesa.MasterPattern.EntityFramework` | DI-injected DB connection for `BaseProjectionService<T>` |
| `BaseProjectionService<T>` | `Siesa.MasterPattern.Services` | Abstract base for sync handlers — provides `UpsertAsync` (with out-of-order detection), `ReconcileAsync` |
| `ProjectionDefinition` | `Siesa.MasterPattern.Definitions` | Metadata required by `BaseProjectionService<T>` constructor |

Rules:
- `IProjectionEntity` has 5 properties: `ID`, `Code`, `IsActive`, `SourceUpdatedAt`, `LastSyncedAt`
- Composite-PK override entities (no single `ID`) do NOT implement `IProjectionEntity` — plain classes only
- `BaseProjectionService<T>.UpsertAsync` handles idempotency and out-of-order detection via `SourceUpdatedAt` comparison — do not reimplement this logic manually
- `LastSyncedAt` replaces what older docs called `ProjectionSyncedAt` — the interface name is authoritative

#### MasterPattern Contract

- **`IMasterEntity` required on all masters** — `MethodEntity`, `WorkCenterEntity` must implement `IMasterEntity`. Without it, `BaseMasterService<T>` breaks.

- **`IsImmutable` blocks edit/delete** — Always check before any update/delete. Record with `Code = "0001"` is immutable seed. Throw domain exception — never silently skip.

- **NULL = inherit in override tables** — `null` field in `*_overrides` = "use global base value". Empty string `""` sent by client = explicit override to empty. Do NOT conflate.

- **`BaseMasterService<T>` in Application layer** — Never in Infrastructure or Domain.

#### LookupField Contract

- **v0.0.5 exact — contractual with frontend** — Different version breaks all dropdowns in UI.

- **linq2db for `/search` — not EF Core** — < 300ms NFR. EF Core too slow for large LookupField queries.

- **All masters AND projections expose `/search`** — Not only Methods/WorkCenters. All 10 searchable projected entities expose `GET /projections/{entity}/search` (the 6 `*Override` tables do NOT — they only participate in JOINs). See `_bmad-output/shared-docs/proyecciones.md` §5.6 for the full table.

#### Dapr Edge Cases (Backend)

- **Reconciliation startup is blocking** — `BackgroundService` must complete before HTTP server accepts requests. Non-blocking = FK violations on empty `*_prj` tables.

- **Single entity failure does not abort job** — Log error and continue remaining entities. Never throw from reconciliation loop.

- **Confirm topic names with origin service teams** — `{service}.{entity}.{action}` is the convention, exact names are defined by each service team.

#### Multi-tenancy (Backend)

- **CompanyID always from JWT** — Never from request body for business operations. Exception: assignment endpoints (FR3, FR7) where client sends explicit CompanyID list.

- **Dapr event `tenantId` must be validated** — Match against known CompanyID in `segm_companies_prj`. Mismatch → log warning + return HTTP 400 (no crash).

#### Security (Backend)

- **Bearer JWT on ALL endpoints** — No exceptions including health and LookupField endpoints.

- **RBAC server-side always** — Never trust UI context for permissions. Validate `manufacturing.{resource}.{action}` against AccessManager on every operation.

#### Performance (Backend)

- **Pagination mandatory on list endpoints** — Never return unbounded collections. Always Skip/Take or cursor-based.

- **`AsNoTracking()` on all read queries** — See Framework Rules above.

---

## Frontend Implementation Rules (Methods Master MFE)

### MFE Entry Point & Single-SPA

- **`src/spa.tsx` is the only entry point** — Exports `{ bootstrap, mount, unmount }` from `single-spa-react`. Never call `ReactDOM.createRoot()` directly in spa.tsx — the Single-SPA host shell controls mounting.

- **CSS isolation via `cssStrategy: 'singleMife'`** — CSS is injected on mount and removed on unmount. This prevents style leakage between MFEs. Configured in `vite.config.ts`.

- **`vitePluginSingleSpa` config: `serverPort: 3001`** — Each MFE has a unique dev port. Never conflict with other MFEs.

- **No `<BrowserRouter>` or standalone React render** — TanStack Router is configured in `router.tsx`; the root is mounted by Single-SPA, not by the MFE itself.

### siesa-ui-kit MasterCrud — MANDATORY

- **`MasterCrud` for ALL list+form views** — Never build custom table, pagination, form shell, confirmation dialog, or toast for master entity screens. `MasterCrud` covers ~75% of the UI out of the box.

- **`navigationType="page"`** — Form opens as a full-width route, not as a modal. The Methods list and form are separate routes (`/manufacturing/methods` and `/manufacturing/methods/:id/edit`).

- **`internalErrorHandling={true}`** — Enables automatic toast notifications from `{ hasError: true, msgError: string }` API responses. Never build custom error toast logic.

- **`activeByCompany={true}` for GLOBAL+Override masters** — Enables the company context pill selector. Pass `companies` (from TanStack Query), `activeCompanyId`, and `onCompanyChange`.

- **`isImmutable` drives delete visibility** — `actions: [{ type: 'delete', hidden: (record) => record.isImmutable }]` hides delete for seed record `0001`. Never hardcode `code === '0001'` checks in component logic.

- **`disabledOnEdit: true` on Code field** — Code is read-only after creation. Configure via field config, not via conditional render.

### State Management Split (Critical)

| State type | Where | Rule |
|---|---|---|
| Server state (methods list, detail, search) | TanStack Query | Always — no `useState` + `useEffect` + fetch |
| Active company scope (Global \| CompanyID) | Zustand `method-context.store.ts` | Must persist between list route and edit form route |
| List filters + pagination | TanStack Router search params | Makes URLs bookmarkable; back button restores state |
| Form field values | React Hook Form | Local only; `setValue` for context switch without unmount |

- **Scope persists across routes** — `method-context.store.ts` Zustand store survives route transitions. When user switches company in list, that company pre-selects when opening edit form.

- **Context switch without data loss** — On scope change, update Zustand store and call React Hook Form `setValue` for inherited fields. Never unmount/remount the form.

### Form Validation: React Hook Form + Zod

- **One Zod schema per command DTO** — `CreateMethodSchema`, `UpdateMethodGlobalSchema`, `UpdateMethodOverrideSchema`. Use `useForm<T>({ resolver: zodResolver(schema) })`.

- **`rowVersion` required on every PUT/DELETE** — Read from `MethodResponseDto.rowVersion` (uint from xmin). Always send in update/delete commands. Missing = backend rejects with 409.

- **Nullable override fields** — Override Zod schema fields are `.nullable()` — e.g., `description: z.string().max(2000).nullable()`. `null` = inherit from global; never send `""` or `0` to express inheritance.

- **Real-time code uniqueness on blur** — FR2: trigger `methodsApi.validateCode(value)` in the Code field's `onBlur` handler. Show inline validation error without requiring full form submit.

### InheritedField Component (Only Custom Component)

- **`InheritedField` is the only custom component** approved for this feature. It renders overridable fields in company scope:
  - `overrideValue === null` → shows dimmed global value + **"Heredado" badge** (never blank)
  - `overrideValue !== null` → shows normal input + **"Restablecer"** button (sets value to `null`)

- **Never use `disabled` HTML input for immutable fields** — Use display text (`<p>` or `<span>`) styled as read-only. Disabled inputs look temporarily locked, not permanently read-only.

- **`InheritedField` candidate for siesa-ui-kit** — When Work Centers MFE is built, propose this as a siesa-ui-kit contribution before implementing a duplicate.

### API Integration

- **Single Axios instance** at `shared/lib/api-client.ts` with `VITE_API_URL` base. Request interceptor injects `Authorization: Bearer {token}` from Zustand auth store.

- **Response interceptor maps ProblemDetails** — HTTP 4xx/5xx `ProblemDetails` responses mapped to typed `ApiError`. HTTP 409 is surfaced as concurrency warning (force/cancel) or dependency error (toast with detail).

- **HTTP 403 hides/disables UI** — Never show 403 as an error toast. Resolve permissions via `useRbac()` BEFORE rendering and set `permissions` prop on `MasterCrud`. UI never shows buttons the user cannot use.

- **TanStack Query key factory pattern** — All queries use `methodKeys` factory:
  ```typescript
  methodKeys.all → ['methods']
  methodKeys.lists() → ['methods', 'list']
  methodKeys.list(filters) → ['methods', 'list', filters]
  methodKeys.detail(id) → ['methods', 'detail', id]
  ```
  `onSuccess` in mutations calls `queryClient.invalidateQueries({ queryKey: methodKeys.lists() })`.

### Frontend Cross-Cutting Rules

- **Spanish UI text mandatory** — All labels, buttons, error messages, placeholders, toasts, and tooltips in Spanish. Code (variables, types, hooks, comments) in English. `ProblemDetails.detail` from backend is already in Spanish — pass through without transformation.

- **Dark mode via Tailwind `dark:` prefix** — All Tailwind classes include `dark:` variants. Class-based on `html` element (not media query). Never use inline `style` for theme-sensitive colors.

- **JWT in memory only** — Store token in Zustand auth store (`useAuthStore`). Never in `localStorage` or `sessionStorage`. 401 response → call `useAuthStore.getState().logout()`.

- **RBAC from JWT claims** — Use `useRbac('manufacturing.methods')` hook reading JWT claims. Never evaluate permissions from form state or URL params.

- **TypeScript strict mode, no `any`** — All API response types fully typed matching backend DTOs. Use `z.infer<typeof Schema>` for form types. Enable `"strict": true` in `tsconfig.json`.

- **Bundle limit: < 500KB gzipped** — `siesa-ui-kit` and `react` are singleton shared deps from the Single-SPA shell — NOT bundled per MFE. Never add them to `bundle:` in `vite-plugin-single-spa` config.

### Frontend File Structure (Methods Module)

```
MfgStructureFrontend/src/
├── spa.tsx                    # Single-SPA entry: bootstrap/mount/unmount
├── router.tsx                 # TanStack Router + QueryClient
├── routes/_app/manufacturing/methods/
│   ├── index.tsx              # /manufacturing/methods (list) — validateSearch with Zod
│   └── $methodId.edit.tsx     # /manufacturing/methods/:id/edit
└── modules/manufacturing/methods/
    ├── domain/types/
    │   ├── method.types.ts        # Method, MethodOverride, MethodUseCode enum
    │   └── method-commands.ts     # Zod schemas: CreateMethodSchema, UpdateMethodGlobalSchema, etc.
    ├── application/
    │   ├── hooks/useMethodsList.ts, useMethodDetail.ts, useMethodMutations.ts, useMethodSearch.ts
    │   └── store/method-context.store.ts   # Zustand: activeScope ('global' | CompanyID)
    ├── infrastructure/api/
    │   ├── methods.api.ts         # Axios calls
    │   └── method.query-keys.ts   # methodKeys factory
    └── presentation/components/
        ├── MethodsMasterCrud.tsx  # MasterCrud wrapper — main component
        └── InheritedField.tsx     # Only custom component (dimmed + Heredado badge)
```

### Frontend Testing Rules

- **Unit tests with Vitest** — Use cases (`CreateMethod.ts`, `UpdateMethodOverride.ts`), Zod schema validation, utility functions. No DOM required.

- **Component tests with RTL** — `InheritedField`: verify "Heredado" badge when `overrideValue === null`; verify "Restablecer" button when override is set. `MethodsMasterCrud`: verify RBAC-driven button visibility.

- **API mocking with MSW** — Mock backend responses in hook tests. Test concurrency conflict (HTTP 409 with `rowVersion` mismatch), dependency delete error (HTTP 409 with named dependency), and success flows.

- **Test naming pattern** — `{Component/Hook}_{Scenario}_{ExpectedOutcome}`:
  ```
  InheritedField_WithNullOverrideInCompanyScope_ShowsHeredadoBadge
  useMethodMutations_WhenDeleteReturns409_SurfacesDependencyMessage
  ```

- **Never test MasterCrud internals** — siesa-ui-kit is an external library; test only the wrapper logic (what props are passed, what callbacks are invoked).

---

## Projected Entity Tables (16 — READ ONLY)

> **Implementation note:** Epic 1 (Stories 1.1–1.7) implements 14 of these 16 entities. `SEGM_OperationCenterPrj` and `SEGM_OperationCenterOverridePrj` are defined in the design but were scoped out of Epic 1 — implement them in a future story/epic.

| C# Class | DB Table | Source | Epic 1 |
|----------|----------|--------|--------|
| `AMGR_UserPrj` | `amgr_users_prj` | AccessManager | ✅ |
| `INVT_CostSegmentPrj` | `invt_cost_segments_prj` | Inventory | ✅ |
| `INVT_CostSegmentOverridePrj` | `invt_cost_segments_overrides_prj` | Inventory | ✅ |
| `INVT_StoragePrj` | `invt_storages_prj` | Inventory | ✅ |
| `INVT_StorageGroupPrj` | `invt_storage_groups_prj` | Inventory | ✅ |
| `INVT_StorageGroupOverridePrj` | `invt_storage_groups_overrides_prj` | Inventory | ✅ |
| `INVT_StorageOverridePrj` | `invt_storages_overrides_prj` | Inventory | ✅ |
| `SEGM_CompanyPrj` | `segm_companies_prj` | Segment | ✅ |
| `SEGM_OperationCenterPrj` | `segm_operation_centers_prj` | Segment | ⏳ future |
| `SEGM_OperationCenterOverridePrj` | `segm_operation_centers_overrides_prj` | Segment | ⏳ future |
| `SEGM_UserCompanyAssigmentsPrj` | `segm_user_company_assigments_prj` | Segment | ✅ |
| `SEGM_CostCenterPrj` | `segm_cost_centers_prj` | Segment | ✅ |
| `SEGM_CostCenterOverridePrj` | `segm_cost_centers_overrides_prj` | Segment | ✅ |
| `SEGM_CostCenterGroupPrj` | `segm_cost_center_groups_prj` | Segment | ✅ |
| `TPRT_ThirdPartyPrj` | `tprt_third_parties_prj` | ThirdParty | ✅ |
| `TPRT_ThirdPartyOverridePrj` | `tprt_third_parties_overrides_prj` | ThirdParty | ✅ |

---

## Anti-Patterns — NEVER DO

| Anti-Pattern | Correct Alternative |
|--------------|-------------------|
| `Guid.NewGuid()` for PKs | `Guid.CreateVersion7()` |
| `DateTime` for timestamps | `DateTimeOffset` |
| `ToTable("methods")` without schema | `ToTable("methods", "mfgstructure")` |
| `null` in override = default value | `null` = inherit from global base |
| `OnDelete(Cascade)` on `*_prj` FK | `OnDelete(Restrict)` |
| `app.UseSwagger()` | `app.MapScalarApiReference()` |
| Set `NumberOfMachines`/`MachineSpeedFactor` from request | Server-side calculation only |
| `RowVersion` header for concurrency | `rowVersion` field in request/response body |
| English user-facing messages | Spanish: `"El método no existe."` |
| `Guid.NewGuid()` in EF migration default | `HasDefaultValueSql("uuidv7()")` for masters; `ValueGeneratedNever()` via `ConfigureProjectionEntity()` for `*_prj` entities |
| `Siesa.MasterPattern` != `0.1.3` | Exact `0.1.3` pin |
| `LookupFieldQueryBuilder` != `0.0.5` | Exact `0.0.5` pin |
| EF Core for `/search` endpoints | linq2db for LookupField queries |
| `dotnet run` without Dapr sidecar | `dapr run ... -- dotnet run` |
| Non-blocking reconciliation startup | Blocking until all `*_prj` tables populated |
| `Console.WriteLine` | `ILogger<T>` structured logging |
| `[Column]` / `[Table]` attributes | EF Core `SnakeCaseNamingConvention` |
| **Frontend Anti-Patterns** | |
| `ReactDOM.createRoot` in `spa.tsx` | `single-spa-react` lifecycle (bootstrap/mount/unmount) |
| `useState` + `useEffect` + fetch for API data | TanStack Query (`useQuery`, `useMutation`) |
| JWT token in `localStorage` | Zustand auth store (memory only) |
| Custom table / pagination / dialog / toast | `MasterCrud` from siesa-ui-kit |
| `disabled` HTML input for immutable fields | Display text (`InheritedField` or `<p>`) |
| `""` or `0` in override to express "use global" | `null` — send and store null explicitly |
| `if (user.role === 'admin')` permission checks | `useRbac()` hook reading JWT claims |
| Frontend generates entity IDs | IDs assigned by backend only |
| Router navigation on Global ↔ Company scope switch | Zustand state change only — no URL change |
| English user-facing strings in UI | Spanish: `"Código requerido"`, `"Heredado"`, etc. |
| Storing list filters in Zustand | TanStack Router search params (bookmarkable) |

---

## siesa-ui-kit Component Catalog (Frontend Reference)

> Always check siesa-ui-kit BEFORE using shadcn directly or creating custom components.
> Strategy: siesa-ui-kit first → shadcn via MCP → custom (requires MR)

### 🔴 CRITICAL: MasterCrud — Mandatory for ALL Master Entity Screens

**Every frontend feature that implements a master entity (CRUD) MUST use `MasterCrud` as the base component.**

`MasterCrud` covers ~75% of a standard master entity screen out of the box:

| Capability | MasterCrud Feature |
|---|---|
| Paginated list view | `MasterCrudTable` |
| Create / Edit form | `MasterCrudForm` |
| Search, sort, filters toolbar | `MasterCrudToolbar` |
| Card grid alternative view | `MasterCrudGrid` |
| Read-only fields after creation | `disabledOnEdit: true` on field |
| RBAC permission control | `permissions: { canCreate, canUpdate, canDelete, canRead }` |
| Toast notifications | `internalErrorHandling: true` |
| Conditional disabled fields | `disabled: (data) => boolean` |
| Multi-select + batch ops | `enableMultiSelect`, `batchActions` |
| Advanced filter groups | `showAdvancedSearch`, `showAdvancedSearchConnectors` |
| Multi-empresa context | `activeByCompany`, `companies`, `onConfirmLinking`, `isCompanyLinked` |
| Status badges per row | `headerBadges: (record) => Badge[]` |
| Delete confirmation | built-in — no custom dialog needed |
| Vincular empresa dialog | built-in via `onConfirmLinking` — no custom dialog needed |

#### Props Reference

| Prop | Tipo | Descripción |
|------|------|-------------|
| `title` | string | Encabezado de la pantalla |
| `entityName` | string | Nombre de la entidad |
| `fields` | `MasterCrudField[]` | Definición de columnas/campos |
| `service` | `CrudService<T>` | Servicio de datos |
| `pageSize` | number | Registros por página (default: 10) |
| `navigationType` | `'page' \| 'sidebar'` | `"page"` → form ocupa ancho completo |
| `formColumns` | number | Columnas del form (default: 2) |
| `showCreateButton` | boolean | Habilita botón crear |
| `showSearch` | boolean | Barra de búsqueda simple |
| `showRowActions` | boolean | Acciones por fila |
| `showViewToggle` | boolean | Toggle tabla/cards |
| `allowDelete` | boolean | Habilita eliminación |
| `showAdvancedSearch` | boolean | Panel de búsqueda avanzada |
| `showAdvancedSearchConnectors` | boolean | Conectores AND/OR entre grupos |
| `initialFiltersVisible` | boolean | Panel de filtros abierto por defecto |
| `enableMultiSelect` | boolean | Selección múltiple de filas |
| `globalActions` | `Action[]` | Acciones del toolbar superior (export, sync) |
| `batchActions` | `Action[]` | Acciones sobre selección múltiple |
| `actions` | `Action[]` | Acciones por fila — `displayType: 'direct' \| 'menu'` |
| `renderForm` | ReactNode | Override del form nativo |
| `activeByCompany` | boolean | Contexto multi-empresa |
| `companies` | `CompanyDTO[]` | Lista de empresas disponibles |
| `permissions` | object | Control de acceso (ver abajo) |
| `internalErrorHandling` | boolean | Manejo de errores con toasts |
| `headerBadges` | `(record) => Badge[]` | Badges de estado por registro |
| `isCompanyLinked` | `(record, company) => boolean` | Verifica vinculación empresa-registro |
| `onConfirmLinking` | `(record, company) => void` | Maneja asignación de empresa |
| `onSearchMatches` | `(term) => Promise<{id, name}[]>` | Búsqueda filtrada async |
| `emptyMessage` | string | Mensaje cuando no hay registros |

#### CrudService Interface

```typescript
interface CrudService<T> {
  getAll(params?): Promise<{ data: T[], total: number }>
  create(data: T): Promise<T>
  update(id, data: T): Promise<T>
  delete(id): Promise<void>
}
```

Patrón recomendado: implementar con `useMemo` + `useState`.

Errores: `{ hasError: true, msgError: string }` → toast automático si `internalErrorHandling: true`.

#### Permissions Object

```typescript
permissions: {
  canRead: boolean,       // false → muestra "Acceso Denegado"
  canCreate: boolean,
  canUpdate: boolean,
  canDelete: boolean,
  canOverrideMultiCompany?: boolean  // false → todos los campos disabled en modo empresa
}
```

#### MasterCrudField Config

```typescript
MasterCrudField {
  accessorKey: string,
  header: string,
  type: 'text' | 'number' | 'lookup' | 'select',
  config: {
    required?: boolean,
    disabledOnEdit?: boolean,     // read-only después de creación
    searchable?: boolean,
    sortable?: boolean,
    cardPosition?: string,
  },
  renderCell?: (row) => ReactNode  // render custom por celda
}
```

Lookup fields: entidad referenciada + campos de display + fetcher custom vía `onSearchMatches`.

#### AdvancedFilter Structure (Búsqueda Avanzada)

```typescript
interface AdvancedFilter {
  isGroup: boolean,
  children?: AdvancedFilter[],
  connector?: 'AND' | 'OR',
  field?: string,
  operator?: 'equals' | 'startsWith' | 'endsWith' | 'contains' | 'gt' | 'lt' | 'isEmpty' | 'isNotEmpty',
  value?: any
}
```

Soporta grupos anidados tipo `(A y B) o (C y D)` con drag & drop para reordenar.

#### Maestro-Detalle

`MaestroDetalleWrapper` — maneja relación padre/hijo con layout responsivo automático (desktop/mobile).

#### Notas de Estilo

- Wrapper requerido: `min-h-[600px] p-4`
- Clases Tailwind: `bg-background-secondary`, dark mode incluido
- `navigationType: 'page'` → form ocupa todo el ancho disponible

**What MasterCrud does NOT cover** (implement como wrapper/custom):
- Scope selectors (Global vs. Company context para patrón GLOBAL+Override)
- Inherited value display (NULL override = mostrar valor global dimmed + badge "Heredado")
- Context-aware field editability más allá de la función `disabled(data)`

**Reference docs:**
- [MasterCrud base](https://siesa-ui-kit.pages.dev/llms/siesa-ui-kit-mastercrud.txt)
- [Acciones y Maestro-Detalle](https://siesa-ui-kit.pages.dev/llms/siesa-ui-kit-mastercrud-acciones-y-maestro-detalle.txt)
- [Empresa (multi-empresa)](https://siesa-ui-kit.pages.dev/llms/siesa-ui-kit-mastercrud-empresa.txt)
- [Demos](https://siesa-ui-kit.pages.dev/llms/siesa-ui-kit-mastercrud-demos.txt)
- [Navegación](https://siesa-ui-kit.pages.dev/llms/siesa-ui-kit-mastercrud-navegaci%C3%B3n.txt)
- [Permisos](https://siesa-ui-kit.pages.dev/llms/siesa-ui-kit-mastercrud-permisos.txt)
- [Búsqueda Avanzada](https://siesa-ui-kit.pages.dev/llms/siesa-ui-kit-mastercrud-b%C3%BAsqueda-avanzada.txt)

---

**Basic UI:** Alert, Avatar, Badge, Button, Checkbox, Divider, Info, Input, Notification, Radio, Select, Switch, Textarea

**Layout & Nav:** Navbar, NavigationBar, NavigationRail, NavigationRailGroup, NavigationRailItem, NavigationRailPanel, NavigationRailTypes

**Data Display:** DescriptionList, Pagination, Table, Tabs

**Business:** ContactManager, Dropdown, DropdownItemCollapsible, DropdownItemHeading, Dynamic Entities Admin, Dynamic Entities Components, FileUploader, LookupField, MatchModal, MasterCrud, ParameterEditor

**Forms:** Quantity

**Complete Views:** LoginView, SignUpView, RecoverPasswordView, LayoutBase, ListView, ProductsView, TableLayoutView, Toast (21 color options)

---

## Usage Guidelines

**For AI Agents:**
- Read this file before implementing any code in MfgStructure
- Follow ALL rules exactly — no exceptions without explicit user approval
- When in doubt, prefer the more restrictive option
- Cross-reference architecture.md for entity examples and EF Core configuration patterns

**For Humans:**
- Keep this file lean — remove rules that become obvious over time
- Update when technology stack or patterns evolve
- Review after each epic completion

_Last Updated: 2026-03-10 — Frontend MFE section added for Methods Master (MfgStructureFrontend)_
