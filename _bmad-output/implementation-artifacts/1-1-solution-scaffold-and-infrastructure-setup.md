# Story 1.1: Solution Scaffold & Infrastructure Setup

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the MfgStructure .NET 10 solution scaffolded with Clean Architecture layers, all required NuGet packages, and Docker Compose running,
so that the team has a working, buildable baseline before any feature code is written.

## Acceptance Criteria

1. **Given** no solution exists **When** the developer runs the scaffold commands (`dotnet new sln`, project creation, NuGet additions) **Then** the solution builds successfully (`dotnet build` exits 0) with exactly 4 projects: `MfgStructure.API`, `MfgStructure.Application`, `MfgStructure.Domain`, `MfgStructure.Infrastructure`, each targeting `net10.0`.

2. **Given** the solution is scaffolded **When** `dotnet restore` is executed **Then** all required packages resolve without error from GitHub Packages (SiesaTeams org): `Siesa.MasterPattern v0.1.3`, `Siesa.BusinessUtilities.LookupFieldQueryBuilder v0.0.5`, `Dapr.AspNetCore`, `Dapr.Client`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `linq2db.EntityFrameworkCore`, `LinqKit.Microsoft.EntityFrameworkCore`, `FluentValidation`, `Serilog.AspNetCore`, and `Scalar.AspNetCore`.

3. **Given** the repository contains `docker-compose.yml` and `docker-compose.override.yml` from shared-docs **When** `docker compose up -d` is executed **Then** three services start successfully and become healthy:
   - `mfgstructure-postgres` — PostgreSQL 18 on port 5432
   - `mfgstructure-redis` — Redis 8-alpine on port 6379
   - `mfgstructure-dapr-placement` — Dapr Placement v1.16.9 on port 50006

4. **Given** the API project is configured with Problem Details RFC 7807, Scalar API reference, Serilog structured logging, and Bearer JWT middleware **When** the API starts (`dotnet run`) **Then** the service responds to `GET /health` (HTTP 200) and the Scalar API reference is accessible at its configured endpoint.

5. **Given** the solution structure is created **Then** strict nullable is enabled and implicit usings are configured in all 4 projects (`.csproj` settings verified).

6. **Given** the NuGet source for Siesa packages **Then** `nuget.config` at solution root is present with `github-siesa` source pointing to `https://nuget.pkg.github.com/SiesaTeams/index.json` and `packageSourceMapping` routing `Siesa.*` packages to that source.

## Tasks / Subtasks

- [ ] Task 1: Initialize .NET 10 solution and project structure (AC: 1, 5)
  - [ ] 1.1 Run `dotnet new sln -n MfgStructure` in `src/`
  - [ ] 1.2 Create `MfgStructure.API` (webapi, net10.0): `dotnet new webapi -n MfgStructure.API --framework net10.0`
  - [ ] 1.3 Create `MfgStructure.Application` (classlib, net10.0)
  - [ ] 1.4 Create `MfgStructure.Domain` (classlib, net10.0)
  - [ ] 1.5 Create `MfgStructure.Infrastructure` (classlib, net10.0)
  - [ ] 1.6 Add all 4 projects to solution: `dotnet sln add src/MfgStructure.{API,Application,Domain,Infrastructure}/*.csproj`
  - [ ] 1.7 Enable `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>` in all `.csproj` files
  - [ ] 1.8 Add project references: API → Application, API → Infrastructure; Application → Domain; Infrastructure → Application, Infrastructure → Domain

- [ ] Task 2: Configure NuGet sources and add packages (AC: 2, 6)
  - [ ] 2.1 Create `nuget.config` at solution root with `github-siesa` source and `packageSourceMapping` for `Siesa.*`
  - [ ] 2.2 Add Infrastructure packages: `Siesa.MasterPattern --version 0.1.3`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `Microsoft.EntityFrameworkCore.Design`, `Dapr.AspNetCore`, `Dapr.Client`, `linq2db.EntityFrameworkCore`, `System.Linq.Dynamic.Core`, `LinqKit.Microsoft.EntityFrameworkCore`
  - [ ] 2.3 Add Application packages: `FluentValidation`, `FluentValidation.AspNetCore`, `Siesa.BusinessUtilities.LookupFieldQueryBuilder --version 0.0.5`
  - [ ] 2.4 Add API packages: `Serilog.AspNetCore`, `Scalar.AspNetCore`
  - [ ] 2.5 Verify `dotnet restore` completes without errors

