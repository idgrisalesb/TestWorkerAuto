# Siesa.MasterPattern

Biblioteca de patrones para gestión de datos maestros en sistemas ERP multi-compañía con soporte para maestros GLOBALES, UNIVERSALES y ESPECÍFICOS POR COMPAÑÍA, incluyendo resolución de sobreescrituras (overrides).

## Descripcion

**Siesa.MasterPattern** proporciona tipos base, interfaces y contratos para implementar maestros GLOBALES y ESPECIFICOS POR COMPANIA con capacidades de resolucion de overrides. Esta disenado para sistemas ERP donde los datos maestros pueden ser compartidos entre multiples companias con personalizaciones especificas por compania.

### Problema que Resuelve

- Manejo de datos maestros compartidos (GLOBALES) entre multiples companias con sobreescrituras especificas
- Gestion de maestros UNIVERSALES compartidos globalmente sin sobreescrituras (ej. Companias, Paises)
- Gestion de maestros ESPECIFICOS POR COMPANIA que pertenecen a una sola compania
- Control de acceso basado en permisos con jerarquias (operaciones CRUD)
- Registro de auditoria para cumplimiento y gobernanza de datos

## Caracteristicas Principales

- **Clasificacion de Maestros**: Soporte para maestros `GLOBAL`, `UNIVERSAL` y `COMPANY_SPECIFIC`
- **Resolucion de Overrides**: Herencia automatica de valores base con sobreescrituras por compania
- **Permisos Jerarquicos**: DELETE > CHANGE_STATUS > UPDATE > READ > CREATE
- **Auditoria Completa**: Registro de cambios con proteccion de datos sensibles
- **Patron Dual de Identificadores**: ID (UUID v7) + Code (identificador de negocio)
- **Soporte Multi-idioma**: Localizacion en ingles y espanol
- **Integracion Dapr**: Comunicacion servicio a servicio y cache distribuido

## Stack Tecnologico

| Categoria | Tecnologia | Version |
|-----------|------------|---------|
| Framework | .NET | 10.0 |
| Base de Datos | PostgreSQL | 18+ |
| ORM | Entity Framework Core | 10.0 |
| Proveedor DB | Npgsql | 10.0.0 |
| Comunicacion | Dapr.Client | 1.16.1 |
| Validacion | FluentValidation | 12.1.0 |
| Logging | Serilog | 9.0.0 |
| Testing | xUnit | 2.9.3 |
| Contenedores | Testcontainers | 4.9.0 |

## Requisitos Previos

- .NET 10 SDK
- PostgreSQL 18+ (requerido para soporte nativo de UUID v7)
- Git
- Acceso a **GitHub Packages** de SiesaTeams (para paquetes internos como `Siesa.BusinessUtilities.LookupFieldQueryBuilder`)

### Configuracion de GitHub Packages (NuGet)

El proyecto consume paquetes NuGet internos desde GitHub Packages. Para restaurar dependencias necesitas un PAT (Personal Access Token) con scope `read:packages` y SSO autorizado para la organizacion SiesaTeams.

```bash
# Agregar el source de GitHub Packages con tu PAT
dotnet nuget add source "https://nuget.pkg.github.com/SiesaTeams/index.json" \
  --name github-siesa \
  --username TU_USUARIO_GITHUB \
  --password TU_PAT_CON_READ_PACKAGES
```

El archivo `nuget.config` ya incluye el source `github-siesa` y el `packageSourceMapping` que rutea los paquetes `Siesa.*` automaticamente a GitHub Packages.

## Instalacion

### Como Paquete NuGet

```bash
dotnet add package Siesa.MasterPattern
```

### Desde el Codigo Fuente

```bash
# Clonar el repositorio
git clone https://github.com/SiesaTeams/Business-Siesa.MasterPattern.git

# Restaurar dependencias (requiere GitHub Packages configurado)
dotnet restore

# Compilar
dotnet build
```

## Estructura del Proyecto

