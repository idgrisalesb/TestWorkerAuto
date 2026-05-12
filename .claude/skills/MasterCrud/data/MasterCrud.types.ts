import type { ReactNode } from 'react';
import type { Fetcher } from '../LookupField';
import type { MatchResult } from '../MatchModal';

export type { MatchResult };

// ============================================
// TIPOS DE CAMPO
// ============================================

/**
 * Tipos de campo soportados por MasterCrud
 * Define cómo se renderiza cada campo en el formulario:
 * - 'text': Input de texto estándar
 * - 'number': Input numérico con controles de incremento
 * - 'email': Input con validación de formato de correo
 * - 'date': Selector de fecha (Calendario)
 * - 'boolean': Switch o Checkbox de activación
 * - 'select': Dropdown con opciones estáticas (requiere 'options')
 * - 'lookup': LookupField para búsquedas asíncronas (requiere 'lookupConfig')
 */
export type FieldType =
  | 'text'      // Input de texto
  | 'number'    // Input numérico
  | 'email'     // Input de email
  | 'date'      // Input de fecha
  | 'boolean'   // Switch o Checkbox
  | 'select'    // Dropdown con opciones estáticas
  | 'lookup';   // LookupField para búsquedas en servidor

// ============================================
// TIPOS DE NAVEGACIÓN Y VISTA
// ============================================

/**
 * Tipos de navegación para formularios de creación/edición
 */
export type MasterCrudNavigationType = 'modal' | 'sidebar' | 'page';

/**
 * Estado de la vista actual del MasterCrud
 */
export type ViewState = 'LIST' | 'CREATE' | 'EDIT';

// ============================================
// CONFIGURACIÓN DE CAMPOS
// ============================================

/**
 * Tipo para propiedades que pueden ser estáticas (boolean) o dinámicas (función)
 */
export type DynamicProp<T = any> = boolean | ((formData: T) => boolean);

/**
 * Opción para campos de tipo 'select'
 */
export interface SelectFieldOption {
  /** 
   * Valor real del campo 
   * @example 'ACT', 1, 'sur'
   */
  value: string | number;
  /** Etiqueta visible para el usuario */
  label: string;
  /** Icono opcional al lado de la etiqueta */
  icon?: ReactNode;
  /** Si la opción está deshabilitada */
  disabled?: boolean;
}

/**
 * Configuración extendida para cada campo
 */
export interface FieldConfig<T = any> {
  /** 
   * Si el campo es obligatorio.
   * Puede ser estático (true/false) o dinámico basado en el estado del formulario.
   */
  required?: DynamicProp<T>;

  /** 
   * Si el campo está deshabilitado (solo lectura).
   * Puede ser estático (true/false) o dinámico basado en el estado del formulario.
   */
  disabled?: DynamicProp<T>;

  /**
   * Si el campo debe deshabilitarse en modo edición.
   * @default false
   */
  disabledOnEdit?: boolean;

  /**
   * Longitud máxima de caracteres permitida
   */
  maxLength?: number;

  /**
   * Longitud mínima de caracteres requerida
   */
  minLength?: number;

  // ===== VISIBILIDAD (Legacy) =====
  /** 
   * @deprecated Use `showInList` en su lugar
   * Si se muestra en la tabla/grilla 
   */
  visibleInTable?: boolean;
  /** 
   * @deprecated Use `showInCreate` y `showInEdit` en su lugar
   * Si se muestra en el formulario 
   */
  visibleInForm?: boolean;

  // ===== VISIBILIDAD (Granular) =====
  /** 
   * Visible en la vista de tabla (List View)
   * @default true 
   */
  showInList?: boolean;

  /** 
   * Visible en la vista de tarjetas (Grid View)
   * @default true 
   */
  showInGrid?: boolean;

  /** 
   * Visible en el formulario de creación
   * @default true 
   */
  showInCreate?: boolean;

  /** 
   * Visible en el formulario de edición
   * @default true 
   */
  showInEdit?: boolean;

  /** Si se puede buscar por este campo */
  searchable?: boolean;
  /** Si se puede ordenar por este campo */
  sortable?: boolean;
  /** Ancho de la columna en la tabla (CSS width) */
  columnWidth?: string;
  /** Alineación del contenido en la tabla */
  align?: 'left' | 'center' | 'right';
  /** Placeholder para el input */
  placeholder?: string;
  /** Texto de ayuda debajo del input */
  helperText?: string;
  /** Mensaje de error de validación */
  errorMessage?: string;
  /** Función de validación personalizada */
  validate?: (value: any, formData: Record<string, any>) => string | undefined;
  /** Valor mínimo (para number) */
  min?: number;
  /** Valor máximo (para number) */
  max?: number;
  /** Paso (para number) */
  step?: number;
  /** Formato de fecha (para date) */
  dateFormat?: string;
  /** Posición en la tarjeta (Grid View) */
  cardPosition?: 'title' | 'subtitle' | 'body' | 'footer' | 'status';

