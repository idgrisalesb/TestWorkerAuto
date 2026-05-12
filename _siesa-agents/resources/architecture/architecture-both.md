---
type: base-architecture
status: base
note: >
  This document was automatically generated during siesa-agents installation.
  It represents the Siesa corporate base architecture applicable to all microservices.
  It can be extended with the /create-architecture workflow for project-specific decisions.
---

# Architecture Decision Document — Siesa Corporate Base

_This document establishes the mandatory architectural decisions for all Siesa microservices. It serves as the source of truth for consistent AI-driven development._

---

## 1. Technology Stack

### 1.1 Backend

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Language | C# | Latest | Modern features (records, pattern matching) |
| Framework | .NET | 10.x | Minimal API — NO MVC controllers |
| Primary ORM | Entity Framework Core | 10.x | Code-first with migrations |
| Advanced ORM | linq2db | Latest | Complex and high-performance queries |
| Dynamic Queries | DynamicLinq | Latest | Filters from user input |
| Composable LINQ | LinqKit | Latest | Composable predicates in repositories |
| Validation | FluentValidation | 11.* | `LocalizedValidator<T>` |
| Testing | xUnit | Latest | TDD required |
| DB | PostgreSQL | 18+ | One per microservice |
| PDF | QuestPDF | Latest | Document generation |
| API Docs | Scalar | Latest | NO Swagger / NO OpenAPI UI |
| Orchestration | Dapr | Latest | Pub/Sub + Service Invocation |

### 1.2 Mandatory Backend Libraries

| Library | Package | Version | Purpose |
|---------|---------|---------|---------|
| MasterPattern | `Siesa.MasterPattern` | `0.1.*` | Master CRUD, overrides |
| AccessManager | `Siesa.AccessManager` | `0.1.0-*` | RBAC, permissions |
| LookupField | `Siesa.BusinessUtilities.LookupFieldQueryBuilder` | `0.0.*` | Master record search |
| i18n | `Microsoft.Extensions.Localization` | Built-in | Internationalization |
| FluentValidation | `FluentValidation.DependencyInjectionExtensions` | `11.*` | Request validation |
| Pluralization | `Humanizer.Core` | `3.*` | EF Core table names |
| EF Core Design | `Microsoft.EntityFrameworkCore.Design` | `10.*` | `dotnet ef migrations` (required in API project) |

> **CRITICAL:** `Microsoft.EntityFrameworkCore.Design` must be present in the API (startup) project AND in Infrastructure. Without it in the startup project, `dotnet ef migrations add` will fail.

### 1.3 Frontend

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| Bundler | Vite | 7+ | Native ES modules, instant HMR |
| Router | TanStack Router | 1+ | File-based routing, type-safe, auto code-split |
| State (client) | Zustand | 5+ | Feature-based stores following DDD |
| State (server) | TanStack Query | 5+ | Server cache and synchronization |
| UI Components | siesa-ui-kit | Local | Siesa proprietary library |
| Primitives | Radix UI | Latest | Base accessibility |
| Styling | TailwindCSS | 4.x | Utility-first |
| Forms | React Hook Form + Zod | 7.x / 3.x | Form management + validation |
| HTTP Client | Axios | 1.x | With interceptors |
| Testing | Vitest + RTL | 2.x / 16.x | Unit/component tests |
| Microfrontends | Single-SPA (default) | Latest | Business MFEs |
| Shared modules | Module Federation | Latest | ONLY explicitly marked cross-cutting modules |

---

## 2. Architectural Patterns

### 2.1 Clean Architecture + DDD (Mandatory)

Dependencies always point inward: `Domain ← Application ← Infrastructure ← API`

```
Domain         → Entities, Value Objects, Domain Events, Repository Interfaces
Application    → Commands, Queries, DTOs, Validators, Use Cases
Infrastructure → Repositories (EF Core), DB Context, external services
API            → Minimal API Endpoints, Middleware
```

**Key principles:**
- Business logic ONLY in Domain and Application layers
- Infrastructure does NOT contain business logic
- Domain has NO references to external frameworks
- Each microservice has its own PostgreSQL database

