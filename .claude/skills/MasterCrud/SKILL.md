---
name: siesa-master-crud
description: Guía experta, reglas de uso, API, contratos de backend y detalles críticos del componente MasterCrud de Siesa UI Kit.
version: 1.2.0
triggers:
  - usa el componente MasterCrud
  - implementa MasterCrud
  - crea un MasterCrud
  - configura búsqueda avanzada en MasterCrud
  - lógica multicompañía MasterCrud
---

# MasterCrud

## 🎯 Propósito
`MasterCrud` es el componente orquestador de más alto nivel en Siesa UI Kit. Gestiona el ciclo de vida completo de una entidad (**CRUD**) automatizando el listado (tabla/tarjetas), la búsqueda avanzada y la compleja lógica de sobreescritura multicompañía.

## 📝 API Reference (Props)
Para el detalle completo de tipos, consulta: `.claude/skills/MasterCrud/data/MasterCrud.types.ts`.

| Propiedad | Tipo | Requerido | Default | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `title` | `string` | Sí | - | Título principal del módulo. |
| `entityName` | `string` | Sí | - | Nombre singular de la entidad (ej: "Colaborador"). |
| `fields` | `MasterCrudField[]` | Sí | - | Definición de campos para tabla y formulario. |
| `service` | `CrudService<T>` | Sí | - | Servicio que implementa la persistencia de datos. |
| `navigationType` | `'modal' \| 'sidebar' \| 'page'` | No | `'modal'`* | Tipo de navegación. *En multicompañía es `'page'`. |
| `activeByCompany` | `boolean` | No | `false` | Activa el modo multicompañía. |
| `showAdvancedSearch` | `boolean` | No | `false` | Habilita el panel de búsqueda avanzada. |
| `maxAdvancedFilters` | `number` | No | `4` | Límite de filas en búsqueda avanzada. |
| `showAdvancedSearchConnectors` | `boolean` | No | `false` | Muestra selectores Y/O entre filtros. |
| `filterableFields` | `string[]` | No | `[]` | Lista blanca de accessorKeys para el buscador. |
| `enableMultiSelect` | `boolean` | No | `false` | Habilita selección acumulativa y acciones por lote. |
| `actions` | `MasterCrudAction[]` | No | `[]` | Acciones por registro (se propagan al detalle). |
| `globalActions` | `MasterCrudAction[]` | No | `[]` | Acciones en la Toolbar principal. |
| `batchActions` | `MasterCrudAction[]` | No | `[]` | Acciones que aparecen al seleccionar registros. |

---

## 🏗️ Estructuras de Datos e Interfaces Clave

### 1. MasterCrudField
```typescript
interface MasterCrudField<T> {
  accessorKey: string;     // Soporta punto.notacion
  header: string;          // Etiqueta en español
  type: FieldType;         // text, number, lookup, select, etc.
  config?: {
    required?: boolean | ((data: T) => boolean);
    disabledOnEdit?: boolean;           // Bloquea el campo en edición
    allowMultiCompanyOverride?: boolean; // Vital para sucursales
    checkMatchesOnBlur?: boolean;       // Busca duplicados en Global
    getGlobalValue?: (data: T) => string; // Texto púrpura comparativo
    cardPosition?: 'title' | 'subtitle' | 'body' | 'status' | 'footer';
  }
}
```

### 2. MasterCrudAction
```typescript
interface MasterCrudAction<T> {
  name: string;           // Texto del botón/menú
  icon?: ReactNode;       // Heroicon recomendado (w-4 h-4)
  action?: (record: T | T[]) => void;
  modalContent?: ReactNode | ((record: T) => ReactNode); // Abre modal en vez de ejecutar func
  displayType?: 'direct' | 'menu'; // 'direct' es botón, 'menu' es dropdown
  isGroupAction?: boolean; // Aparece automáticamente en batchActions
  disabled?: boolean | ((record: T) => boolean);
}
```

### 3. CrudService<T> (Contrato de Datos)
```typescript
export interface CrudService<T> {
  getAll: (params: GetAllParams, companyData?: MasterCrudCompany) => Promise<GetAllResponse<T>>;
  getById?: (id: string | number, companyData?: MasterCrudCompany) => Promise<T>;
  create: (data: Partial<T>, companyData?: MasterCrudCompany) => Promise<T>;
  update: (id: string | number, data: Partial<T>, companyData?: MasterCrudCompany) => Promise<T>;
  delete: (id: string | number, companyData?: MasterCrudCompany) => Promise<void>;
}
```


### 3. AdvancedFilter (Búsqueda Avanzada)
Estructura enviada al backend en `params.filters.advancedFilters`:
```typescript
export interface AdvancedFilter {
  id: string;
  field?: string;             // accessorKey del campo
  connector: 'AND' | 'OR';    // Conector con la regla anterior
  value?: any;                // Valor a filtrar
  operator?: string;          // 'contains', 'equals', 'gt', 'lt', 'isEmpty', etc.
}
```

---

## 📡 Contratos de Backend (Networking)

### 1. Respuesta de Listado (GetAllResponse)
El API debe devolver: `{ data: T[], total: number }`. El `total` es vital para la paginación.

### 2. Contrato Multicompañía (CRÍTICO)

#### Respuesta del Backend (GET)
Al consultar un registro desde una sucursal (No Global), el JSON debe incluir:
- `_globalValues`: Objeto con los valores maestros originales de los campos sobreescribibles.
- `_linkedCompanies`: Array de UUIDs de las compañías vinculadas.
```json
{
  "id": 10,
  "precio": 1500,
  "_globalValues": { "precio": 1200 },
  "_linkedCompanies": ["UUID-001", "UUID-002"]
}
```

#### Envío al Backend (POST / PUT)
- **Creación desde Sucursal:** El frontend inyecta `_createInGlobal: true`.
- **Actualización desde Sucursal (Sobreescritura):** El frontend inyecta metadatos de control:
```json
{
  "precio": 1600,
  "_multicompanyMetadata": {
    "isOverride": true,
    "companyUuid": "UUID-001",
    "overriddenFields": ["precio"]
  }
}
```

---

## ⚡ Detalles Críticos de Implementación

1.  **Selección Acumulativa:** Al activar `enableMultiSelect`, los registros seleccionados se mantienen en memoria a través del cambio de páginas.
2.  **MatchModal (Detección de Duplicados):** Si un campo tiene `checkMatchesOnBlur: true`, el componente llama a `onSearchMatches` antes de crear para prevenir duplicados en el contexto Global.
3.  **Vinculación Dinámica:** Si cambias de compañía mientras editas, el componente valida la vinculación (`isCompanyLinked`). Si no existe, ofrece vincular el registro dinámicamente (`onConfirmLinking`).
4.  **AccessorKey:** Soporta `punto.notacion` (ej: `cliente.direccion.ciudad`) tanto para renderizado como para inputs.

## ⚠️ Reglas Críticas para MasterCrud
1. **IDIOMA:** Todo contenido visible (headers, placeholders, títulos) DEBE estar en **Español**.
2. **TIPADO:** Utilizar siempre el genérico `<T>` y referenciar tipos de `.claude/skills/MasterCrud/data/MasterCrud.types.ts`.
3. **DARK MODE:** Usa tokens de Tailwind (`dark:bg-dark-bg-primary`, `dark:border-dark-border-primary`).