  /** 
   * Texto a mostrar cuando el valor es true (para campos boolean) 
   * @default 'Activo'
   */
  trueLabel?: string;

  /** 
   * Texto a mostrar cuando el valor es false (para campos boolean) 
   * @default 'Inactivo'
   */
  falseLabel?: string;

  /**
   * Cuántas columnas del grid debe ocupar este campo en el formulario.
   * Útil para diseños complejos (ej: ocupar todo el ancho en un grid de 2 columnas).
   * @example 2
   */
  colSpan?: number;

  /**
   * Permite la sobreescritura multicompañía para este campo.
   * Solo funciona si activeByCompany es true.
   */
  allowMultiCompanyOverride?: boolean;

  /**
   * Función para obtener el valor global de este campo.
   * Se usa para mostrar el texto "Global: [valor]" debajo del campo.
   */
  getGlobalValue?: (data: any) => string;

  /**
   * Si el valor de este campo debe aparecer en el título del modal de vinculación.
   */
  showInLinkModalTitle?: boolean;

  /**
   * Si el campo debe buscar coincidencias al disparar el evento OnBlur.
   * Solo aplica en modo creación y si activeByCompany es true bajo contexto Global.
   */
  checkMatchesOnBlur?: boolean;

  // ===== CALLBACKS =====
  /**
   * Callback ejecutado cuando el campo pierde el foco (blur).
   * Útil para validaciones, cálculos o efectos secundarios.
   */
  onBlur?: (value: any, name: string, formData: Record<string, any>) => void;

  /**
   * Callback ejecutado cuando el campo se monta en el formulario.
   * Útil para inicialización dinámica o carga de datos.
   * @param setValue Función para actualizar el valor de este campo
   * @param formData Datos actuales del formulario
   */
  onMount?: (setValue: (value: any) => void, formData: Record<string, any>) => void;
}

/**
 * Configuración específica para campos de tipo 'lookup'
 */
export interface LookupConfig {
  /** Nombre del recurso o entidad a buscar en el servidor */
  entity: string;
  /** Campos que se mostrarán en la lista de resultados del dropdown de búsqueda */
  displayFields: string[];
  /** Función asíncrona que realiza la petición HTTP */
  fetcher: Fetcher;
  /** Campo que actúa como valor único e identificador (default: 'id') */
  valueField?: string;
}

/**
 * Definición de un campo del MasterCrud
 * Controla tanto la tabla como el formulario
 */
export interface MasterCrudField<T = any> {
  /**
   * Key del objeto JSON que contiene el valor
   * @example 'nombre', 'cliente.direccion'
   */
  accessorKey: keyof T | string;

  /**
   * Etiqueta visible en español
   * Se usa tanto en el header de la tabla como en el label del formulario
   */
  header: string;

  /**
   * Tipo de componente a renderizar
   */
  type: FieldType;

  /**
   * Configuración adicional del campo
   */
  config?: FieldConfig;

  /**
   * Opciones para campos de tipo 'select'
   */
  options?: SelectFieldOption[];

  /**
   * Configuración para campos de tipo 'lookup'
   */
  lookupConfig?: LookupConfig;

  /**
   * Función de render personalizada para la tabla
   * Si se provee, sobrescribe el render automático
   */
  renderCell?: (value: any, row: T, index: number) => ReactNode;

  /**
   * Función de render personalizada para el formulario
   * Si se provee, sobrescribe el render automático
   */
  renderInput?: (
    value: any,
    onChange: (value: any) => void,
    field: MasterCrudField<T>,
    formData: Record<string, any>
  ) => ReactNode;
}

// ============================================
// TIPOS DE COMPAÑÍA
// ============================================

/**
 * Definición de una compañía para MasterCrud
 */
export interface MasterCrudCompany {
  /** Identificador único interno de la compañía (UUID o ID de base de datos) */
  uuid: string | number;
  /** Código visible de la compañía para visualización */
  code: string | number;
  /** Nombre de la compañía */
  name: string;
  /** Si está seleccionada por defecto */
  isSelectedByDefault?: boolean;
  /** Datos adicionales */
  [key: string]: any;
}

// ============================================
// CONTRATO DEL SERVICIO
// ============================================

/**
 * Parámetros para la consulta de listado
 */