```
business-financiero-master-pattern/
├── src/
│   └── Siesa.MasterPattern/
│       ├── Attributes/          # Atributos personalizados (SensitiveData, PersonalData)
│       ├── Caching/             # Integracion de cache distribuido
│       ├── Clients/             # Clientes de servicios externos
│       ├── Definitions/         # Definiciones de metadatos de maestros
│       ├── Entities/            # Interfaces base de entidades
│       ├── Enums/               # Enumeraciones (MasterType, CRUDOperation)
│       ├── EntityFramework/     # Configuracion EF Core
│       ├── Helpers/             # Utilidades
│       ├── Interfaces/          # Contratos de servicios
│       ├── Localization/        # Recursos multi-idioma
│       ├── Middleware/          # Middleware HTTP
│       ├── Models/              # Modelos de datos
│       ├── Publishers/          # Publicadores de eventos de auditoria
│       └── Services/            # Implementaciones de servicios base
├── tests/
│   ├── unit/                    # Pruebas unitarias (EF InMemory)
│   └── integration/             # Pruebas de integracion (Testcontainers)
├── scripts/
│   └── migrations/              # Scripts de migracion de BD
└── .github/
    └── workflows/               # Pipelines CI/CD
```

## Soporte para Entidades Proyectadas

`Siesa.MasterPattern` incluye una jerarquía separada e independiente de `IMasterEntity` para gestionar **entidades proyectadas** — copias locales de solo lectura sincronizadas vía eventos desde servicios externos.

### IProjectionEntity

```csharp
// Siesa.MasterPattern.Entities.IProjectionEntity
public interface IProjectionEntity
{
    Guid ID { get; }                        // PK del servicio origen — ValueGeneratedNever() en EF Core
    string Code { get; }                    // Identificador de negocio del servicio origen
    bool IsActive { get; set; }             // Estado gestionado por el servicio origen
    DateTimeOffset SourceUpdatedAt { get; } // Timestamp del origen — para detección de eventos out-of-order
    DateTimeOffset LastSyncedAt { get; }    // Timestamp de sincronización local — DEFAULT NOW() en DB
}
```

> **Nota**: `LastSyncedAt` es el nombre correcto de la propiedad en el contrato. Documentos anteriores pueden referirse a ella como `ProjectionSyncedAt` — ese nombre es incorrecto y está desactualizado.

### ConfigureProjectionEntity\<T\>() — EF Core

Extensión en `Siesa.MasterPattern.EntityFramework.AuditFieldsConfiguration`:

```csharp
builder.ConfigureProjectionEntity();
// Configura automáticamente:
// - ValueGeneratedNever() en ID (el ID viene del evento del servicio origen)
// - SourceUpdatedAt como requerido
// - LastSyncedAt con HasDefaultValueSql("NOW()")
// NO configura IsRowVersion() — las proyecciones usan SourceUpdatedAt para ordering
```

### BaseProjectionService\<T\>

Clase base abstracta en `Siesa.MasterPattern.Services` para handlers de sincronización:

```csharp
public class SEGM_CompanyProjectionService : BaseProjectionService<SEGM_CompanyPrj>
{
    public SEGM_CompanyProjectionService(
        ProjectionDefinition definition,
        IDatabaseConnection<SEGM_CompanyPrj, Guid> entityDb,
        ILogger logger) : base(definition, entityDb, logger) { }
}
// Hereda: UpsertAsync (con detección out-of-order), ReconcileAsync, IsOutOfOrder
```

Métodos clave:
- `UpsertAsync(entity, ct)` — INSERT o UPDATE con detección out-of-order via `SourceUpdatedAt`. Si el evento es más antiguo o igual al existente → descarta (idempotente).
- `ReconcileAsync(sourceEntities, snapshotTimestamp, ct)` — reconciliación completa: upsert de todos los registros del snapshot + soft-delete de los que ya no están.
- `IsOutOfOrder(existing, eventTimestamp)` — hook override para personalizar la estrategia de ordering.

### EFCoreProjectionConnection\<T\>

Implementación de `IDatabaseConnection<T, Guid>` para proyecciones, en `Siesa.MasterPattern.EntityFramework`:

```csharp
// Registro en DI (Program.cs o extension method)
services.AddScoped<IDatabaseConnection<SEGM_CompanyPrj, Guid>>(sp =>
    new EFCoreProjectionConnection<SEGM_CompanyPrj>(
        sp.GetRequiredService<MfgStructureDbContext>(),
        sp.GetRequiredService<ILogger<EFCoreProjectionConnection<SEGM_CompanyPrj>>>()));
```

Diferencias clave vs `EFCoreDatabaseConnection<T>`:
- No genera UUID v7 en `CreateAsync` — el ID viene del payload del evento
- No maneja `DbUpdateConcurrencyException` — no hay `IsRowVersion()` en proyecciones

### ProjectionDefinition

