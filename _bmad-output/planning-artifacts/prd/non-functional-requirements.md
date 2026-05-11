## Non-Functional Requirements

### Performance

- List endpoints (Methods, Work Centers) must return the first page of results within
  **500ms** under normal load conditions.
- LookupField Search endpoints must return results within **300ms** to avoid degrading
  the form interaction experience.
- Dapr event handlers must complete processing (upsert to DB) within **2 seconds** per
  event to avoid Dapr timeout and unnecessary retries.

### Security

- All API endpoints require a valid Bearer JWT token issued by AccessManager; requests
  without a valid token return HTTP 401.
- RBAC is enforced server-side on every operation; the backend never trusts
  frontend-reported permissions.
- `tenantId` from Dapr event payloads is validated on every handler; mismatched tenant
  events are rejected with HTTP 400 and logged, without exposing internal error details.
- Sensitive fields (tokens, secrets) are never logged; only entity keys and operation
  results appear in reconciliation logs.

### Reliability

- Projection sync handlers must be idempotent to tolerate Dapr at-least-once delivery
  without data corruption.
- Concurrent modification conflicts on master records are detected via PostgreSQL `xmin`
  optimistic locking; no silent data overwrites are permitted.
- The reconciliation BackgroundService must complete its startup execution before the
  service begins processing the first external request, ensuring projections are current
  at launch.
- If the reconciliation job fails for a specific entity, it must log the error and
  continue processing remaining entities without aborting the full job.

### Integration

- All LookupField Search endpoints must conform to the `Siesa.BusinessUtilities
  .LookupFieldQueryBuilder` v0.0.5 response contract (paginated, filterable results).
- Dapr Pub/Sub topic names follow the platform convention `{service}.{entity}.{action}`;
  exact names must be confirmed with each origin service team before implementation.
- Dapr Service Invocation used by the reconciliation job must handle transient failures
  with retry logic; permanent failures are logged per entity without crashing the job.
- The service must register its Dapr subscriptions via `app.MapSubscribeHandler()` and
  component YAML files; manual sidecar configuration is not acceptable.