export interface GetAllParams {
  /** Número de página (1-indexed) */
  page: number;
  /** Cantidad de registros por página */
  limit: number;
  /** Término de búsqueda global */
  search?: string;
  /** Campo específico donde buscar (si no se define, es global) */
  searchField?: string;
  /** Campo por el cual ordenar */
  sortBy?: string;
  /** Dirección del ordenamiento */
  sortDirection?: 'asc' | 'desc';
  /** Filtros adicionales */
  filters?: Record<string, any>;
}

/**
 * Respuesta del servicio de listado
 */
export interface GetAllResponse<T> {
  /** Array de datos */
  data: T[];
  /** Total de registros (para paginación) */
  total: number;
}

/**
 * Contrato que debe implementar el servicio de datos
 * Permite al MasterCrud interactuar con cualquier backend
 */
export interface CrudService<T> {
  /**
   * Obtener listado paginado de registros
   */
  getAll: (params: GetAllParams, companyData?: any) => Promise<GetAllResponse<T>>;

  /**
   * Obtener un registro por su ID
   */
  getById?: (id: string | number, companyData?: any) => Promise<T>;

  /**
   * Crear un nuevo registro
   */
  create: (data: Partial<T>, companyData?: any) => Promise<T>;

  /**
   * Actualizar un registro existente
   */
  update: (id: string | number, data: Partial<T>, companyData?: any) => Promise<T>;

  /**
   * Eliminar un registro
   */
  delete: (id: string | number, companyData?: any) => Promise<void>;
}

// ============================================
// PERMISOS
// ============================================

/**
 * Definición de permisos para operaciones CRUD
 */
export interface CrudPermissions {
  /** Permite leer el listado y el detalle de registros */
  canRead?: boolean;
  /** Permite crear nuevos registros */
  canCreate?: boolean;
  /** Permite editar registros existentes */
  canUpdate?: boolean;
  /** Permite eliminar registros */
  canDelete?: boolean;
  /** Permite realizar sobreescrituras en modo multicompañía */
  canOverrideMultiCompany?: boolean;
}

// ============================================
// ACCIONES PERSONALIZADAS
// ============================================

/**
 * Definición de una acción personalizada para un registro
 */
export interface MasterCrudAction<T = any> {
  /**
   * Identificador único de la acción (opcional, usado para identificar acciones por defecto como 'edit' o 'delete')
   */
  id?: string;

  /**
   * Nombre de la acción (se muestra en el menú).
   * Puede ser un string estático o una función que dependa del registro.
   */
  name: string | ((record: T) => string);

  /**
   * Función callback que se ejecuta al seleccionar la acción.
   * Para acciones grupales, recibe el array de registros seleccionados.
   */
  action?: (record: T | T[], companyData?: any) => void;

  /**
   * Contenido a renderizar en un modal al seleccionar la acción.
   * Si se define, `action` es opcional (o se ejecuta antes de abrir el modal).
   * El componente recibirá el registro completo como prop `data`.
   */
  modalContent?: ReactNode | ((record: T) => ReactNode);

  /**
   * Icono opcional para el menú.
   * Puede ser un ReactNode estático o una función que dependa del registro.
   */
  icon?: ReactNode | ((record: T) => ReactNode);

  /**
   * Orden de aparición en el menú (menor número = más arriba)
   * @default 0
   */
  order?: number;

  /**
   * Si la acción está deshabilitada
   */
  disabled?: boolean | ((record: T) => boolean);

  /**
   * Define dónde se muestra la acción en el listado/toolbar
   * - 'direct': Botón visible directamente
   * - 'menu': Dentro del menú desplegable de acciones
   * @default 'menu'
   */
  displayType?: 'direct' | 'menu';

  /**
   * Indica si la acción es aplicable a una selección múltiple de registros.
   * Si es true, aparecerá en el menú de acciones grupales del toolbar.
   */
  isGroupAction?: boolean;
}

// ============================================
// CONFIGURACIONES ADICIONALES
// ============================================

/**
 * Configuración del estado vacío (cuando no hay registros)
 */
export interface MasterCrudEmptyStateConfig {
  /** Imagen alusiva (URL o componente) */
  image?: ReactNode | string;
  /** Título del mensaje */
  title?: string;
  /** Descripción o instrucciones */
  description?: string;
}

/**
 * Estructura de un filtro de búsqueda avanzada.
 * Soporta anidación mediante grupos para composiciones lógicas complejas.
 */
export type AdvancedFilterConnector = 'AND' | 'OR';