### 2.2 MasterPattern — GLOBAL / COMPANY-SPECIFIC / UNIVERSAL

`Siesa.MasterPattern` defines three master types:

| Type | `CompanyID` | Overrides Table | Override Endpoints | Assign Endpoints |
|------|-------------|-----------------|-------------------|-----------------|
| `GLOBAL` | NO | YES `{entity}_overrides` | YES `POST /{id}/override` | YES `POST /{id}/assign` |
| `COMPANY_SPECIFIC` | YES | NO | NO | NO |
| `UNIVERSAL` | NO | NO | NO | NO |

**Override Resolution Rule:**
```
Override.Field == NULL  →  Inherits from Global base
Override.Field != NULL  →  Uses the override value
```

**Mandatory rules:**
- R-MP-001: All masters MUST extend `BaseMasterService<T>`
- R-MP-002: All masters MUST have a static `MasterDefinition` class
- R-MP-003: GLOBAL masters MUST have an Overrides table
- R-MP-004: Immutable fields (Code, Name) do NOT go in the Overrides table
- R-MP-005: Overridable fields MUST be nullable in Overrides
- R-MP-006: Tables MUST use snake_case
- R-MP-007: Override tables MUST follow the `{entities}_overrides` pattern

### 2.3 Result Pattern (Mandatory)

All domain operations return `Result<T>` — never throw exceptions for expected business flows.

```csharp
// ✅ Correct
public Result<UserDto> CreateUser(CreateUserCommand cmd)
{
    if (string.IsNullOrEmpty(cmd.Email))
        return Result.Failure<UserDto>("Email is required");
    // ...
    return Result.Success(new UserDto(user));
}

// ❌ Incorrect
public UserDto CreateUser(CreateUserCommand cmd)
{
    if (string.IsNullOrEmpty(cmd.Email))
        throw new ArgumentException("Email is required"); // Do not use for business validations
}
```

### 2.4 Dependency Injection — Registration Sequence (Mandatory)

```csharp
// Program.cs — MANDATORY ORDER
builder.Services.AddLocalization();                    // 1. i18n first
builder.Services.AddFluentValidation();                // 2. Validation
builder.Services.AddDbContext<AppDbContext>();          // 3. DB Context
builder.Services.AddRepositories();                    // 4. Repositories
builder.Services.AddApplicationServices();             // 5. Application services
builder.Services.AddMasterPattern();                   // 6. MasterPattern
builder.Services.AddAccessManager();                   // 7. AccessManager
builder.Services.AddLookupFieldQueryBuilder();         // 8. LookupField
builder.Services.AddHealthChecks();                    // 9. Health Checks
```

---

## 3. Solution Structure (Backend)

```
src/
├── {Service}.API/              # Presentation Layer — Minimal API Endpoints
│   ├── Endpoints/
│   │   └── {Feature}/         # Endpoint classes per feature
│   ├── Middleware/
│   └── Program.cs
├── {Service}.Application/      # Application Layer — CQRS, DTOs, Validators
│   └── {Feature}/
│       ├── Commands/
│       ├── Queries/
│       ├── DTOs/
│       ├── Validators/
│       └── Interfaces/
├── {Service}.Domain/           # Domain Layer — Entities, Value Objects, Events
│   └── {Feature}/
│       ├── Entities/
│       ├── ValueObjects/
│       └── Events/
└── {Service}.Infrastructure/   # Infrastructure Layer — EF Core, Repositories
    ├── Data/
    │   ├── Configurations/
    │   ├── Migrations/
    │   └── {Service}DbContext.cs
    └── Repositories/
tests/
├── {Service}.UnitTests/        # xUnit + EF Core InMemory
└── {Service}.IntegrationTests/ # xUnit + Testcontainers.PostgreSql
```

---

## 4. Frontend Architecture

### 4.1 Folder Structure

