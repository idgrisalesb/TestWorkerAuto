# 📦 MasterCrud: Guía de Uso y Referencia de Ingeniería

El MasterCrud es el componente orquestador más potente del ecosistema Siesa. Proporciona una solución integral para la gestión de entidades de negocio, abstrayendo la complejidad de la paginación, búsqueda avanzada, formularios dinámicos y lógica multicompañía.

---

## 🚀 Instalación y Uso Básico

Para utilizar el componente, debe importarlo junto con sus tipos y el servicio que gestionará los datos.

```ts
1 import { MasterCrud } from '@/components/MasterCrud';
2 import type { MasterCrudField, CrudService } from '@/components/MasterCrud/MasterCrud.types';
3
4 // 1. Definir la interfaz de su entidad
5 interface Producto {
6   id: number;
7   codigo: string;
8   nombre: string;
9   precio: number;
10   activo: boolean;
11 }
12
13 // 2. Implementar el MasterCrud en su vista
14 export const ProductosView = () => {
15   return (
16     <MasterCrud<Producto>
17       title="Catálogo de Productos"
18       entityName="Producto"
19       fields={camposProducto}
20       service={productoService}
21     />
22   );
23 };
```

---

## 🛠️ Propiedades (API Reference)

| Propiedad         | Tipo                  | Requerido | Defecto | Descripción                                                           |
|------------------|----------------------|-----------|---------|------------------------------------------------------------------------|
| title            | string               | Sí        | -       | Título principal de la vista (ej: "Gestión de Usuarios").             |
| entityName       | string               | Sí        | -       | Nombre singular de la entidad (ej: "Usuario").                        |
| fields           | MasterCrudField<T>[] | Sí        | -       | Configuración de las columnas y campos del formulario.                |
| service          | CrudService<T>       | Sí        | -       | Objeto que implementa las operaciones de red (GET, POST, etc.).       |
| idField          | keyof T              | No        | 'id'    | Campo que actúa como identificador único del registro.                |
| pageSize         | number               | No        | 10      | Cantidad de registros por página.                                     |
| navigationType   | `'modal' \ 'sidebar' \ 'page'` | No | - | No                                                                    |
| activeByCompany  | boolean              | No        | false   | Habilita el selector de compañías y lógica de herencia.               |
| companyRequired  | boolean              | No        | false   | Si es true, oculta la opción "Global" y obliga a elegir una compañía. |
| companies        | MasterCrudCompany[]  | No        | []      | Lista de compañías disponibles para el selector.                      |
| showCreateButton | boolean              | No        | true    | Muestra u oculta el botón de "Nuevo".                                 |
| allowDelete      | boolean              | No        | true    | Habilita la acción de eliminar/desactivar.                            |
| formColumns      | `1 \ 2`             | No        | 2       | 2                                                                      |
| enableMultiSelect| boolean              | No        | false   | Habilita checkboxes para selección múltiple de filas.                 |
| showViewToggle   | boolean              | No        | false   | Permite alternar entre vista de Tabla y vista de Tarjetas (Cards).    |
| renderForm       | Function             | No        | -       | Renderizado personalizado del cuerpo del formulario.                  |
| actions          | MasterCrudAction<T>[]| No        | []      | Acciones adicionales para el menú de cada registro.                   |

---

## 📐 Definición de Tipos y Contratos

### 1. MasterCrudField<T>

Define el comportamiento de un campo en todos los estados del componente.

| Atributo      | Tipo                                                      | Requerido | Descripción                                                                       |
|---------------|-----------------------------------------------------------|-----------|-----------------------------------------------------------------------------------|
| `accessorKey` | `keyof T \| string`                                       | Sí        | Clave de acceso al valor del registro.                                            |
| `header`      | `string`                                                  | Sí        | Etiqueta visible en español para la tabla y el formulario.                        |
| `type`        | `FieldType`                                               | Sí        | Define el tipo de control (text, number, date, select, lookup, etc.).             |
| `options`     | `SelectFieldOption[]`                                     | No*       | Obligatorio si `type === 'select'`. Define la lista de opciones estáticas.        |
| `lookupConfig`| `LookupConfig`                                            | No*       | Obligatorio si `type === 'lookup'`. Define el buscador asíncrono.                 |
| `config`      | `FieldConfig`                                             | No        | Metadatos técnicos (validación, visibilidad, permisos multicompañía).             |
| `renderCell`  | `(value: any, record: T) => ReactNode`                    | No        | Función para personalizar el renderizado de la celda en la tabla.                 |
| `renderInput` | `(value: any, onChange: (val: any) => void) => ReactNode` | No        | Función para inyectar un componente personalizado en el formulario.               |

### 2. `FieldType`