export interface AdvancedFilter {
  id: string;
  /** Campo sobre el cual aplicar el filtro */
  field?: string;
  /** Conector lógico para unir este filtro con el anterior o para sus hijos */
  connector: AdvancedFilterConnector;
  /** Valor a buscar */
  value?: any;
  /** Operador de comparación (ej: equals, contains, gt, lt) */
  operator?: string;
  /** Sub-filtros para formar un grupo lógico */
  children?: AdvancedFilter[];
  /** Indica si es un grupo de filtros */
  isGroup?: boolean;
}

// ============================================
// PROPS DEL COMPONENTE PRINCIPAL
// ============================================

/**
 * Props del componente MasterCrud
 */
export interface MasterCrudProps<T = any> {
  /**
   * Título del módulo (se muestra en el header)
   * @example "Gestión de Clientes"
   */
  title: string;

  /**
   * Nombre de la entidad en singular (para mensajes)
   * @example "Cliente"
   */
  entityName: string;

  /**
   * Código del Feature para cargar entidades dinámicas (EAV)
   */
  dynamicFeatureCode?: string;

  /**
   * Tipo de navegación para las acciones de creación/edición.
   * Si activeByCompany es true, el valor por defecto es 'page'.
   * Si activeByCompany es false, el valor por defecto es 'modal'.
   */
  navigationType?: MasterCrudNavigationType;

  /**
   * Habilitar selección múltiple de registros
   * @default false
   */
  enableMultiSelect?: boolean;

  /**
   * Configuración personalizada para cuando no hay registros
   */
  emptyStateConfig?: MasterCrudEmptyStateConfig;

  /**
   * Acciones globales que aparecen en el Toolbar (antes del botón Nuevo)
   */
  globalActions?: MasterCrudAction<T>[];

  /**
   * Acciones grupales que aparecen cuando hay registros seleccionados
   */
  batchActions?: MasterCrudAction<T>[];

  /**
   * Idioma para la localización de textos y formatos.
   * Sigue el estándar ISO 639-1.
   * @default 'es'
   * @example 'en', 'fr'
   */
  locale?: string;

  /**
   * Prefijo para buscar llaves de traducción de la interfaz (botones, buscador).
   * @default 'mastercrud'
   */
  uiPrefix?: string;

  /**
   * Prefijo para buscar llaves de traducción de los campos (entidad).
   * Útil cuando el JSON de traducciones es agnóstico al componente.
   * @example 'colaboradores' -> buscará 'colaboradores.nombre'
   */
  fieldsPrefix?: string;

  /**
   * Diccionario de traducciones externas para sobreescribir las internas.
   */
  externalTranslations?: Record<string, string>;

  /**
   * Función de traducción personalizada. 
   * Permite que el componente sea agnóstico a librerías externas.
   */
  t?: (key: string, defaultValue?: string) => string;

  /**
   * Definición de los campos de la entidad
   */
  fields: MasterCrudField<T>[];

  /**
   * Lista de accessorKeys de los campos que se pueden usar para filtrar/buscar.
   * Si no se provee, se usan todos los campos visibles.
   */
  filterableFields?: string[];

  /**
   * Habilitar scroll infinito en la vista de tarjetas (Grid)
   * Si es true, la vista de grid usará scroll infinito en lugar de paginación
   * @default true
   */
  enableGridInfiniteScroll?: boolean;

  /**
   * Servicio que implementa las operaciones CRUD
   */
  service: CrudService<T>;

  /**
   * Campo que contiene el ID único de cada registro
   * @default 'id'
   */
  idField?: keyof T | string;

  /**
   * Registros por página
   * @default 10
   */
  pageSize?: number;

  /**
   * Si se muestra el botón de crear
   * @default true
   */
  showCreateButton?: boolean;

  /**
   * Si se muestra el campo de búsqueda
   * @default true
   */
  showSearch?: boolean;

  /**
   * Si se muestran acciones de edición/eliminar por fila
   * @default true
   */
  showRowActions?: boolean;

  /**
   * Si se permite eliminar registros
   * @default true
   */
  allowDelete?: boolean;

  /**
   * Configuración de permisos granulada.
   * Si se define, tiene precedencia sobre `showCreateButton`, `showRowActions` y `allowDelete`.
   */
  permissions?: CrudPermissions;

  // ===== CALLBACKS PRE-ACCIÓN =====
  /**
   * Callback ejecutado antes de crear un registro.
   * Si retorna false (o promesa false), cancela la operación.
   */
  onBeforeCreate?: (data: Partial<T>) => Promise<boolean> | boolean;

  /**
   * Callback ejecutado antes de actualizar un registro.
   * Si retorna false (o promesa false), cancela la operación.
   */
  onBeforeUpdate?: (id: string | number, data: Partial<T>) => Promise<boolean> | boolean;

