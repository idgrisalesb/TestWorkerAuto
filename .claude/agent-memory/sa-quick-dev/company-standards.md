# Company Standards - Quick Reference for SA Quick-Dev Agents

> Source: `bmad/bmm/workflows/3-solutioning/create-architecture/data/company-standards/`
> READ-ONLY. These are mandatory rules for all implementations.

---

## Architecture: Clean Architecture + DDD (Frontend & Backend)

**Layers (dependency flows inward):**
1. **Domain** - Entities, value objects, repository interfaces, domain services, types (ZERO dependencies)
2. **Application** - Use cases, hooks/commands/queries, stores, validators, interfaces
3. **Infrastructure** - Repository implementations, API clients, adapters, external services
4. **Presentation** - UI components (frontend) / Minimal API endpoints (backend)

---

## Frontend Stack

| Tech | Version | Purpose |
|------|---------|---------|
| Vite | 7+ | Bundler |
| React | 18+ | UI (functional components + hooks) |
| TypeScript | 5+ | Strict mode, NO `any` |
| TanStack Router | 1+ | File-based type-safe routing |
| TanStack Query | 5+ | Server state |
| Zustand | 5+ | Client state |
| shadcn/ui + Radix UI | - | Components (install via MCP) |
| TailwindCSS | v4 | Styling |
| Zod + React Hook Form | - | Validation + Forms |
| Vitest + RTL | - | Testing |
| Axios | - | HTTP client |

### Frontend Folder Structure
```
src/
  routes/           # TanStack Router file-based routing ONLY
  modules/          # Business modules (MODULE > DOMAIN > FEATURE)
    {module}/
      {domain}/
        {feature}/
          domain/         # entities/, repositories/, services/, types/
          application/    # use-cases/, hooks/, store/
          infrastructure/ # repositories/, api/, adapters/
          presentation/   # components/
  shared/           # Reusable: components/ui/, hooks/, lib/, types/, constants/
  app/              # Global: providers/, store/, config/
  infrastructure/   # Global: api/, storage/, pwa/
```

### TanStack Router Prefixes
| Prefix | Effect |
|--------|--------|
| `_` | Pathless layout (no URL segment) |
| `.` | Flat routing (nested without folders) |
| `-` | Ignored by router (colocated files) |
| `$` | Dynamic parameter |

### Microfrontends
- **DEFAULT**: Single-SPA (`vite-plugin-single-spa` + `single-spa-react`) for all business modules
- **EXCEPTION**: Module Federation ONLY for shared/transversal modules explicitly marked by engineer
- `domElementGetter` pointing to `#single-spa-application` is CRITICAL

### Frontend Key Rules
- Components: check siesa-ui-kit first, then shadcn via MCP, then custom
- State: Zustand (client) + TanStack Query (server) + useState (local) + Router search params (URL)
- All user-facing text MUST be in Spanish
- Code (variables, functions, classes) MUST be in English
- Package manager: `pnpm` for new projects, respect existing lockfile
- WCAG 2.1 AA accessibility compliance
- Bundle budget: < 500KB gzipped

---

## Backend Stack

| Tech | Version | Purpose |
|------|---------|---------|
| .NET | 10 | Framework |
| C# Minimal API | - | API endpoints (NO controllers) |
| Entity Framework Core | 10 | Primary ORM |
| PostgreSQL | 18+ | Database (one per microservice) |
| FluentValidation | - | Validation |
| xUnit | - | Testing |
| Scalar | - | API docs (NO Swagger) |
| QuestPDF | - | PDF generation |
| linq2db | - | Complex high-performance queries |
| DynamicLinq | - | Runtime dynamic filters |
| LinqKit | - | Composable type-safe predicates |

### Backend Folder Structure (.NET Solution)
```
src/
  Services/
    {Domain}/
      {Domain}.API/              # Minimal API: Program.cs, Endpoints/, Middleware/
      {Domain}.Application/      # Commands/, Queries/, DTOs/, Validators/, Interfaces/
      {Domain}.Domain/           # Entities/, ValueObjects/, Aggregates/, Events/, Services/
      {Domain}.Infrastructure/   # Data/ (DbContext, Configurations/, Migrations/), Repositories/, Services/
  Shared/
    Shared.Domain/               # Base classes: AggregateRoot, Entity, ValueObject, DomainEvent
    Shared.Infrastructure/       # BaseRepository, UnitOfWork, Middleware
    Shared.Common/               # Extensions, Helpers, Constants
tests/
  {Domain}.UnitTests/
  {Domain}.IntegrationTests/
```