Define la naturaleza del dato y el componente visual que se renderizará tanto en la tabla como en el formulario.

**Definición:**

```ts
type FieldType =
  | 'text'      // Input de texto estándar (Default)
  | 'number'    // Input numérico con controles de incremento
  | 'email'     // Input con validación nativa de correo electrónico
  | 'date'      // Selector de fecha (Calendario con formato ISO)
  | 'boolean'   // Switch de activación (True/False)
  | 'select'    // Dropdown de selección única (Requiere 'options')
  | 'lookup';   // Buscador asíncrono (Requiere 'lookupConfig')
```

### 3. `SelectFieldOption`

Estructura para los elementos de un campo de tipo `'select'`.

| Propiedad  | Tipo                  | Requerido | Descripción                                    |
|------------|-----------------------|-----------|------------------------------------------------|
| `value`    | `string \| number`    | Sí        | Valor interno que se almacena al seleccionar.  |
| `label`    | `string`              | Sí        | Texto legible que verá el usuario.             |
| `icon`     | `ReactNode`           | No        | Icono descriptivo al lado de la etiqueta.      |
| `disabled` | `boolean`             | No        | Deshabilita la opción específica en el menú.   |

### 4. `LookupConfig`

Configuración necesaria para que un campo de tipo `'lookup'` realice búsquedas dinámicas en el servidor.

| Propiedad       | Tipo       | Requerido | Descripción                                                                 |
|-----------------|------------|-----------|-----------------------------------------------------------------------------|
| `entity`        | `string`   | Sí        | Nombre de la entidad a buscar (ej: `"Municipios"`).                         |
| `displayFields` | `string[]` | Sí        | Atributos del objeto que se mostrarán en los resultados.                    |
| `fetcher`       | `Fetcher`  | Sí        | Función asíncrona que realiza la petición de búsqueda.                      |
| `valueField`    | `string`   | No        | Atributo que actúa como ID (Default: `'id'`).                               |
| `renderItem`    | `Function` | No        | Función para personalizar el renderizado de cada resultado.                 |

### 5. FieldConfig
Configuración granular del campo.

- required: boolean | ((data: T) => boolean). Define si es obligatorio.
- disabled: boolean | ((data: T) => boolean). Define si está inhabilitado.
- showInList: boolean. Visibilidad en la tabla (Default: true).
- searchable: boolean. Si participa en la búsqueda global.
- allowMultiCompanyOverride: boolean. Si el campo puede ser editado en una sucursal (herencia).

### 6. `CrudService<T>`

Es el contrato obligatorio que debe implementar la clase o función encargada de la persistencia. El componente inyecta automáticamente el contexto de compañía en cada llamada.

| Método    | Argumentos                                                          | Retorno                | Descripción                           |
|-----------|---------------------------------------------------------------------|------------------------|---------------------------------------|
| `getAll`  | `(params: GetAllParams, company?: MasterCrudCompany)`               | `Promise<GetAllResponse<T>>` | Obtiene la lista paginada y filtrada. |
| `getById` | `(id: string \| number, company?: MasterCrudCompany)`               | `Promise<T>`           | Obtiene un registro por su ID.        |
| `create`  | `(data: Partial<T>, company?: MasterCrudCompany)`                   | `Promise<T>`           | Crea un nuevo registro en el sistema. |
| `update`  | `(id: string \| number, data: Partial<T>, company?: MasterCrudCompany)` | `Promise<T>`       | Actualiza un registro existente.      |
| `delete`  | `(id: string \| number, company?: MasterCrudCompany)`               | `Promise<void>`        | Elimina un registro del sistema.      |

### 7. `MasterCrudCompany`

Estructura utilizada para gestionar el contexto multicompañía dentro del orquestador.

| Propiedad             | Tipo                  | Requerido | Descripción                                        |
|-----------------------|-----------------------|-----------|----------------------------------------------------|
| `uuid`                | `string \| number`    | Sí        | Identificador único de la compañía.                |
| `code`                | `string \| number`    | Sí        | Código interno de la compañía.                     |
| `name`                | `string`              | Sí        | Nombre comercial o razón social.                   |
| `isSelectedByDefault` | `boolean`             | No        | Si es `true`, se auto-selecciona al cargar la vista. |

### 8. MasterCrudAction<T>
Para inyectar botones o lógica personalizada.