  /**
   * Callback ejecutado antes de iniciar el proceso de eliminación.
   * Si retorna false (o promesa false), cancela la operación (no muestra confirmación).
   */
  onBeforeDelete?: (record: T) => Promise<boolean> | boolean;

  // ===== CALLBACKS POST-ACCIÓN =====
  /**
   * Callback cuando se crea un registro exitosamente
   */
  onCreateSuccess?: (record: T) => void;

  /**
   * Callback cuando se actualiza un registro exitosamente
   */
  onUpdateSuccess?: (record: T) => void;

  /**
   * Callback cuando se elimina un registro exitosamente
   */
  onDeleteSuccess?: (id: string | number) => void;

  /**
   * Callback cuando ocurre un error
   */
  onError?: (error: Error, action: 'create' | 'update' | 'delete' | 'fetch') => void;

  /**
   * Texto del botón crear
   * @default 'Crear {entityName}'
   */
  createButtonText?: string;

  /**
   * Texto del botón guardar en el formulario
   * @default 'Guardar'
   */
  saveButtonText?: string;

  /**
   * Texto del botón cancelar en el formulario
   * @default 'Cancelar'
   */
  cancelButtonText?: string;

  /**
   * Mensaje cuando no hay datos
   * @default 'No hay registros disponibles'
   */
  emptyMessage?: string;

  /**
   * Clases CSS adicionales para el contenedor
   */
  className?: string;

  /**
   * ID único para accesibilidad
   */
  id?: string;

  /**
   * Renderizado personalizado para la toolbar
   */
  renderToolbar?: (props: {
    onSearch: (term: string) => void;
    onCreate: () => void;
    searchTerm: string;
  }) => ReactNode;

  /**
   * Acciones adicionales por fila
   */
  rowActions?: (row: T, index: number) => ReactNode;

  /**
   * Ancho del contenedor del formulario
   * @default '600px'
   */
  formWidth?: string;

  /**
   * Número de columnas del grid del formulario
   * @default 2
   */
  formColumns?: number;

  /**
   * Si se deben ocultar las pestañas automáticas de entidades dinámicas.
   * Útil cuando se usa renderForm para implementar un tabulado propio.
   * @default false
   */
  hideDynamicTabs?: boolean;

  /**
   * Si se muestra el toggle de vista (grid/list) en la toolbar
   * @default false
   */
  showViewToggle?: boolean;

  /**
   * Si se muestra el botón de búsqueda avanzada
   * @default false
   */
  showAdvancedSearch?: boolean;

  /**
   * Acciones personalizadas por registro
   */
  actions?: MasterCrudAction<T>[];

  /**
   * Renderizado personalizado del contenido de la tarjeta en la vista de grid.
   * Permite personalizar cómo se muestra la información dentro de la tarjeta,
   * mientras MasterCRUDCard mantiene el contenedor, estilos y dropdown de acciones.
   *
   * @param data - El registro de datos a renderizar
   * @param index - El índice del registro en la lista
   * @returns ReactNode con el contenido visual personalizado
   *
   * @example
   * ```tsx
   * renderCardContent={(data, index) => (
   *   <div className="flex flex-col gap-2">
   *     <h3 className="text-lg font-bold">{data.nombre}</h3>
   *     <p className="text-sm text-gray-500">{data.descripcion}</p>
   *     <Badge color="green" label={data.estado} />
   *   </div>
   * )}
   * ```
   */
  renderCardContent?: (data: T, index: number) => ReactNode;

  /**
   * Renderizado personalizado del formulario de creación/edición.
   * Si se define, sustituye completamente al MasterCrudForm por defecto.
   * Recibe todas las props necesarias para manejar el estado y envío.
   */
  renderForm?: (props: MasterCrudFormProps<T>) => ReactNode;

  /**
   * Si se muestra la acción de editar por defecto en el menú
   * @default true
   */
  showDefaultEditAction?: boolean;

  /**
   * Si el modal de edición debe mostrarse maximizado (pantalla completa)
   * @default false
   */
  maximizeEditModal?: boolean;

  /**
   * Si se muestra el modal de acciones personalizadas debe mostrarse maximizado por defecto
   * @default true
   */
  maximizeCustomModal?: boolean;

  /**
   * Indica si se debe realizar una llamada al método getById del servicio al entrar en modo edición.
   * Si es true, se cargará el registro completo desde el servidor.
   * Si es false, se utilizarán los datos presentes en el listado de la tabla.
   * @default true
   */
  fetchDetailOnEdit?: boolean;

  /**
   * Habilita el manejo automático de errores mediante Toasts internos.
   * Si es true, el componente mostrará notificaciones visuales (Toasts) cuando ocurran errores.
   * Si es false, solo se ejecutará el callback `onError`.
   * @default true
   */
  internalErrorHandling?: boolean;