```
src/
├── main.tsx
├── router.tsx
├── routeTree.gen.ts            # Auto-generated by TanStack Router
├── globals.css
├── routes/                     # TanStack Router — file-based routing
│   ├── __root.tsx              # Root layout
│   ├── index.tsx
│   ├── _auth.tsx               # Pathless layout
│   ├── _auth/login.tsx
│   ├── _app.tsx                # Protected layout
│   └── _app/{module}/*
├── modules/                    # DDD business modules
│   └── {module}/
│       ├── domain/             # Entities, repository interfaces, types
│       ├── application/        # Use-cases, hooks, store
│       ├── infrastructure/     # Repository impl, api, adapters
│       └── presentation/       # Components
├── shared/                     # Reusable code
│   ├── components/             # UI components, shadcn/ui
│   ├── hooks/
│   ├── lib/                    # Utilities, api-client
│   ├── types/
│   └── constants/
├── app/                        # Global configuration
│   ├── providers/
│   └── store/
└── infrastructure/             # Global external services
    ├── api/
    ├── storage/
    └── pwa/
```

### 4.2 TanStack Router — File Conventions

| Prefix | Effect | Example |
|--------|--------|---------|
| `_` | Pathless layout | `_app.tsx` → layout only |
| `.` | Flat routing | `orders.$id.tsx` → `/orders/:id` |
| `-` | Ignored by router | `-components/` |
| `$` | Dynamic parameter | `$orderId.tsx` → `:orderId` |

### 4.3 Microfrontends — Single-SPA (Default)

**Single-SPA is the DEFAULT for all business modules.**
Module Federation is used ONLY for explicitly marked cross-cutting modules.

| Aspect | Single-SPA | Module Federation |
|--------|------------|-------------------|
| CSS/JS Isolation | Full | Partial |
| Error Boundaries | Built-in | Manual |
| Complexity | Low | High |
| Usage | All MFEs | Shared modules only |

**Port conventions:**
| Module | Port | Type |
|--------|------|------|
| app-shell | 3000 | Host |
| Business modules | 3001-3009 | Single-SPA |
| Federable modules | 3010+ | Module Federation |

**Mandatory Single-SPA Entry Point (`src/spa.tsx`):**
- Export `bootstrap`, `mount`, `unmount` lifecycles
- Implement `errorBoundary`
- `domElementGetter` pointing to `#single-spa-application` ⚠️ CRITICAL

---

## 5. Backend Standards

### 5.1 DateTime — Required Types

⚠️ **ALWAYS use `DateTimeOffset`, NEVER `DateTime`**

```csharp
// ✅ Correct
public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
public DateTimeOffset UpdatedAt { get; private set; } = DateTimeOffset.UtcNow;

// ❌ Incorrect
public DateTime CreatedAt { get; private set; }  // NEVER
```

| Case | C# Type | PostgreSQL Type |
|------|---------|----------------|
| Timestamp with timezone | `DateTimeOffset` | `TIMESTAMP WITH TIME ZONE` |
| Date only | `DateOnly` | `DATE` |
| Time only | `TimeOnly` | `TIME` |
| NEVER use | ~~`DateTime`~~ | — |

### 5.2 Primary Keys — UUID v7

```csharp
// ✅ Required — UUID v7 for all PKs
public Guid ID { get; private set; } = Guid.CreateVersion7();

// ❌ Incorrect
public Guid ID { get; private set; } = Guid.NewGuid();  // UUID v4 — do not use
```

PostgreSQL: `DEFAULT uuidv7()` in migrations.

### 5.3 Optimistic Concurrency — xmin

- All masters expose `rowVersion` (uint) in GET responses
- PUT/DELETE require the client to send `rowVersion`
- Mismatch → HTTP 409 Problem Details RFC 7807
- Force-save via `?force=true` (requires elevated permission)

### 5.4 ORM Strategy — When to Use Each Tool

| Tool | When to Use |
|------|-------------|
| **EF Core 10** | Standard CRUD, DDD entities with tracking, relationships, migrations |
| **linq2db** | Complex high-performance queries, dashboards, analytics, reports |
| **DynamicLinq** | Dynamic filters from user input, configurable grids |
| **LinqKit** | Type-safe composable predicates, DDD repositories with multiple criteria |