| Propiedad       | Tipo                                                              | Requerido | Descripción                                                                                              |
|-----------------|-------------------------------------------------------------------|-----------|----------------------------------------------------------------------------------------------------------|
| `id`            | `string`                                                          | Sí        | Identificador único de la acción (usado para keys y tracking).                                           |
| `name`          | `string \| ((record: T) => string)`                               | Sí        | Nombre visible de la acción.                                                                             |
| `icon`          | `ReactNode \| ((record: T) => ReactNode)`                         | No        | Icono representativo de la acción.                                                                       |
| `action`        | `(record: T \| T[], company?: MasterCrudCompany) => void \| Promise<void>` | Sí | Función que se ejecuta al activar la acción.                                                    |
| `modalContent`  | `ReactNode \| ((record: T) => ReactNode)`                         | No        | Contenido a renderizar dentro de un modal al activar la acción.                                          |
| `isGroupAction` | `boolean`                                                         | No        | Si es `true`, la acción aparecerá en el menú de acciones masivas cuando hay selección múltiple.          |
| `order`         | `number`                                                          | No        | Determina la posición de la acción en el menú (menor número aparece primero).                            |
| `disabled`      | `boolean \| ((record: T) => boolean)`                             | No        | Deshabilita la acción de forma estática o dinámicamente según el registro.                               |
| `className`     | `string`                                                          | No        | Clases de Tailwind adicionales para personalizar el estilo del ítem del menú.                            |

---

## 📡 Operaciones CRUD y Contratos de Red

El componente espera un objeto que cumpla con la interfaz CrudService<T>. A continuación, un ejemplo de implementación utilizando una API estándar:

```ts
1 const productoService: CrudService<Producto> = {
2   // Obtener listado con filtros y paginación
3   getAll: async (params, company) => {
4     const query = new URLSearchParams({
5       page: params.page.toString(),
6       limit: params.limit.toString(),
7       search: params.search || '',
8       companyUuid: company?.uuid || '000'
9     });
10     const res = await fetch(`/api/productos?${query}`);
11     return res.json(); // Debe retornar { data: T[], total: number }
12   },
13
14   // Obtener detalle completo (Opcional, usado en navigationType="page")
15   getById: async (id, company) => {
16     const res = await fetch(`/api/productos/${id}?companyUuid=${company?.uuid}`);
17     return res.json();
18   },
19
20   // Crear nuevo
21   create: async (data, company) => {
22     const res = await fetch('/api/productos', {
23       method: 'POST',
24       body: JSON.stringify({ ...data, companyUuid: company?.uuid })
25     });
26     return res.json();
27   },
28
29   // Actualizar
30   update: async (id, data, company) => {
31     const res = await fetch(`/api/productos/${id}`, {
32       method: 'PUT',
33       body: JSON.stringify({ ...data, companyUuid: company?.uuid })
34     });
35     return res.json();
36   },
37
38   // Eliminar o Desactivar
39   delete: async (id, company) => {
40     await fetch(`/api/productos/${id}?companyUuid=${company?.uuid}`, {
41       method: 'DELETE'
42     });
43   }
44 };
```

---

## 🎨 Estándares de Diseño

- Modo Oscuro: Soportado nativamente mediante clases dark:. No requiere configuración adicional.
- Accesibilidad: Todos los controles soportan navegación por teclado (Focus visible) y etiquetas ARIA.
- Traducciones: El componente detecta el locale y ajusta todos los textos internos (Guardar, Cancelar, Eliminar) al español o inglés según se configure.

## 💡 Ejemplos de Implementación

### A. MasterCrud por Compañía

```tsx
1 <MasterCrud
2   activeByCompany={true}
3   companyRequired={true} // Oculta "Global" y activa edición directa
4   companies={[
5     { uuid: '101', code: '001', name: 'Siesa Cali' },
6     { uuid: '102', code: '002', name: 'Siesa Bogotá' }
7   ]}
8   service={centroCostoService}
9   fields={camposCC}
10 />
```

### B. Renderizado de Formulario Personalizado (renderForm)

Permite crear layouts complejos (Grids, Tabs, Grupos) manteniendo la validación automática.

```tsx
1 <MasterCrud
2   renderForm={({ renderField }) => (
3     <div className="space-y-6">
4       <section className="grid grid-cols-2 gap-4 border p-4 rounded-xl">
5         <h4 className="col-span-2 font-bold">Información General</h4>
6         {renderField('codigo', (val, onChange) => <Input value={val} onChange={onChange} />)}
7         {renderField('nombre', (val, onChange) => <Input value={val} onChange={onChange} />)}
8       </section>
9     </div>
10   )}
11 />
```

### C. Navegación a Página de Detalle

Para formularios muy extensos, se recomienda usar el modo page.

```tsx
1 <MasterCrud
2   navigationType="page" // La edición/creación ocupa toda la pantalla
3   fetchDetailOnEdit={true} // El componente llamará a getById automáticamente
4   headerBadges={(record) => [
5     { label: record?.activo ? 'Activo' : 'Inactivo', color: record?.activo ? 'green' : 'red' }
6   ]}
7 />
```

---