  /**
   * Opciones de ordenamiento para el dropdown
   */
  sortOptions?: SortOption[];

  /**
   * Opciones de filtro para el dropdown
   */
  filterOptions?: FilterOption[];

  /**
   * Si se usa el nuevo MasterCrudToolbar
   * @default true
   */
  useToolbar?: boolean;

  /**
   * Callback cuando cambia la vista
   */
  onViewChange?: (view: ToolbarViewType) => void;

  /**
   * Si se muestran los conectores (Y/O) entre campos en la búsqueda avanzada.
   * Por defecto es false.
   * @default false
   */
  showAdvancedSearchConnectors?: boolean;

  /**
   * Cantidad máxima de campos que pueden participar en la búsqueda avanzada.
   * @default 4
   */
  maxAdvancedFilters?: number;

  /**
   * Si el contenedor de búsqueda y filtros es visible inicialmente
   * @default false
   */
  initialFiltersVisible?: boolean;

  /**
   * Badges informativos que aparecen debajo del título en modo página.
   * Útil para mostrar estados, prioridades, etc.
   */
  headerBadges?: ((record: T | null) => { label: string; color?: any }[]) | { label: string; color?: any }[];

  /**
   * Renderizado personalizado en la sección central del toolbar en modo página.
   * Útil para agregar selectores de compañía, filtros rápidos, etc.
   */
  renderHeaderExtra?: (record: T | null) => ReactNode;

  /**
   * Habilita la selección de compañía en el toolbar
   * @default false
   */
  activeByCompany?: boolean;

  /**
   * Indica si la selección de compañía es obligatoria.
   * Si es true, la opción "Global" se oculta del selector.
   * @default false
   */
  companyRequired?: boolean;

  /**
   * Lista de compañías disponibles
   */
  companies?: MasterCrudCompany[];

  /**
   * Callback cuando cambia la compañía seleccionada.
   * En modo edición/página, también recibe el ID del registro actual.
   */
  onCompanyChange?: (company: MasterCrudCompany, recordId?: string | number) => void;

  /**
   * Callback ejecutado cuando se confirma la vinculación en el modal.
   * Recibe el ID del registro y el array de UUIDs de compañías seleccionadas.
   */
  onConfirmLinking?: (recordId: string | number, companyUuids: (string | number)[]) => void;

  /**
   * Función para verificar si un registro ya está vinculado a una compañía (estado inicial).
   */
  isCompanyLinked?: (recordId: string | number, companyUuid: string | number) => boolean;

  /**
   * Determina si se deben mostrar los valores globales debajo de los campos por defecto.
   * @default false
   */
  showGlobalValues?: boolean;

  /**
   * Callback ejecutado cuando un campo con 'checkMatchesOnBlur' pierde el foco.
   */
  onSearchMatches?: (field: MasterCrudField<T>, value: string) => Promise<MatchResult[]> | MatchResult[];
}

// ============================================
// PROPS DE COMPONENTES INTERNOS
// ============================================

/**
 * Props del componente MasterCrudTable
 */
export interface MasterCrudTableProps<T = any> {
  /** Definición de campos */
  fields: MasterCrudField<T>[];
  /** Datos a mostrar */
  data: T[];
  /** Si está cargando */
  loading?: boolean;
  /** Mensaje cuando no hay datos */
  emptyMessage?: string;
  /** Callback para ordenar */
  onSort?: (column: string, direction: 'asc' | 'desc' | null) => void;
  /** Columna actual de ordenamiento */
  sortColumn?: string;
  /** Dirección actual de ordenamiento */
  sortDirection?: 'asc' | 'desc' | null;
  /** Configuración de paginación */
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  /** Si se muestran acciones por fila */
  showRowActions?: boolean;
  /** Callback para editar */
  onEdit?: (row: T, index: number) => void;
  /** Callback para eliminar */
  onDelete?: (row: T, index: number) => void;
  /** Acciones personalizadas por fila */
  rowActions?: (row: T, index: number) => ReactNode;
  /** Clases CSS adicionales */
  className?: string;
  /** Idioma para formatos (ISO 639-1) */
  locale?: string;
  /** Acciones combinadas (default + custom) para cada fila */
  actions?: MasterCrudAction<T>[];
  /** Habilitar selección múltiple */
  enableMultiSelect?: boolean;
  /** Registros seleccionados actualmente */
  selectedIds?: (string | number)[];
  /** Callback cuando cambia la selección */
  onSelectionChange?: (ids: (string | number)[]) => void;
  /** Función de traducción inyectada por el padre */
  t: (key: string, defaultValue?: string) => string;
}