### 5.5 Domain Entity — Mandatory Structure

```csharp
public class {Entity}Entity : IMasterEntity
{
    private {Entity}Entity() { }  // EF Core materialization

    private {Entity}Entity(Guid id, /* params */) : base()
    {
        ID = id;
        // ...
    }

    // IMasterEntity
    public Guid ID { get; private set; }
    public string Code { get; private set; } = string.Empty;  // Immutable post-creation
    public bool IsActive { get; set; } = true;
    public uint Version { get; set; }  // PostgreSQL xmin → rowVersion DTO

    // Timestamps
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    // Audit — FK to amgr_users_prj
    public Guid CreatedByUserID { get; private set; }
    public Guid UpdatedByUserID { get; private set; }

    // Mandatory factory method
    public static {Entity}Entity Create(/* params */, Guid createdByUserId)
    {
        return new {Entity}Entity(Guid.CreateVersion7(), /* params */);
    }
}
```

### 5.6 Minimal API — Endpoint Structure

```csharp
public static class {Feature}Endpoints
{
    public static void Map{Feature}Endpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/{feature}")
            .WithTags("{Feature}")
            .RequireAuthorization();

        group.MapPost("/", Create{Entity})
            .WithName("Create{Entity}")
            .Produces<{Entity}ResponseDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem();

        group.MapGet("/{id:guid}", GetById)
            .WithName("Get{Entity}ById")
            .Produces<{Entity}ResponseDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/search", Search)
            .WithName("Search{Entity}")
            .Produces<LookupFieldResult>();
    }
}
```

**Mandatory URL versioning:** `/api/v1/` prefix on all business endpoints.

### 5.7 Error Handling — Problem Details RFC 7807

```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Validation Error",
  "status": 400,
  "detail": "One or more validation errors occurred.",
  "errors": [
    { "field": "email", "message": "Email is required" }
  ]
}
```

| Scenario | HTTP Status |
|----------|-------------|
| Validation | 400 |
| Unauthorized | 401 |
| Forbidden | 403 |
| Not found | 404 |
| Dependency conflict | 409 |
| Concurrency conflict (xmin) | 409 |

### 5.8 Testing Standards

```csharp
// Unit Tests — xUnit + EF Core InMemory
[Fact]
public async Task Handle_ValidCommand_ShouldCreate{Entity}()
{
    // Arrange
    var options = new DbContextOptionsBuilder<AppDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
    // Act + Assert
}

// Integration Tests — xUnit + Testcontainers
[Collection("PostgreSQL")]
public class {Entity}IntegrationTests : IAsyncLifetime
{
    // Testcontainers.PostgreSql — real database in container
}
```

**TDD is mandatory** — write tests before production code.

### 5.9 LookupField — Integration

```csharp
// Program.cs
builder.Services.AddLookupFieldQueryBuilder();

// Endpoint — mandatory pattern
group.MapPost("/search", async (SearchRequest request, AppDbContext ctx,
    ILookupFieldQueryService lookup) =>
{
    try
    {
        var query = ctx.{Entities}.AsNoTracking();
        var result = await lookup.SearchAsync(query, request);
        return Results.Ok(result);
    }
    catch (LookupFieldValidationException ex)
    {
        return Results.BadRequest(new { errors = ex.Errors });
    }
})
.RequirePermission("{service}.{entity}.read")
.WithName("Search{Entity}");
```

**LookupField Rules:**
- R-LF-001: All master selectors MUST use LookupField
- R-LF-002: Backend MUST use `AsNoTracking()`
- R-LF-003: Backend MUST handle `LookupFieldValidationException`
- R-LF-004: Version with minor pinning `0.0.*`
- R-LF-005: Register with `services.AddLookupFieldQueryBuilder()`
- R-LF-006: Endpoint pattern: `POST /api/v1/{masters}/search`

---

## 6. Database Conventions (PostgreSQL)

### 6.1 Naming Conventions

