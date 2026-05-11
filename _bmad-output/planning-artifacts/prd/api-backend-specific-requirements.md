## API Backend Specific Requirements

> Step 6 (Innovation Discovery): Skipped — no disruptive innovation signals detected.
> Project is a high-quality execution of established ERP and microservices patterns.

### Project-Type Overview

MfgStructure is an **API backend microservice** exposing RESTful JSON endpoints for
manufacturing configuration masters and event-driven projection synchronization. It
follows the Siesa platform conventions: versioned routes (`/api/v1/`), RBAC via
AccessManager tokens, and LookupField-compatible search contracts.

### Endpoint Specifications

#### Methods Master

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/methods` | Paginated list with filters (code, name, useCode, isActive) |
| GET | `/api/v1/methods/{id}` | Single record (global or company-resolved view) |
| POST | `/api/v1/methods` | Create new global method |
| PUT | `/api/v1/methods/{id}` | Update global fields (requires `update_global`) |
| DELETE | `/api/v1/methods/{id}` | Delete (blocked if dependencies exist or IsImmutable) |
| POST | `/api/v1/methods/{id}/assign` | Assign method to one or more companies |
| PUT | `/api/v1/methods/{id}/companies/{companyId}` | Update company override |
| GET | `/api/v1/methods/search` | LookupField search (consumed by Routes, BOM, Cost Groups) |

#### Work Centers Master

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/work-centers` | Paginated list with filters |
| GET | `/api/v1/work-centers/{id}` | Single record (global or company-resolved view) |
| POST | `/api/v1/work-centers` | Create new global work center |
| PUT | `/api/v1/work-centers/{id}` | Update global fields (requires `update_global`) |
| DELETE | `/api/v1/work-centers/{id}` | Delete (blocked if dependencies exist) |
| POST | `/api/v1/work-centers/{id}/assign` | Assign to companies |
| PUT | `/api/v1/work-centers/{id}/companies/{companyId}` | Update company override |
| GET | `/api/v1/work-centers/search` | LookupField search (consumed by Routes) |

#### Projected Entities

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/events/projections/user-updated` | Dapr [Topic] — sync AMGR_UserPrj |
| POST | `/events/projections/company-updated` | Dapr [Topic] — sync SEGM_CompanyPrj |
| POST | `/events/projections/cost-center-updated` | Dapr [Topic] — sync SEGM_CostCenterPrj |
| POST | `/events/projections/storage-updated` | Dapr [Topic] — sync INVT_StoragePrj |
| POST | `/events/projections/third-party-updated` | Dapr [Topic] — sync TPRT_ThirdPartyPrj |
| *(one endpoint per entity × action)* | | |
| GET | `/api/v1/projections/users/search` | LookupField search — AMGR_UserPrj |
| GET | `/api/v1/projections/companies/search` | LookupField search — SEGM_CompanyPrj |
| GET | `/api/v1/projections/cost-centers/search` | LookupField search — SEGM_CostCenterPrj |
| GET | `/api/v1/projections/storages/search` | LookupField search — INVT_StoragePrj |
| GET | `/api/v1/projections/third-parties/search` | LookupField search — TPRT_ThirdPartyPrj |
| *(one search endpoint per projected entity)* | | |

### Authentication & Authorization Model

- **Token type:** Bearer JWT issued by AccessManager
- **RBAC enforcement:** Server-side on every operation; frontend mirrors visibility only
- **Permission namespace:** `manufacturing.{resource}.{action}`
- **Multi-tenant isolation:** `companyId` resolved from session context; events validated
  via `tenantId` field in Dapr event payload

### Data Schemas

- **Request/Response format:** JSON
- **ID type:** UUID v7 (`Guid.CreateVersion7()`) for all primary keys
- **Timestamps:** `DateTimeOffset` (ISO 8601 with timezone)
- **Enumerations:** transmitted as `smallint` codes with documented value mappings
- **Override resolution:** NULL field value = inherit from global base; NOT NULL = use
  company-specific override

### API Versioning

- **Strategy:** URL path prefix — `/api/v1/`
- **Breaking changes:** new major version prefix; old version maintained for one release

### Error Codes

| Scenario | HTTP Status | Message Pattern |
|----------|-------------|-----------------|
| Validation failure | 400 | Field-level errors array |
| Unauthorized | 401 | Standard bearer token error |
| Forbidden (RBAC) | 403 | `"No tiene acceso a {operation}"` |
| Not found | 404 | Resource not found |
| Dependency conflict (delete) | 409 | `"El {entity} existe en {dependency}. No se puede eliminar"` |
| Concurrency conflict (xmin) | 409 | `"El {entity} ha sido modificado por otro usuario"` |
| Immutable record | 422 | `"Los {entities} con código {code} no se pueden {operation}"` |