/**
 * Props del componente MasterCrudForm
 */
export interface MasterCrudFormProps<T = any> {
  /** Función de traducción inyectada por el padre */
  t: (key: string, defaultValue?: string) => string;
  /** ID único para el formulario */
  id?: string;
  /** Definición de campos */
  fields: MasterCrudField<T>[];
  /** Nombre de la entidad (ej: "Item") */
  entityName?: string;
  /** Código del Feature para cargar entidades dinámicas (EAV) */
  dynamicFeatureCode?: string;
  /** Datos iniciales del formulario (para edición) */
  initialData?: Partial<T>;
  /** Si está en modo edición */
  isEditing?: boolean;
  /** Si está cargando/guardando */
  loading?: boolean;
  /** Callback al enviar el formulario */
  onSubmit: (data: Partial<T>) => void;
  /** Callback al cancelar */
  onCancel: () => void;
  /** Texto del botón guardar */
  saveButtonText?: string;
  /** Texto del botón cancelar */
  cancelButtonText?: string;
  /** Número de columnas del grid */
  columns?: number;
  /** Ancho del formulario */
  width?: string;
  /** Clases CSS adicionales */
  className?: string;
  /** Acciones disponibles en el formulario (solo modo edición) */
  actions?: MasterCrudAction<T>[];
  /** 
   * Si se deben ocultar el header y el footer internos del formulario.
   * Útil cuando el contenedor padre ya provee estas acciones (ej: modo Página).
   * @default false
   */
  hideHeaderFooter?: boolean;

  /**
   * Si el botón de guardado debe ocupar todo el ancho del contenedor.
   * Se usa típicamente en modo Sidebar.
   * @default false
   */
  fullWidthButton?: boolean;

  /**
   * Si el formulario debe estar en modo solo lectura (todos los campos deshabilitados).
   * @default false
   */
  isReadOnly?: boolean;

  /**
   * Nombre de la propiedad que actúa como identificador único.
   * @default 'id'
   */
  idField?: string;

  /** Compañía seleccionada actualmente */
  selectedCompany?: MasterCrudCompany;

  /** Si está activa la funcionalidad por compañía */
  activeByCompany?: boolean;

  /** Indica si la selección de compañía es obligatoria (oculta Global) */
  companyRequired?: boolean;

  /**
   * Determina si se deben mostrar los valores globales debajo de los campos.
   * @default false
   */
  showGlobalValues?: boolean;

  /** Callback para buscar coincidencias onBlur */
  onSearchMatches?: (field: MasterCrudField<T>, value: string) => void;

  /** Permite realizar sobreescrituras en modo multicompañía */
  canOverrideMultiCompany?: boolean;

  /** Lista de todas las compañías (incluyendo Global) */
  companies?: MasterCrudCompany[];

  /** Callback cuando cambia la compañía en el selector del formulario */
  onCompanyChange?: (company: MasterCrudCompany, recordId?: string | number) => void;

  /** Callback para cambiar la visibilidad de valores globales */
  onShowGlobalValuesChange?: (show: boolean) => void;

  /** Callback para disparar la acción 'Usar datos globales' */
  onUseGlobalData?: () => void;

  /** Callback para disparar la creación de un nuevo registro */
  onCreateNew?: () => void;

  /** Callback para abrir el modal de vinculación de compañías */
  onLinkCompanies?: () => void;

  /**
   * Renderizado personalizado del contenido del formulario.
   * Si se define, se renderiza en el área de contenido manteniendo el Layout (Header/Footer).
   */
  renderContent?: (props: MasterCrudFormProps<T> & { 
    renderField: (accessorKey: string, inputRenderer: (value: any, onChange: (val: any) => void) => ReactNode) => ReactNode 
  }) => ReactNode;

  /** Valores actuales del formulario (para uso en renderContent) */
  values?: Partial<T>;

  /** Función para actualizar un valor (para uso en renderContent) */
  setValue?: (name: string, value: any) => void;

  /** Errores actuales de validación (para uso en renderContent) */
  errors?: Record<string, string>;

  /** Si se deben ocultar las pestañas automáticas de entidades dinámicas */
  hideDynamicTabs?: boolean;
  /** Función para registrar referencias de componentes dinámicos internos */
  registerDynamicRef?: (entityCode: string, ref: any) => void;
  /** Metadatos de la característica dinámica cargada */
  dynamicFeature?: any;
}

/**
 * Estado interno del formulario
 */
export interface FormState<T = any> {
  /** Valores del formulario */
  values: Partial<T>;
  /** Errores de validación por campo */
  errors: Record<string, string>;
  /** Si el formulario ha sido tocado */
  touched: Record<string, boolean>;
  /** Si el formulario está siendo enviado */
  isSubmitting: boolean;
}