| Element | Convention | C# → DB Example |
|---------|-----------|----------------|
| Tables | `snake_case` plural | `products`, `order_items` |
| Columns | `snake_case` | `CustomerID` → `customer_id` |
| FK columns | `{entity_name}_id` | `OriginWarehouseID` → `origin_warehouse_id` |
| Audit FKs | `{action}_by_user_id` | `CreatedByUserID` → `created_by_user_id` |
| Indexes | `ix_{table}_{columns}` | `ix_products_code` |
| Unique | `uk_{table}_{columns}` | `uk_products_code` |
| Constraints | `{type}_{table}_{columns}` | `fk_orders_customers` |
| Schemas | `lowercase_underscore` | `inventory`, `sales` |

### 6.2 Projected Tables (Cross-Service)

Local read-only copies of entities from other microservices. Updated via Pub/Sub.

| Element | Convention | Example |
|---------|-----------|---------|
| C# Class | `{PREFIX}_{Entity}Prj` | `SEGM_CompanyPrj` |
| DB Table | `{prefix}_{origin_table}_prj` | `segm_companies_prj` |
| Prefix | 4 chars uppercase | `AUTH`, `INVT`, `SEGM`, `TPRT` |

**Mandatory patterns for projected tables:**
1. All inherit from `Entity` (Guid Id as PK)
2. Read-only at 3 layers: API (no POST/PUT/DELETE), Repository (reads only), EF Core (`.AsNoTracking()`)
3. No physical FKs between projected tables (out-of-order event handling)
4. IDs belong to the origin service — Core NEVER generates projection IDs

### 6.3 EF Core — Mapping Strategy

```csharp
// DbContext — always apply snake_case LAST
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.HasDefaultSchema("{service}");
    modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    modelBuilder.ApplySnakeCaseNaming();  // ALWAYS at the end
}

// Entity Configuration
public class {Entity}Configuration : IEntityTypeConfiguration<{Entity}Entity>
{
    public void Configure(EntityTypeBuilder<{Entity}Entity> builder)
    {
        builder.ToTable("{entities}", "{schema}");
        builder.HasKey(e => e.ID);
        builder.Property(e => e.ID).HasColumnType("uuid").IsRequired();
        builder.Property(e => e.Version)
            .HasColumnName("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();
        builder.Ignore(e => e.DomainEvents);
    }
}
```

---

## 7. Frontend Standards

### 7.1 MasterCrud — Orchestrator Component

`MasterCrud` is the highest-level component in the Siesa ecosystem for master data management. **All master modules MUST use it.**

```tsx
import { MasterCrud } from '@/components/MasterCrud';

<MasterCrud<Product>
  title="Product Catalog"
  entityName="Product"
  fields={productFields}
  service={productService}
/>
```

**Main props:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `title` | string | — | Module title |
| `entityName` | string | — | Entity singular name |
| `fields` | `MasterCrudField<T>[]` | — | Columns/form configuration |
| `service` | `CrudService<T>` | — | Network operations |
| `activeByCompany` | boolean | false | Multi-company support |
| `navigationType` | `'modal' \| 'sidebar' \| 'page'` | — | Navigation type |
| `formColumns` | `1 \| 2` | 2 | Form columns |

**Available FieldTypes:** `text`, `number`, `email`, `date`, `boolean`, `select`, `lookup`

**Rule R-LF-001:** For master record selection, ALWAYS use `type: 'lookup'` with LookupField.

### 7.2 State Management

```typescript
// Zustand — client state (feature-based)
const useProductStore = create<ProductState>((set) => ({
  selectedProduct: null,
  setSelectedProduct: (product) => set({ selectedProduct: product }),
}));

// TanStack Query — server state
const { data, isLoading } = useQuery({
  queryKey: ['products', filters],
  queryFn: () => productApi.getAll(filters),
  staleTime: 5 * 60 * 1000, // 5 min
});
```

### 7.3 Dependent Query Pattern

```tsx
// Cascading LookupField
<LookupField
  entity="cost-centers"
  fetcher={fetcher}
  displayFields={['Code', 'Name']}
  value={costCenterId}
  onChange={(record) => setCostCenterId(record?.Id ?? null)}
  getFilters={() => ({ CompanyId: selectedCompanyId })}
  dependencies={[selectedCompanyId]}
  disabled={!selectedCompanyId}
/>
```

