---
date: 2026-03-01
author: Equipo Manufactura
stepsCompleted: []
---

# Product Brief: Proyecciones Dapr — Sincronización de Entidades Proyectadas

---

## 1. Problema / Oportunidad

El servicio **MfgStructure** depende de datos maestros que pertenecen a otros microservicios del ecosistema Siesa (AccessManager, Inventory, Segment, ThirdParty). Para operar con integridad referencial local sin acoplamiento síncrono, la arquitectura define **entidades proyectadas**: tablas locales que replican un subconjunto de datos desde el servicio origen.

Actualmente el servicio **no cuenta** con el mecanismo de recepción de eventos ni con los endpoints que Dapr necesita para entregar esos eventos. Sin este mecanismo:
- Las proyecciones nunca se populan ni actualizan.
- Las FKs hacia tablas proyectadas no tienen datos válidos.
- Cualquier feature que dependa de datos proyectados (WorkCenter, Machine, Method, etc.) no puede funcionar correctamente.

---

## 2. Objetivo

Implementar la infraestructura de **sincronización de entidades proyectadas vía Dapr Pub/Sub** dentro del servicio MfgStructure. Esto incluye:

1. Los **endpoints de suscripción** que Dapr invocará al recibir eventos de servicios externos.
2. El **mecanismo de arranque** que registra las suscripciones a los tópicos correspondientes al iniciar el servicio.
3. Los **handlers de sincronización** que procesan los eventos y actualizan las tablas de proyección locales.
4. El **job de reconciliación por schedule** que garantiza la consistencia de las proyecciones ante eventos perdidos, fallas de red o reinicio del servicio.

---

## 3. Alcance

### En scope

| Componente | Descripción |
|------------|-------------|
| **Subscription endpoints** | Endpoints HTTP POST marcados con `[Topic]` que Dapr invoca al recibir un evento de un tópico suscrito. Un endpoint por tipo de evento relevante. |
| **Startup subscription registration** | Configuración en `Program.cs` + componentes Dapr para que el sidecar conozca los tópicos a los que está suscrito el servicio al arrancar. |
| **Projection sync handlers** | Lógica de upsert/delete sobre las tablas proyectadas locales en respuesta a los eventos recibidos. |
| **Idempotency** | Mecanismo de detección de eventos ya procesados (DAPR-RULE-001: at-least-once delivery). |
| **Multi-tenant isolation** | Validación de `tenantId` en cada evento recibido (DAPR-RULE-002). |
| **Search endpoints (LookupField)** | Endpoints GET de búsqueda sobre cada entidad proyectada, implementados con `Siesa.BusinessUtilities.LookupFieldQueryBuilder`, para que las entidades locales del servicio puedan consultar y seleccionar datos proyectados. |
| **Reconciliación por schedule** | Job programado que sincroniza periódicamente todas las proyecciones consultando los servicios origen vía Dapr Service Invocation, garantizando consistencia ante eventos perdidos o fallas de sincronización. |

### Fuera de scope

| Exclusión | Motivo |
|-----------|--------|
| Interfaz gráfica (UI) | Solo backend, sin pantallas ni componentes frontend. |
| Endpoints CRUD propios de proyecciones | Las proyecciones son de solo lectura; la fuente de verdad es el servicio origen. |
| Publicación de eventos desde MfgStructure | Este feature solo consume eventos, no los produce. |

---

## 4. Entidades Proyectadas Involucradas

Las siguientes entidades proyectadas (definidas en `docs/entidades-proyectadas.md`) deben recibir sincronización vía este mecanismo:

| Servicio Origen | Entidad Origen | Clase C# Proyectada | Tabla Local |
|-----------------|----------------|---------------------|-------------|
| AccessManager | User | `AMGR_UserPrj` | `amgr_users_prj` |
| Inventory | CostSegment | `INVT_CostSegmentPrj` | `invt_cost_segments_prj` |
| Inventory | CostSegmentOverride | `INVT_CostSegmentOverridePrj` | `invt_cost_segments_overrides_prj` |
| Inventory | Storage | `INVT_StoragePrj` | `invt_storages_prj` |
| Inventory | StorageGroup | `INVT_StorageGroupPrj` | `invt_storage_groups_prj` |
| Inventory | StorageGroupOverride | `INVT_StorageGroupOverridePrj` | `invt_storage_groups_overrides_prj` |
| Inventory | StorageOverride | `INVT_StorageOverridePrj` | `invt_storage_overrides_prj` |
| Segment | Company | `SEGM_CompanyPrj` | `segm_companies_prj` |
| Segment | OperationCenter | `SEGM_OperationCenterPrj` | `segm_operation_centers_prj` |
| Segment | OperationCenterOverride | `SEGM_OperationCenterOverridePrj` | `segm_operation_centers_overrides_prj` |
| Segment | UserCompanyAssigments | `SEGM_UserCompanyAssigmentsPrj` | `segm_user_company_assigments_prj` |
| Segment | CostCenter | `SEGM_CostCenterPrj` | `segm_cost_centers_prj` |
| Segment | CostCenterOverride | `SEGM_CostCenterOverridePrj` | `segm_cost_centers_overrides_prj` |
| Segment | CostCenterGroup | `SEGM_CostCenterGroupPrj` | `segm_cost_center_groups_prj` |
| ThirdParty | ThirdParty | `TPRT_ThirdPartyPrj` | `tprt_third_parties_prj` |
| ThirdParty | ThirdPartyOverride | `TPRT_ThirdPartyOverridePrj` | `tprt_third_parties_overrides_prj` |

---

## 5. Enfoque Técnico

### 5.1 Building Block Dapr utilizado

**Pub/Sub** — el sidecar de Dapr enruta eventos publicados por servicios externos hacia los endpoints de suscripción del servicio MfgStructure.

```
Servicio Origen (ej. Segment)
    └── DaprClient.PublishEventAsync("pubsub", "segment.company.created", payload)
            ↓
        GCP Pub/Sub (broker)
            ↓
        Dapr sidecar MfgStructure
            ↓
        POST /events/projections/company-updated  (endpoint local)
            ↓
        Handler → upsert en segm_companies_prj
```

### 5.2 Convención de tópicos (DAPR-RULE-003)

Los tópicos siguen el patrón `{service}.{entity}.{action}` definido en la integración Dapr del proyecto:

| Tópico (ejemplo) | Servicio origen |
|------------------|-----------------|
| `accessmanager.user.created` | AccessManager |
| `accessmanager.user.updated` | AccessManager |
| `accessmanager.user.status_changed` | AccessManager |
| `segment.company.created` | Segment |
| `segment.company.updated` | Segment |
| `inventory.storage.created` | Inventory |
| *(un tópico por entidad × acción)* | … |

> **Nota:** Los nombres exactos de tópicos deben confirmarse con los equipos propietarios de cada servicio origen antes de la implementación.

### 5.3 Mecanismo de arranque (Startup Subscription)

Al iniciar el servicio, `Program.cs` configura el mapeo suscripción ↔ endpoint mediante `app.MapSubscribeHandler()` y los archivos de componentes Dapr (`.yaml`) que declaran el pubsub component. Los endpoints marcados con `[Topic]` se registran automáticamente al arrancar el host de ASP.NET Core con Dapr.

### 5.4 Idempotencia (DAPR-RULE-001)

Cada handler de sincronización debe implementar **upsert** (INSERT OR UPDATE basado en el ID de la entidad origen) para garantizar idempotencia ante entregas duplicadas (at-least-once delivery).

### 5.5 Aislamiento multi-tenant (DAPR-RULE-002)

Cada evento recibido debe incluir `tenantId`. El handler valida que el `tenantId` del evento corresponda al tenant activo antes de actualizar la proyección local.

### 5.6 Search Endpoints (LookupField)

Cada entidad proyectada expondrá un endpoint GET de búsqueda implementado con `Siesa.BusinessUtilities.LookupFieldQueryBuilder` (v0.0.5, exact-pinned). Estos endpoints permiten a las entidades locales del servicio consultar datos proyectados sin acoplamientos sincrónicos externos.

**Patrón del endpoint:**

```csharp
// GET /api/v1/projections/{entity}/search
[HttpGet("search")]
public async Task<IActionResult> Search([FromQuery] LookupFieldQuery query)
{
    var results = await _lookupBuilder
        .ForEntity<SEGM_CompanyPrj>()
        .SearchBy(c => c.Code, c => c.Name)
        .ExcludeInactive()       // cuando la entidad tenga IsActive
        .Build(query);

    return Ok(results);
}
```