- [ ] Task 3: Configure docker-compose (AC: 3)
  - [ ] 3.1 Copy `docker-compose.yml` from `_bmad-output/shared-docs/` to solution root
  - [ ] 3.2 Copy `docker-compose.override.yml` from `_bmad-output/shared-docs/` to solution root
  - [ ] 3.3 Verify `docker compose up -d` starts all 3 containers healthy: `mfgstructure-postgres` (PostgreSQL 18, port 5432), `mfgstructure-redis` (Redis 8-alpine, port 6379), `mfgstructure-dapr-placement` (Dapr Placement v1.16.9, port 50006)

- [ ] Task 4: Configure API middleware and host (AC: 4)
  - [ ] 4.1 Add `appsettings.json` with connection strings for PostgreSQL and Redis, plus `Projections:ReconciliationOnStartup` and `Projections:ReconciliationIntervalMinutes` keys
  - [ ] 4.2 Configure Serilog in `Program.cs` (`UseSerilog(...)` with structured JSON output)
  - [ ] 4.3 Register Problem Details RFC 7807 middleware (`builder.Services.AddProblemDetails()`, `app.UseExceptionHandler()`)
  - [ ] 4.4 Register Bearer JWT authentication middleware (`builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)`)
  - [ ] 4.5 Register Scalar API reference (`app.MapScalarApiReference()`) — replaces Swagger/OpenAPI UI
  - [ ] 4.6 Add health check endpoint (`app.MapHealthChecks("/health")`)
  - [ ] 4.7 Verify `dotnet run` starts and `GET /health` returns HTTP 200; Scalar UI accessible at configured path

- [ ] Task 5: Clean up default template code (AC: 1)
  - [ ] 5.1 Remove default WeatherForecast controller/endpoint from `MfgStructure.API`
  - [ ] 5.2 Create correct folder structure per architecture decision:
    - `MfgStructure.API/Endpoints/` (empty, for future bounded contexts: Methods/, WorkCenters/, Projections/)
    - `MfgStructure.API/Middleware/`
    - `MfgStructure.Application/` (empty subdirs: Methods/, WorkCenters/, Projections/)
    - `MfgStructure.Domain/` (empty subdirs: Methods/, WorkCenters/, Shared/)
    - `MfgStructure.Infrastructure/Data/Configurations/`, `Data/Migrations/`, `Repositories/`, `Dapr/`

- [ ] Task 6: Write initial unit test project (AC: 2)
  - [ ] 6.1 Create `MfgStructure.Tests` xUnit project (`dotnet new xunit -n MfgStructure.Tests --framework net10.0`)
  - [ ] 6.2 Add Testcontainers.PostgreSql package reference for future integration tests
  - [ ] 6.3 Add a smoke test verifying that the Domain assembly loads without errors

## Dev Notes

### Architecture Pattern

Clean Architecture with 4 projects — strict dependency direction: API → Application → Domain (never reversed); Infrastructure → Application, Infrastructure → Domain. No circular references.

