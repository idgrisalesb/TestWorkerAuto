## Entidades Proyectadas

### Epic 1: Projected Entities Synchronization Infrastructure

Deliver the complete Dapr Pub/Sub synchronization infrastructure inside MfgStructure: solution scaffold, EF Core projection table migrations, idempotent sync handlers for all 16 projected entities, LookupField Search endpoints, and a periodic reconciliation BackgroundService. This epic is the mandatory prerequisite that unblocks all other features.

#### Acceptance Criteria (QA Validation)

- [ ] **AC-E1.1:** The service starts successfully and all 16 projection tables are populated with current data before the first external request is served.
- [ ] **AC-E1.2:** When an origin service publishes an event (created/updated/status_changed/deleted), the corresponding local projection table reflects the change within 5 seconds.
- [ ] **AC-E1.3:** Events with an invalid or mismatched tenant are silently rejected (logged) without crashing the service or corrupting local data.
- [ ] **AC-E1.4:** Downstream features (Methods, Work Centers) can successfully look up projected entities (Companies, StorageGroups, CostCenters, etc.) via the Search endpoints with correct filtering by company and active status.
- [ ] **AC-E1.5:** After a restart following downtime, the service automatically recovers projection consistency via the reconciliation job, with no manual intervention required.

**FRs covered:** FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35

#### Story 1.1: Solution Scaffold & Infrastructure Setup

As a developer,
I want the MfgStructure .NET 10 solution scaffolded with Clean Architecture layers, all required NuGet packages, and Docker compose running,
So that the team has a working, buildable baseline before any feature code is written.

**Acceptance Criteria:**

**Given** no solution exists
**When** the developer runs the scaffold commands (`dotnet new sln`, project creation, NuGet additions)
**Then** the solution builds successfully with 4 projects: `MfgStructure.API`, `MfgStructure.Application`, `MfgStructure.Domain`, `MfgStructure.Infrastructure`
**And** `Siesa.MasterPattern v0.1.3`, `Siesa.BusinessUtilities.LookupFieldQueryBuilder v0.0.5`, `Dapr.AspNetCore`, `Dapr.Client`, `Npgsql.EntityFrameworkCore.PostgreSQL`, `linq2db.EntityFrameworkCore`, `LinqKit.Microsoft.EntityFrameworkCore`, `FluentValidation`, `Serilog.AspNetCore`, and `Scalar.AspNetCore` are resolvable from GitHub Packages (SiesaTeams org)

**Given** the repository contains the `docker-compose.yml` and `docker-compose.override.yml` from shared-docs
**When** `docker compose up` is executed
**Then** PostgreSQL 18 (`mfgstructure-postgres`), Redis 8-alpine (`mfgstructure-redis`), and Dapr Placement v1.16.9 (`mfgstructure-dapr-placement`) start successfully

**Given** the API project is configured with Problem Details RFC 7807, Scalar API reference, Serilog structured logging, and Bearer JWT middleware
**When** the API starts (`dotnet run`)
**Then** the service responds to health check and the Scalar API reference is accessible at the configured endpoint

#### Story 1.2: Projected Entity EF Core Configurations & Migrations

As a developer,
I want EF Core entity configurations and database migrations for all 16 projected entity tables (`*_prj`),
So that projection tables exist in the database before any sync handlers or reconciliation jobs run.

**Acceptance Criteria:**

**Given** the MfgStructure database is running via Docker compose
**When** the EF Core migration for `*_prj` tables is applied
**Then** all 16 projected entity tables exist in the `mfgstructure` schema: `amgr_users_prj`, `invt_cost_segments_prj`, `invt_cost_segments_overrides_prj`, `invt_storages_prj`, `invt_storage_groups_prj`, `invt_storage_groups_overrides_prj`, `invt_storages_overrides_prj`, `segm_companies_prj`, `segm_operation_centers_prj`, `segm_operation_centers_overrides_prj`, `segm_user_company_assigments_prj`, `segm_cost_centers_prj`, `segm_cost_centers_overrides_prj`, `segm_cost_center_groups_prj`, `tprt_third_parties_prj`, `tprt_third_parties_overrides_prj`

**Given** the migration runs successfully
**When** a row is inserted into any single-PK `*_prj` table
**Then** the PK is the UUID from the source event (`ValueGeneratedNever` — never auto-generated locally) and timestamp columns default to `NOW()` (stored as `DateTimeOffset`)
**And** no EF Core model warnings or migration errors are produced

#### Story 1.3: Dapr Pub/Sub Subscription Registration

As a system operator,
I want MfgStructure to automatically register all required Dapr Pub/Sub subscriptions at startup,
So that the service begins receiving projected entity events from origin services without any manual sidecar configuration.

**Acceptance Criteria:**

**Given** Dapr sidecar is running with `pubsub.yaml` pointing to the GCP Pub/Sub broker
**When** the MfgStructure API starts
**Then** all required subscriptions (one per event action per entity — created/updated/status_changed/deleted for each of the 16 entities) are registered via `app.MapSubscribeHandler()` and the Dapr subscription discovery endpoint returns all expected topics
**And** topic names follow the convention `{service}.{entity}.{action}` (e.g., `inventory.cost-segment.created`)