**Reglas que aplican (LF-RULE-002 y LF-RULE-003):**

| Regla | Aplicación en proyecciones |
|-------|---------------------------|
| LF-RULE-002 — Filtro por compañía | Aplica a entidades que tienen `CompanyID` directo **o** que poseen una tabla `*Override` asociada con `CompanyID`. Ver columna "Filtro CompanyID" en la tabla siguiente. |
| LF-RULE-003 — Excluir inactivos | Aplica a entidades con campo `IsActive`; las que no lo tienen retornan todos sus registros. |

**Endpoints de búsqueda por entidad proyectada:**

La columna **Filtro CompanyID** indica el mecanismo de filtrado por compañía:
- **No** — la entidad no tiene visibilidad por compañía.
- **Directo** — la entidad tiene `company_id` como columna propia; el filtro aplica directamente sobre ella.
- **Via Override JOIN** — la entidad no tiene `company_id` propio, pero existe una tabla `*Override` asociada (`entity_id + company_id`) que controla la visibilidad por compañía. El Search debe hacer JOIN con esa tabla para retornar solo los registros visibles para la compañía activa.

| Entidad Proyectada | Ruta Search | Filtro IsActive | Filtro CompanyID | Tabla Override |
|--------------------|-------------|-----------------|------------------|----------------|
| `AMGR_UserPrj` | `GET /projections/users/search` | Sí | No | — |
| `INVT_CostSegmentPrj` | `GET /projections/cost-segments/search` | No | Via Override JOIN | `INVT_CostSegmentOverridePrj` |
| `INVT_StoragePrj` | `GET /projections/storages/search` | Sí | Via Override JOIN | `INVT_StorageOverridePrj` |
| `INVT_StorageGroupPrj` | `GET /projections/storage-groups/search` | No | Via Override JOIN | `INVT_StorageGroupOverridePrj` |
| `SEGM_CompanyPrj` | `GET /projections/companies/search` | No | No | — |
| `SEGM_OperationCenterPrj` | `GET /projections/operation-centers/search` | Sí | Via Override JOIN | `SEGM_OperationCenterOverridePrj` |
| `SEGM_UserCompanyAssigmentsPrj` | `GET /projections/user-company-assigments/search` | Sí | Directo | — |
| `SEGM_CostCenterPrj` | `GET /projections/cost-centers/search` | Sí | Via Override JOIN | `SEGM_CostCenterOverridePrj` |
| `SEGM_CostCenterGroupPrj` | `GET /projections/cost-center-groups/search` | Sí | No | — |
| `TPRT_ThirdPartyPrj` | `GET /projections/third-parties/search` | Sí | Via Override JOIN | `TPRT_ThirdPartyOverridePrj` |

> **Nota:** Las tablas `*Override` no requieren endpoint Search propio; su rol es exclusivamente participar en el JOIN de filtrado por compañía del endpoint de su entidad principal.

### 5.7 Reconciliación por Schedule

El job de reconciliación es un **`BackgroundService`** (.NET hosted service) que se ejecuta de forma periódica y compara el estado de cada tabla proyectada local contra los datos actuales del servicio origen, corrigiendo cualquier desviación.

**Propósito:** complementar la sincronización por eventos ante escenarios de pérdida de mensajes, downtime del servicio o population inicial de las tablas.

**Flujo:**

```
BackgroundService (timer configurable)
    │
    ├── Por cada entidad proyectada:
    │       └── Dapr Service Invocation → GET datos actuales del servicio origen
    │                   ↓
    │           Comparar con tabla local (_prj)
    │                   ↓
    │           Upsert / soft-delete de registros divergentes
    │                   ↓
    │           Actualizar ProjectionSyncedAt
    │
    └── Log de resultado por entidad (registros actualizados / sin cambios / errores)
```

**Comportamiento en arranque:** el job se ejecuta una primera vez al iniciar el servicio (`ExecuteAsync` inmediato) para garantizar que las proyecciones estén al día antes de procesar el primer request.

**Configuración:**