```
src/
  MfgStructure.API/              ← Minimal API, endpoints by bounded context, middleware
    Endpoints/
      Methods/
      WorkCenters/
      Projections/
    Middleware/
    Program.cs
  MfgStructure.Application/      ← Commands, Queries, DTOs, Validators, Interfaces (no EF here)
    Methods/      { Commands/, Queries/, DTOs/, Validators/, Interfaces/ }
    WorkCenters/  { Commands/, Queries/, DTOs/, Validators/, Interfaces/ }
    Projections/  { SyncHandlers/, SearchServices/, Reconciliation/ }
  MfgStructure.Domain/           ← Entities, ValueObjects, Domain Events (pure C#, no framework deps)
    Methods/      { Entities/, ValueObjects/, Events/ }
    WorkCenters/  { Entities/, ValueObjects/, Events/ }
    Shared/       { Base/, Interfaces/ }
  MfgStructure.Infrastructure/   ← EF Core, Dapr, Repositories (implements Application interfaces)
    Data/
      Configurations/  { Methods/, WorkCenters/, Projections/ }
      Migrations/
      MfgStructureDbContext.cs
    Repositories/  { Methods/, WorkCenters/ }
    Dapr/          { PubSub/, ServiceInvocation/ }
  MfgStructure.Tests/            ← xUnit + Testcontainers
```

### NuGet Package Placement (MANDATORY)

| Package | Project | Version |
|---------|---------|---------|
| `Siesa.MasterPattern` | Infrastructure | **0.1.3** (exact pin) |
| `Siesa.BusinessUtilities.LookupFieldQueryBuilder` | Application | **0.0.5** (exact pin) |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | Infrastructure | latest stable |
| `Microsoft.EntityFrameworkCore.Design` | Infrastructure | latest stable |
| `Dapr.AspNetCore` | Infrastructure | latest stable |
| `Dapr.Client` | Infrastructure | latest stable |
| `linq2db.EntityFrameworkCore` | Infrastructure | latest stable |
| `System.Linq.Dynamic.Core` | Infrastructure | latest stable |
| `LinqKit.Microsoft.EntityFrameworkCore` | Infrastructure | latest stable |
| `FluentValidation` | Application | latest stable |
| `FluentValidation.AspNetCore` | Application | latest stable |
| `Serilog.AspNetCore` | API | latest stable |
| `Scalar.AspNetCore` | API | latest stable |

> **CRITICAL:** `Siesa.*` packages require GitHub Packages (SiesaTeams org). A PAT with `read:packages` scope (SSO authorized for SiesaTeams) must be configured in `nuget.config` or via env vars before restore. The PAT must NOT be committed to source control.

### Docker Compose Services

| Container | Image | Port | Purpose |
|-----------|-------|------|---------|
| `mfgstructure-postgres` | postgres:18 | 5432 | Primary DB |
| `mfgstructure-redis` | redis:8-alpine | 6379 | Dapr state store |
| `mfgstructure-dapr-placement` | daprio/dapr:1.16.9 placement | 50006 | Dapr Placement svc |

The override file applies `--auth-host=trust` for local dev convenience on PostgreSQL.

### API Configuration Rules

- **No Swagger/OpenAPI UI** — use `Scalar.AspNetCore` exclusively (`app.MapScalarApiReference()`)
- **Problem Details RFC 7807** — every API error must use `IResult.Problem(...)` or `Results.Problem(...)` in Minimal API, not custom JSON shapes
- **Bearer JWT** — `AddAuthentication(JwtBearerDefaults.AuthenticationScheme)` with `AddJwtBearer(...)`. Token authority points to AccessManager service URL (from `appsettings.json`)
- **Serilog** — structured JSON sink minimum; configure with `UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration))`
- **Nullable** — `<Nullable>enable</Nullable>` in all `.csproj`. Compiler warnings treated as errors for nullable violations is recommended

### Cross-Cutting Decisions (Apply From Story 1-1 Onward)

These decisions are established in this story and must be respected by all subsequent stories:

1. **UUID v7** — All entity PKs use `Guid.CreateVersion7()` (never `Guid.NewGuid()`). PostgreSQL 18 native `uuidv7()` used in migration defaults.
2. **DateTimeOffset** — All timestamps use `DateTimeOffset` (never `DateTime`). `HasDefaultValueSql("NOW()")` in EF Core configs.
3. **Schema** — All tables live in schema `mfgstructure`. Every EF config must include `.ToTable("{table}", "mfgstructure")`.
4. **xmin concurrency** — Exposed as `rowVersion` (uint) in DTOs. Not needed in this scaffold story but conventions are set here.
5. **Audit fields** — `CreatedByUserID` and `UpdatedByUserID` (FK to `amgr_users_prj`) will be required on all local domain entities once projection tables exist.