---

## 8. Design System

### 8.1 Color Palette (Brand Colors)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-600` | `#0e79fd` | Primary brand color |
| `--color-secondary-950` | `#000000` | Secondary color |
| `--color-tertiary-800` | `#154ca9` | Tertiary color |
| Success | `green.500` | Success states |
| Warning | `amber.500` | Warnings |
| Error | `red.500` | Errors |
| Info | `cyan.500` | Information |

### 8.2 Typography

```css
--font-primary: 'Inter_18pt-Regular', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Typographic scale:**

| Element | Tailwind Classes |
|---------|----------------|
| H1 | `text-4xl font-bold leading-tight` |
| H2 | `text-3xl font-bold leading-tight` |
| H3 | `text-2xl font-semibold leading-snug` |
| Body | `text-base font-normal leading-relaxed` |
| Caption | `text-xs font-light leading-normal` |
| Label | `text-sm font-medium leading-normal` |

### 8.3 Dark Mode

- Method: class-based (Tailwind `dark:`)
- Selector: `html` element (root)
- Framework: `next-themes` (SSR-safe)
- Default: system preference

```tailwind
text-zinc-900 dark:text-zinc-50
bg-white dark:bg-slate-950
bg-slate-50 dark:bg-slate-900
```

### 8.4 Accessibility

| Requirement | Standard |
|-------------|---------|
| Color contrast | 4.5:1 minimum (WCAG 2.1 AA) |
| Large text | 3.1:1 minimum |
| Focus indicators | `2px solid var(--color-primary-600)` |
| Touch targets | 44px minimum |
| Minimum font size | 16px |

---

## 9. Infrastructure Decisions

### 9.1 Multi-Tenancy

- JWT Token contains `TenantId` → Connection Resolver selects the tenant database
- `Company-ID` in headers/payload for multi-company operations within the tenant
- Schema isolation per microservice within the tenant database

**Mandatory flow:**
```
Request → JWT Validation → TenantId Extraction → Connection Resolver → AppDbContext (tenant DB)
```

### 9.2 RBAC — Permission System

- Permission namespace: `{service}.{resource}.{action}`
- Examples: `manufacturing.methods.create`, `segment.companies.read`
- Validated against AccessManager on EVERY operation
- Server-side enforcement ONLY — never trust UI context

```csharp
group.MapPost("/", CreateEntity)
    .RequirePermission("{service}.{entity}.create");
```

### 9.3 Dapr Integration

**Pub/Sub — Topic naming:** `{service}.{entity}.{action}`
Examples: `inventory.cost-segment.updated`, `segment.company.created`

**Idempotency Handler Pattern:**
```csharp
[Topic("pubsub", "{service}.{entity}.{action}")]
public async Task<IActionResult> Handle{Entity}{Action}Event(
    [FromBody] DomainEventEnvelope<{Entity}{Action}Event> envelope)
{
    // Verify idempotency (process only once)
    // Validate tenantId
    // Process event
}
```

### 9.4 Health Checks

```csharp
builder.Services.AddHealthChecks()
    .AddNpgsql(connectionString, name: "postgresql")
    .AddRedis(redisConnection, name: "redis");

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});
```

### 9.5 Logging

```csharp
// Mandatory structured logging
_logger.LogInformation("Processing {EntityType} {EntityId} for tenant {TenantId}",
    entityType, entityId, tenantId);

