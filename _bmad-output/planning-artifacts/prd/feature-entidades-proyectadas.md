---
stepsCompleted: [1, 2, 3, 8, 9, 10, 11]
inputDocuments:
  - '_bmad-output/shared-docs/proyecciones.md'
workflowType: 'prd'
lastStep: 11
feature: 'Projected Entities Synchronization'
---

# PRD — Feature: Projected Entities Synchronization

**Author:** SiesaTeam
**Date:** 2026-03-04
**Service:** MfgStructure
**Source of truth:** `_bmad-output/shared-docs/proyecciones.md`

---

## Executive Summary

MfgStructure depends on master data owned by four external microservices — AccessManager, Inventory, Segment, and ThirdParty — to enforce local referential integrity without synchronous coupling. The architecture pattern for this is **projected entities**: local read-only tables that mirror a subset of data from each origin service.

Currently, MfgStructure has no mechanism to receive or process events from those services. As a result, projection tables are never populated, FK references point to empty tables, and every feature that depends on projected data (WorkCenter, Machine, Method, etc.) is broken at runtime.

This feature implements the complete **Dapr Pub/Sub synchronization infrastructure** inside MfgStructure: the subscription endpoints, the startup registration, the idempotent sync handlers, the LookupField search endpoints, and the periodic reconciliation job.

### What Makes This Special

This is infrastructure, not a user-facing feature — but it is the **foundation that unblocks all other features**. Without it, the entire domain model collapses. The design choices (Dapr Pub/Sub for event delivery, LookupField for search, and a scheduled reconciliation job for resilience) follow existing conventions in the Siesa ecosystem, making this a zero-new-pattern addition to the codebase.

---

## Project Classification

**Technical Type:** API Backend — ASP.NET Core (.NET) microservice
**Domain:** Manufacturing ERP / Distributed Systems
**Complexity:** Medium-High (multi-entity, multi-service coordination, at-least-once delivery guarantees)
**Project Context:** Brownfield — extending MfgStructure, no UI changes

---

## Success Criteria

### User Success

The primary consumers of this feature are **other MfgStructure features** (WorkCenter, Machine, Method, etc.) and the **services that publish events**. Success from their perspective:

- Any MfgStructure feature that uses a FK to a projected table finds valid data when it queries it.
- Teams integrating with MfgStructure's LookupField endpoints receive paginated, filterable results with correct IsActive and CompanyID filtering — no additional data-fetching calls required.

### Business Success

- All projected entity tables are consistently populated within minutes of a change in the origin service.
- No feature delivery in the MfgStructure roadmap is blocked by missing projected data after this feature ships.
- Support incidents caused by missing FK data drop to zero.

### Technical Success

- Event handlers are idempotent: duplicate delivery of the same event produces identical state.
- `tenantId` is validated on every incoming event; invalid tenant events are rejected without crashing the service.
- The reconciliation job guarantees eventual consistency even after extended downtime or message loss.
- Unit test coverage ≥ 80% on sync handlers, search services, and reconciliation logic.

### Measurable Outcomes

| Outcome | Target |
|---------|--------|
| Projection tables populated at startup | ✅ Before first request is served |
| Event-to-upsert latency | < 5 seconds under normal load |
| Reconciliation interval | Configurable, default 60 min |
| Test coverage | ≥ 80% on sync + search + reconciliation |
| CRUD endpoints on projected entities | 0 (none exposed) |

---

## Product Scope

### MVP — Minimum Viable Product

Deliver the complete synchronization infrastructure for all 16 projected entities in a single release. This is not a feature that can be partially shipped: any missing entity leaves its downstream feature broken.

**MVP includes:**

- Dapr Pub/Sub subscription endpoints (one per event type per entity)
- Startup subscription registration (`Program.cs` + Dapr component YAML)
- Projection sync handlers with upsert/soft-delete and idempotency
- Multi-tenant validation on every handler
- LookupField Search endpoints for all 10 searchable entities with correct IsActive and CompanyID filtering
- Reconciliation BackgroundService (startup run + periodic schedule)
- EF Core configurations for all `*_prj` tables

**Entities covered (16 projected tables across 4 services):**

| Source Service | Entities |
|----------------|----------|
| AccessManager | User |
| Inventory | CostSegment, CostSegmentOverride, Storage, StorageGroup, StorageGroupOverride, StorageOverride |
| Segment | Company, OperationCenter, OperationCenterOverride, UserCompanyAssigments, CostCenter, CostCenterOverride, CostCenterGroup |
| ThirdParty | ThirdParty, ThirdPartyOverride |

### Post-MVP

- Metrics/observability dashboard for reconciliation job execution results.
- Dead-letter queue handling for events that cannot be processed after N retries.
- Alerting when reconciliation detects a high divergence rate between local and origin state.

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approach:** Platform MVP — build the foundation layer that every other feature depends on. There is no partial value; the feature ships complete.

**Resource Requirements:** 1 backend developer. No UI work. No new infrastructure beyond confirming topic names with origin service teams.

### MVP Feature Set (Phase 1)

**Must-Have Capabilities:**

1. Dapr topic subscription per event type (created / updated / status_changed / deleted) for each of the 16 entities.
2. Idempotent upsert handlers (INSERT OR UPDATE by origin entity ID).
3. `tenantId` validation on every event — reject without crash on mismatch.
4. EF Core `*_prj` table configurations aligned to existing migrations.
5. LookupField Search endpoints applying IsActive and CompanyID filters per the entity matrix in `proyecciones.md § 5.6`.
6. `BackgroundService` reconciliation using Dapr Service Invocation to origin services, reusing existing sync handlers.