### Backend Critical Rules

**Primary Keys:** UUID (Guid) MANDATORY for all entities
```csharp
public abstract class Entity { public Guid Id { get; protected set; } = Guid.NewGuid(); }
```

**DateTime:** ALWAYS `DateTimeOffset` for timestamps, NEVER `DateTime`
```csharp
public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;
// Use DateOnly for date-only fields, TimeOnly for time-only
```

**Entity Pattern:** Private constructor + static Create() factory + domain events
```csharp
public static UserEntity Create(string email, string name) { /* validate, create, AddDomainEvent */ }
```

**API Documentation:** `app.MapScalarApiReference()` — NEVER `app.UseSwagger()`

**Error Responses:** Problem Details RFC 7807 format

**CQRS Pattern:** Commands (write) and Queries (read) separated with handlers

---

## Database Conventions (PostgreSQL)

| Element | Convention | Example |
|---------|-----------|---------|
| Tables | snake_case | `products`, `order_items` |
| Columns | snake_case | `created_at`, `is_active` |
| PK column | `id` (UUID) | `id UUID PRIMARY KEY DEFAULT uuidv7()` |
| Business key | `code` | `code VARCHAR(50) NOT NULL` |
| FK columns | `{entity_name}_id` | `customer_id UUID REFERENCES customers(id)` |
| Audit FKs | `{action}_by_user_id` | `created_by_user_id`, `updated_by_user_id` |
| Indexes | `ix_{table}_{columns}` | `ix_products_code` |
| Unique indexes | `uk_{table}_{columns}` | `uk_products_code` |
| Constraints | `{type}_{table}_{columns}` | `pk_products`, `fk_orders_customers` |
| Schemas | lowercase | `authentication`, `inventory`, `sales` |

### EF Core: Automatic snake_case via `ApplySnakeCaseNaming()` — NO manual `[Column]`/`[Table]` attributes

### Projection Tables (Cross-Service)
- Pattern: `{PREFIX}_{Entity}Prj` (C#) → `{prefix}_{origin_table}_prj` (DB)
- Prefixes: `AUTH`, `INVT`, `SALE`, `ACCT`, `PROD` (4 uppercase chars)
- No FK constraints — application-level validation
- Sync via domain events (eventual consistency)

### Database per Microservice
- Each microservice owns its own PostgreSQL DB
- No direct DB access between services
- Communication: REST (sync), Message Broker (async), gRPC (high-perf)

---

## ORM Selection Guide

| Scenario | Use |
|----------|-----|
| Standard CRUD, DDD entities, tracking | EF Core 10 |
| Complex queries, dashboards, analytics, high volume | linq2db |
| Runtime dynamic filters from user input | DynamicLinq |
| Complex business rule predicates, composable expressions | LinqKit |

---

## Testing Standards

### Frontend
- Vitest + React Testing Library + MSW
- Unit tests for entities, use cases, utilities
- Component tests with accessibility checks (axe)

### Backend
- xUnit + EF Core InMemory (unit) + PostgreSQL Test Containers (integration)
- TDD approach: tests before/alongside implementation
- Coverage target: >80%
- Test structure: Arrange / Act / Assert

---

## Security
- JWT + RBAC + FluentValidation on all endpoints
- HTTPS only (production), secrets in env vars
- OWASP Top 10 compliance
- Never store sensitive data in localStorage unencrypted
- Never expose API keys in frontend code

---

## UX Design System

### Brand Colors
- Primary: `#0e79fd` (Siesa Blue)
- Secondary: `#000000` (Black — brand only, NOT for grays)
- Tertiary: `#154ca9` (Deep Blue)
- Neutrals: Use Tailwind `slate-*` scale

### Typography
- Font: Inter (3 weights: Light 300, Regular 400, Bold 700)
- Dark mode: class-based (`darkMode: 'class'`)

### Loading States
- react-loading-skeleton for placeholders
- Skeleton screens, not spinners

### Icons
- Primary: Heroicons
- Secondary: Font Awesome 6.5+