**Given** no manual configuration is required
**When** a new subscription is needed
**Then** adding a handler in code automatically registers the subscription at startup with no YAML changes required beyond the initial `pubsub.yaml` component definition

#### Story 1.4: Projection Sync Handlers — AccessManager & Inventory Entities

As a system,
I want idempotent projection sync handlers for AccessManager (User) and Inventory (CostSegment, CostSegmentOverride, Storage, StorageGroup, StorageGroupOverride, StorageOverride) events,
So that local projection tables for these 7 entities stay current with origin service data via Dapr Pub/Sub.

**Acceptance Criteria:**

**Given** a valid Dapr event for any AccessManager or Inventory projected entity arrives with correct `tenantId`
**When** the handler processes the event
**Then** the corresponding local `*_prj` table is upserted (INSERT OR UPDATE by origin entity ID) within 2 seconds
**And** a `status_changed` or `deleted` event sets `is_active = false` on the local record

**Given** the same event is delivered N times (Dapr at-least-once delivery)
**When** each delivery is processed
**Then** the resulting database state is identical after each delivery (idempotency guaranteed)

**Given** an event with an invalid or mismatched `tenantId` arrives
**When** the handler processes the event
**Then** the event is rejected, a warning is logged (with event metadata, no sensitive data), the service returns HTTP 400, and processing of subsequent events continues without any crash or service interruption

#### Story 1.5: Projection Sync Handlers — Segment & ThirdParty Entities

As a system,
I want idempotent projection sync handlers for Segment (Company, OperationCenter, OperationCenterOverride, UserCompanyAssigments, CostCenter, CostCenterOverride, CostCenterGroup) and ThirdParty (ThirdParty, ThirdPartyOverride) events,
So that all 16 projected entity tables are fully synchronized with origin services.

**Acceptance Criteria:**

**Given** a valid Dapr event for any Segment or ThirdParty projected entity arrives with correct `tenantId`
**When** the handler processes the event
**Then** the corresponding local `*_prj` table is upserted by origin entity ID within 2 seconds
**And** soft-delete/status_changed events set `is_active = false` on the local record

**Given** the same event is delivered N times
**When** each delivery is processed
**Then** the resulting database state is identical (idempotency)

**Given** a single entity handler fails with an unrecoverable error (e.g., DB constraint violation)
**When** the error is encountered
**Then** only that specific event handler fails; all other entity handlers remain operational and continue processing their events normally

#### Story 1.6: LookupField Search Endpoints for Projected Entities

As a consumer feature (Methods, Work Centers),
I want LookupField-compatible Search endpoints for all 10 searchable projected entities,
So that form LookupField controls can retrieve paginated, filterable data scoped to the caller's company context.

**Acceptance Criteria:**

**Given** a consumer sends a GET to `/api/v1/projections/{entity}/search` with pagination and filter parameters and a valid Bearer JWT
**When** the endpoint processes the request
**Then** the response conforms to the `LookupFieldQueryBuilder v0.0.5` response contract: paginated results with total count, correct page size, and filterable fields
**And** results are filtered by `is_active = true` and `company_id` matching the caller's company context
**And** for entities without a direct `company_id` column, CompanyID filtering is applied via JOIN with the corresponding Override table (FR33)
**And** the endpoint returns results in < 300ms under normal load (NFR2)

**Given** a consumer attempts a POST/PUT/DELETE on a projected entity endpoint
**When** the request is received
**Then** the system returns HTTP 405 Method Not Allowed (FR34 — no CRUD on projected entities)

**Given** the caller sends a request without a valid Bearer JWT
**When** the endpoint validates authentication
**Then** the system returns HTTP 401 (NFR4)

#### Story 1.7: Reconciliation BackgroundService

As a system operator,
I want a reconciliation BackgroundService that runs at service startup and periodically thereafter using Dapr Service Invocation,
So that local projection tables automatically recover consistency after downtime or missed events, without manual intervention.

**Acceptance Criteria:**

**Given** MfgStructure starts with `Projections:ReconciliationOnStartup = true`
**When** the BackgroundService initializes
**Then** reconciliation runs for all 16 projected entities via Dapr Service Invocation before the HTTP server accepts the first external request (blocking startup — NFR9)
**And** each entity's result (records updated, records unchanged, errors) is logged as a structured log entry

**Given** the service is running with `Projections:ReconciliationIntervalMinutes = 60` (configurable via appsettings)
**When** 60 minutes elapse after the last reconciliation
**Then** reconciliation runs automatically for all 16 entities

**Given** reconciliation fails for one entity (e.g., origin service unreachable via Dapr Service Invocation)
**When** the job processes remaining entities
**Then** the error is logged for the failing entity with entity name and error detail, and the job continues and completes reconciliation for all remaining entities without aborting (NFR10)