**Out of Scope (enforced):**

- Any UI or frontend component.
- CRUD endpoints on projected tables.
- Event publication from MfgStructure.

### Risk Mitigation Strategy

**Technical Risk — Topic name contracts:** Topic names must be confirmed with AccessManager, Inventory, Segment, and ThirdParty teams before implementation. Mitigation: schedule contract review as a prerequisite task; implementation is blocked until names are confirmed.

**Technical Risk — EF Core migrations:** Projection tables must exist in the database before handlers run. Mitigation: mark EF Core migrations as a dependency in the epic, deploy migrations first.

**Market Risk:** N/A (internal infrastructure feature).

**Resource Risk:** If `Siesa.BusinessUtilities.LookupFieldQueryBuilder` v0.0.5 is unavailable in the internal NuGet registry, Search endpoints cannot be implemented. Mitigation: verify registry availability before starting implementation.

---

## Functional Requirements

> Full technical detail (topic conventions, LookupField rules, handler patterns, reconciliation config) is in `_bmad-output/shared-docs/proyecciones.md`.

### Dapr Pub/Sub Subscription

- **FR25:** The service automatically registers Dapr Pub/Sub subscriptions for all required projected entity topics at startup, with no manual configuration required.

### Projection Sync Handlers

- **FR26:** The system processes each incoming Dapr event by performing an idempotent upsert (or soft-delete) on the corresponding local projection table.
- **FR27:** The system validates the `tenantId` on every incoming Dapr event and rejects events with an invalid or mismatched tenant without crashing the service.
- **FR28:** Projection sync handlers are idempotent: delivering the same event N times produces the same result as delivering it once.
- **FR34:** The system does not expose CRUD endpoints for projected entities; they are read-only from the perspective of MfgStructure.

### LookupField Search Endpoints

- **FR32:** The system exposes a LookupField-compatible Search endpoint for each projected entity, applying `IsActive` and `CompanyID` filters as specified per entity.
- **FR33:** For projected entities without a direct `company_id` field, the Search endpoint applies CompanyID filtering via a JOIN with the corresponding Override table.
- **FR35:** Projected entity Search endpoints return paginated, filterable results compatible with the LookupField component contract.

### Reconciliation Job

- **FR29:** The system runs a reconciliation BackgroundService at service startup and then periodically at a configurable interval, comparing local projection tables with the source-of-truth from origin services via Dapr Service Invocation.
- **FR30:** The reconciliation job logs the result per projected entity per execution (records updated, records unchanged, errors).
- **FR31:** The reconciliation interval is configurable via application settings (`Projections:ReconciliationIntervalMinutes`).

---

## Non-Functional Requirements

### Reliability

- Dapr at-least-once delivery is assumed; all handlers must be idempotent by design.
- The reconciliation job runs at service startup before the first request is served (`Projections:ReconciliationOnStartup = true`).
- Reconciliation default interval: 60 minutes (configurable).
- A single handler error must not abort the processing of subsequent events or the reconciliation of other entities.

### Security & Multi-tenancy

- Every event handler validates `tenantId` before writing to any projection table.
- Events with invalid or missing `tenantId` are rejected with a logged warning; no unhandled exception is raised.
- Projected data is partitioned by tenant; no cross-tenant data leakage is acceptable.

### Integration

- Dapr Pub/Sub component must use the GCP Pub/Sub broker configured in the environment's `pubsub.yaml`.
- Topic naming follows the convention `{service}.{entity}.{action}` (DAPR-RULE-003); exact names confirmed with origin service teams.
- LookupField Search endpoints use `Siesa.BusinessUtilities.LookupFieldQueryBuilder` v0.0.5 (exact-pinned). No other version is acceptable.
- Reconciliation uses Dapr Service Invocation; HTTP contracts with origin services must be agreed before implementation.

### Testability

- Sync handlers, search services, and reconciliation logic must achieve ≥ 80% unit test coverage.
- Handlers must be testable in isolation without a live Dapr sidecar (use abstractions/mocks).

---

## Dependencies

| Dependency | Type | Owner |
|------------|------|-------|
| Topic name contracts from origin services | External coordination | AccessManager, Inventory, Segment, ThirdParty teams |
| EF Core migrations for `*_prj` tables | Internal prerequisite | MfgStructure team |
| Dapr pubsub component (`pubsub.yaml`) pointing to GCP | Infrastructure | DevOps / Platform |
| `Siesa.BusinessUtilities.LookupFieldQueryBuilder` v0.0.5 | NuGet package | Siesa Platform team |
| Dapr Service Invocation contracts from origin services | External coordination | AccessManager, Inventory, Segment, ThirdParty teams |

---

## References

- Full technical detail: `_bmad-output/shared-docs/proyecciones.md`
- Global architecture: `_bmad-output/planning-artifacts/global-architecture.md` §7.3–7.4
- Projected entity definitions: `docs/entidades-proyectadas.md`
- Dapr integration rules: `_bmad/siesa-workflows/data/integrations/dapr.yaml`
- LookupField integration rules: `_bmad/siesa-workflows/data/integrations/lookup-field.yaml`