```csharp
var definition = new ProjectionDefinition
{
    Name = "CompanyProjection",
    SourceService = "Segment",
    TableName = "segm_companies_prj"  // Debe terminar en _prj — validado por Validate()
};
```

---

## Uso Basico

### Definir una Entidad Maestra

```csharp
public class Currency : IMasterEntity
{
    public Guid ID { get; set; }
    public string Code { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public uint Version { get; set; }

    // Campos adicionales
    public string Name { get; set; } = string.Empty;
    public decimal ExchangeRate { get; set; }
}
```

### Crear un Servicio de Maestro

```csharp
public class CurrencyService : BaseMasterService<Currency>
{
    public CurrencyService(
        IDatabaseConnection<Currency, Guid> connection,
        ISecurityServiceClient securityClient,
        IAuditPublisher auditPublisher)
        : base(connection, securityClient, auditPublisher)
    {
    }
}
```

### Tipos de Maestro

```csharp
public enum MasterType
{
    GLOBAL,              // Compartido entre companias, soporta overrides por compania
    UNIVERSAL,           // Compartido globalmente, sin overrides (ej. Companias, Paises)
    COMPANY_SPECIFIC     // Solo una compania, sin overrides
}
```

### Operaciones CRUD con Permisos

```csharp
public enum CRUDOperation
{
    CREATE,              // Crear nuevo registro
    READ,                // Consultar registros
    UPDATE,              // Actualizar o crear overrides
    CHANGE_STATUS,       // Activar/desactivar
    DELETE,              // Eliminar (soft o hard)
    ASSIGN,              // Asignar maestro GLOBAL a compania
    UPDATE_GLOBAL        // Modificar valores base
}
```

### Resolucion de Overrides

```csharp
// NULL en tabla de Overrides = heredar del maestro base
// Valor no NULL = usar override para esta compania
// Registro ausente en Overrides = maestro NO asignado a la compania

var mergedEntity = await service.MergeWithOverrides(baseEntity, companyId);
```

## Testing

### Ejecutar Todas las Pruebas

```bash
dotnet test
```

### Ejecutar Pruebas Unitarias

```bash
dotnet test tests/unit/Siesa.MasterPattern.Tests/
```

### Ejecutar Pruebas de Integracion

```bash
dotnet test tests/integration/Siesa.MasterPattern.IntegrationTests/
```

### Ejecutar con Cobertura

```bash
dotnet test --collect:"XPlat Code Coverage"
```

### Convencion de Nombres para Tests

```
{Metodo}_With{Condicion}_Should{ResultadoEsperado}
```

## Base de Datos

### Requisitos

- **PostgreSQL 18+** es obligatorio para soporte nativo de UUID v7 via funcion `uuidv7()`

### Patron de Aislamiento de Esquemas

Cada microservicio tiene su propio esquema PostgreSQL:
- `security`: Servicio de seguridad
- `general_segments`: Servicio de segmentos generales
- `accounting`: Servicio de contabilidad
- `inventory`: Servicio de inventario

### Convenciones de Nombres

| Capa | Convencion | Ejemplo |
|------|------------|---------|
| Clases C# | PascalCase (singular) | `Currency` |
| Propiedades C# | PascalCase | `ExchangeRate` |
| Campos privados C# | `_camelCase` | `_httpClient` |
| Tablas PostgreSQL | snake_case (plural) | `currencies` |
| Columnas PostgreSQL | snake_case | `exchange_rate` |
| Claves foraneas | `{Entidad}ID` | `CompanyID` |

### Tablas de Overrides

Para maestros GLOBALES, las tablas de overrides siguen la convencion: `{entidades}_overrides`
- Ejemplo: `currencies_overrides`, `bank_accounts_overrides`

## CI/CD

Los workflows de GitHub Actions se encuentran en `.github/workflows/`:

- **ci.yml**: Se ejecuta en PRs a main/develop - compila y ejecuta pruebas
- **develop.yml**: Workflow para rama develop
- **release.yml**: Workflow de release (publica paquete)

## Decisiones de Arquitectura

| ADR | Descripcion |
|-----|-------------|
| ADR-001 | PostgreSQL 18+ UUID v7 |
| ADR-003 | Patron Dual de Identificadores (ID + Code) |
| ADR-004 | Convenciones de Nombres |
| ADR-007 | Arquitectura de Overrides Basada en Columnas |

## Equipo

**Siesa ERP Team**

## Licencia

Propietario - Siesa

## Enlaces

- [Repositorio](https://github.com/SiesaTeams/Business-Siesa.MasterPattern)