// ============================================
// TOOLBAR
// ============================================

/**
 * Tipo de vista para el toggle de la toolbar
 */
export type ToolbarViewType = 'grid' | 'list';

/**
 * Opción de ordenamiento para el dropdown de la toolbar
 */
export interface SortOption {
  /** Valor único de la opción */
  value: string;
  /** Etiqueta visible */
  label: string;
  /** Campo por el cual ordenar */
  field: string;
  /** Dirección del ordenamiento */
  direction: 'asc' | 'desc';
}

/**
 * Opción de filtro para el dropdown de la toolbar
 */
export interface FilterOption {
  /** Valor único del filtro */
  value: string;
  /** Etiqueta visible */
  label: string;
  /** Icono opcional */
  icon?: ReactNode;
}

/**
 * Props del componente MasterCrudToolbar
 */
export interface MasterCrudToolbarProps {
  /**
   * Título que se muestra a la izquierda
   */
  title: string;

  /**
   * Placeholder del input de búsqueda
   * @default 'Buscar'
   */
  searchPlaceholder?: string;

  /**
   * Valor actual de la búsqueda
   */
  searchValue?: string;

  /**
   * Callback cuando cambia el valor de búsqueda
   */
  onSearchChange?: (value: string) => void;

  /**
   * Si se muestra el campo de búsqueda
   * @default true
   */
  showSearch?: boolean;

  /**
   * Opciones del dropdown de filtros
   */
  filterOptions?: FilterOption[];

  /**
   * Filtro seleccionado actualmente
   */
  selectedFilter?: string;

  /**
   * Callback cuando cambia el filtro
   */
  onFilterChange?: (value: string) => void;

  /**
   * Si se muestra el dropdown de filtros
   * @default true
   */
  showFilter?: boolean;

  /**
   * Texto del botón de filtros
   * @default 'Filtrar'
   */
  filterButtonText?: string;

  /**
   * Opciones del dropdown de ordenamiento
   */
  sortOptions?: SortOption[];

  /**
   * Ordenamiento seleccionado actualmente (nombre del campo)
   */
  selectedSort?: string;

  /**
   * Dirección del ordenamiento actual
   */
  sortDirection?: 'asc' | 'desc';

  /**
   * Callback cuando cambia el ordenamiento (campo)
   */
  onSortChange?: (value: string) => void;

  /**
   * Callback cuando cambia la dirección del ordenamiento
   */
  onSortDirectionChange?: (direction: 'asc' | 'desc') => void;

  /**
   * Si se muestra el dropdown de ordenamiento
   * @default true
   */
  showSort?: boolean;

  /**
   * Texto del botón de ordenamiento
   * @default 'Ordenar'
   */
  sortButtonText?: string;

  /**
   * Vista actual (grid o list)
   * @default 'list'
   */
  viewType?: ToolbarViewType;

  /**
   * Callback cuando cambia la vista
   */
  onViewChange?: (view: ToolbarViewType) => void;

  /**
   * Si se muestra el toggle de vista
   * @default true
   */
  showViewToggle?: boolean;

  /**
   * Si se muestra el botón de búsqueda avanzada
   * @default false
   */
  showAdvancedSearch?: boolean;

  /**
   * Contenido adicional a renderizar en la toolbar
   */
  extraContent?: ReactNode;

  /**
   * Clases CSS adicionales
   */
  className?: string;

  /** Acciones globales adicionales */
  globalActions?: MasterCrudAction[];

  /** Acciones grupales (cuando hay selección) */
  batchActions?: MasterCrudAction[];

  /** Si hay registros seleccionados actualmente */
  hasSelection?: boolean;

  /** Si la búsqueda avanzada está activa */
  isAdvancedSearchActive?: boolean;

  /** Callback para alternar búsqueda avanzada */
  onAdvancedSearchToggle?: () => void;

  /** Si el contenedor de búsqueda y filtros es visible inicialmente */
  initialFiltersVisible?: boolean;

  /** Habilita la selección de compañía */
  activeByCompany?: boolean;

  /** Indica si la selección de compañía es obligatoria */
  companyRequired?: boolean;

  /** Lista de compañías disponibles */
  companies?: MasterCrudCompany[];

  /** Compañía seleccionada actualmente */
  selectedCompany?: MasterCrudCompany;

  /** Callback cuando cambia la compañía */
  onCompanyChange?: (company: MasterCrudCompany, recordId?: string | number) => void;

  /** Función de traducción inyectada por el padre */
  t: (key: string, defaultValue?: string) => string;
}