// NEVER log sensitive data
// Correlation IDs for request tracing
// Log levels: Trace, Debug, Information, Warning, Error, Critical
```

### 9.6 Docker

- Docker ONLY for production and CI/CD environments
- Local development without Docker using `dotnet CLI`
- `docker-compose` defines: PostgreSQL, Redis (Dapr state store), Dapr Placement

---

## 10. Naming Conventions Summary

### 10.1 C# / Backend

| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase singular | `MethodEntity`, `WorkCenterRate` |
| Properties | PascalCase | `StorageGroupID`, `IsActive` |
| Private fields | `_camelCase` | `_repository`, `_daprClient` |
| Interfaces | `I` + PascalCase | `IUserRepository` |
| Commands | `{Action}{Entity}Command` | `CreateUserCommand` |
| Queries | `Get{Entity}Query` | `GetUserByIdQuery` |
| DTOs | `{Entity}{Type}Dto` | `UserResponseDto`, `UserCreateDto` |

### 10.2 PostgreSQL

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | `snake_case` plural | `methods`, `work_centers` |
| Columns | `snake_case` | `cost_center_id`, `is_active` |
| FK columns | `{entity}_id` | `method_id`, `company_id` |
| Indexes | `ix_{table}_{cols}` | `ix_methods_code` |
| Unique | `uk_{table}_{cols}` | `uk_methods_code` |

### 10.3 Frontend

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `UserCard`, `ProductList` |
| Files | kebab-case | `user-card.tsx`, `product-list.tsx` |
| Directories | kebab-case | `user-management/` |
| Hooks | `use` + camelCase | `useProductStore`, `useAuth` |
| Stores | `use{Feature}Store` | `useProductStore` |

---

## 11. Compliance Checklist

### Backend — New Microservice

```markdown
## Setup
- [ ] .NET 10 solution with 4 projects (API, Application, Domain, Infrastructure)
- [ ] NuGet: Siesa.MasterPattern 0.1.*, Siesa.AccessManager, LookupFieldQueryBuilder 0.0.*
- [ ] GitHub Packages source configured (PAT read:packages)
- [ ] PostgreSQL 18+ — dedicated database
- [ ] docker-compose with PostgreSQL + Redis + Dapr Placement

## Architecture
- [ ] Clean Architecture — dependencies point inward
- [ ] DDD — entities with factory methods, private setters
- [ ] UUID v7 (Guid.CreateVersion7()) for all PKs
- [ ] DateTimeOffset for all timestamps (NEVER DateTime)
- [ ] xmin concurrency on all master entities
- [ ] Result Pattern in domain operations

## MasterPattern
- [ ] All master entities implement IMasterEntity
- [ ] BaseMasterService<T> extended by all services
- [ ] MasterDefinition with correct Type (GLOBAL/COMPANY_SPECIFIC/UNIVERSAL)
- [ ] Override tables for GLOBAL masters (if applicable)

## API
- [ ] Minimal API (NO MVC controllers)
- [ ] URL versioning /api/v1/
- [ ] RBAC on all endpoints (RequirePermission)
- [ ] Problem Details RFC 7807 on all errors
- [ ] LookupField /search endpoint on all masters
- [ ] Scalar (NO Swagger)

## Testing
- [ ] TDD — tests written before production code
- [ ] xUnit + EF Core InMemory for unit tests
- [ ] xUnit + Testcontainers.PostgreSql for integration tests
```

### Frontend — New Module

```markdown
## Setup
- [ ] Vite 7+ with TanStack Router
- [ ] siesa-ui-kit installed
- [ ] TanStack Query 5+ configured
- [ ] Zustand 5+ configured
- [ ] TailwindCSS 4+ configured

## Single-SPA (if MFE)
- [ ] vite-plugin-single-spa configured
- [ ] src/spa.tsx with lifecycles (bootstrap, mount, unmount)
- [ ] cssLifecycleFactory configured
- [ ] errorBoundary implemented
- [ ] domElementGetter → #single-spa-application ⚠️ CRITICAL
- [ ] Unique port assigned
- [ ] cors: true in server config

## Architecture
- [ ] Clean Architecture + DDD in business modules
- [ ] MasterCrud for master data management
- [ ] LookupField for record selection
- [ ] React Hook Form + Zod for forms
- [ ] Dark mode with Tailwind dark: classes

## Accessibility
- [ ] 4.5:1 minimum contrast (WCAG 2.1 AA)
- [ ] Visible focus indicators
- [ ] 44px minimum touch targets
- [ ] Landmarks, headings, labels, alt text
```