| Parámetro | Descripción | Valor por defecto |
|-----------|-------------|-------------------|
| `Projections:ReconciliationIntervalMinutes` | Intervalo entre ejecuciones | `60` minutos |
| `Projections:ReconciliationOnStartup` | Ejecutar al arrancar el servicio | `true` |

**Reutilización de handlers:** el job de reconciliación reutiliza los mismos handlers de sincronización (`IProjectionSyncService`) que los endpoints de eventos Dapr. No existe lógica de upsert duplicada.

---

## 6. Estructura de Capas Impactadas

```
ManufacturingStructure.API/
  └── Controllers/
      └── Projections/
          ├── {Entity}ProjectionEventsController.cs   ← Endpoints [Topic] (Dapr Pub/Sub)
          └── {Entity}ProjectionSearchController.cs   ← Endpoints GET Search (LookupField)

ManufacturingStructure.Application/
  └── Services/
      └── Projections/          ← Handlers de sincronización por entidad
      └── Reconciliation/       ← BackgroundService + orquestación del job
  └── Interfaces/
      ├── IProjectionSyncService.cs
      └── IProjectionSearchService.cs

ManufacturingStructure.Domain/
  └── Events/
      └── Projections/          ← DTOs de eventos entrantes (payload de cada tópico)

ManufacturingStructure.Infrastructure/
  └── Data/Configurations/
      └── Projections/          ← EF Core configs de tablas _prj
```

---

## 7. Criterios de Éxito

- [ ] El servicio, al levantarse, queda suscrito a todos los tópicos definidos sin intervención manual.
- [ ] Cada evento recibido produce un upsert correcto en la tabla de proyección local correspondiente.
- [ ] Los handlers son idempotentes: un mismo evento entregado N veces produce el mismo resultado que entregarlo una vez.
- [ ] El `tenantId` se valida en cada handler; eventos con tenant inválido son rechazados sin error fatal.
- [ ] No se expone ningún endpoint CRUD para las entidades proyectadas.
- [ ] Cada entidad proyectada expone su endpoint Search usando `LookupFieldQueryBuilder`; los filtros `IsActive` y `CompanyID` se aplican según corresponda a cada entidad.
- [ ] Los endpoints Search retornan resultados paginados y filtrables compatibles con el contrato del componente LookupField.
- [ ] El job de reconciliación se ejecuta al arrancar el servicio y luego de forma periódica según el intervalo configurado.
- [ ] La reconciliación reutiliza los handlers de sincronización existentes; no existe lógica de upsert duplicada.
- [ ] Cada ejecución del job registra en log el resultado por entidad (registros actualizados, sin cambios, errores).
- [ ] Cobertura de tests unitarios sobre los handlers de sincronización, servicios de búsqueda y lógica de reconciliación ≥ 80%.

---

## 8. Dependencias

| Dependencia | Tipo | Notas |
|-------------|------|-------|
| Tópicos publicados por servicios origen | Externa | Requiere coordinación con equipos de AccessManager, Inventory, Segment, ThirdParty para confirmar nombres de tópicos y contratos de payload. |
| Tablas de proyección en DB | Interna | Las migraciones EF Core para las tablas `*_prj` deben existir antes de implementar los handlers. |
| Componente pubsub Dapr configurado | Infraestructura | El archivo de componente `pubsub.yaml` del sidecar debe apuntar al broker GCP Pub/Sub correcto. |
| `Siesa.BusinessUtilities.LookupFieldQueryBuilder` | Paquete NuGet | v0.0.5 exact-pinned. Debe estar disponible en el registry interno de Siesa. |
| Dapr Service Invocation hacia servicios origen | Infraestructura | Requerido por el job de reconciliación para consultar el estado actual de cada entidad en el servicio origen. Los contratos de respuesta deben coordinarse con los equipos propietarios. |

---

## 9. Referencias

- Arquitectura global: `_bmad-output/planning-artifacts/global-architecture.md` — Sección 7.3 y 7.4
- Entidades proyectadas: `docs/entidades-proyectadas.md`
- Integración Dapr: `_bmad/siesa-workflows/data/integrations/dapr.yaml`
- Integración LookupField: `_bmad/siesa-workflows/data/integrations/lookup-field.yaml`