### Testing Standards

- Framework: **xUnit** + **Testcontainers.PostgreSql** for integration tests
- Unit tests: EF Core InMemory for logic tests; TDD approach for new feature code
- Coverage target: ≥ 80% on Application layer (handlers, validators, services)
- This story's test scope is a smoke test confirming the Domain assembly loads; full coverage targets apply from Story 1.2 onward

### Project Structure Notes

- Solution lives under `src/` relative to repo root
- All projects reference each other via `<ProjectReference>` — no NuGet packaging internal projects
- `.gitignore` should exclude `nuget.config` password values; use environment variables (`NUGET_CREDENTIALPROVIDER_MSAL_*` or `GITHUB_TOKEN`) in CI

### References

- Architecture decisions: [Source: `_bmad-output/planning-artifacts/architecture.md`#Solution Structure]
- NuGet commands: [Source: `_bmad-output/planning-artifacts/architecture.md`#Solution Initialization Commands]
- Docker containers: [Source: `_bmad-output/planning-artifacts/architecture.md`#Infrastructure & Deployment]
- MasterPattern docs: [Source: `_bmad-output/shared-docs/MasterPattern.md`]
- Epic acceptance criteria: [Source: `_bmad-output/planning-artifacts/epics/epic-01-entidades-proyectadas.md`#Story 1.1]
- PRD feature scope: [Source: `_bmad-output/planning-artifacts/prd/feature-entidades-proyectadas.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Build: ❌ FAILED — `src/` directory does not exist. Cannot run `dotnet build`.
- Tests: ❌ FAILED — `MfgStructure.Tests` project not created. Cannot run tests.
- Status: Implementation not started or rolled back. No .NET artifacts found in git.

### Completion Notes List

⚠️ **CODE REVIEW FAILURE — NO IMPLEMENTATION FOUND**

- ❌ Build fails — src/ directory does not exist
- ❌ Zero .NET projects created (expected 5: API, Application, Domain, Infrastructure, Tests)
- ❌ No `nuget.config` file
- ❌ No `Program.cs` or configuration
- ❌ No Docker Compose files
- ❌ No test files
- ❌ No folder structure created
- ✅ Story file created with requirements
- **Overall Status:** 0% complete — Implementation required

### File List

⚠️ **TBD — To be generated after implementation is complete**

The following files MUST be created during development. This list will be updated when code review is re-requested after implementation:

- `src/MfgStructure.sln`
- `src/nuget.config`
- `src/docker-compose.yml`
- `src/docker-compose.override.yml`
- `src/MfgStructure.API/MfgStructure.API.csproj`
- `src/MfgStructure.API/Program.cs`
- `src/MfgStructure.API/appsettings.json`
- `src/MfgStructure.API/appsettings.Development.json`
- `src/MfgStructure.API/Endpoints/` (with Methods/, WorkCenters/, Projections/ subdirs)
- `src/MfgStructure.API/Middleware/`
- `src/MfgStructure.Application/MfgStructure.Application.csproj`
- `src/MfgStructure.Application/Methods/`, `WorkCenters/`, `Projections/` (with Commands/, Queries/, DTOs/, Validators/, Interfaces/)
- `src/MfgStructure.Domain/MfgStructure.Domain.csproj`
- `src/MfgStructure.Domain/Methods/`, `WorkCenters/`, `Shared/` (with subdirs)
- `src/MfgStructure.Infrastructure/MfgStructure.Infrastructure.csproj`
- `src/MfgStructure.Infrastructure/Data/Configurations/`, `Data/Migrations/`, `Repositories/`, `Dapr/`
- `src/MfgStructure.Tests/MfgStructure.Tests.csproj`
- `src/MfgStructure.Tests/DomainAssemblyTests.cs`
