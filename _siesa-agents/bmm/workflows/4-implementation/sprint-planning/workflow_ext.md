# REGLA OBLIGATORIA: SPRINT-PLANNING CON TRAZABILIDAD Y RE-EJECUCIÓN INCREMENTAL

**TRIGGER:** Cada vez que se ejecute `/sprint-planning`.

---

## 1. TRAZABILIDAD: EPIC SOURCE

Al generar el `sprint-status.yaml`, por cada épica descubierta se debe agregar un campo `epic-{N}-source` inmediatamente después de la entrada `epic-{N}`, indicando la ruta relativa (desde `{project-root}`) del archivo shardeado del que fue extraída.

**FORMATO:**
```yaml
development_status:
  epic-1: backlog
  epic-1-source: {planning_artifacts}/epics/epic-01-feature-name.md
  1-1-story-name: backlog
  epic-1-retrospective: optional

  epic-5: backlog
  epic-5-source: {planning_artifacts}/epics/epic-02-otro-feature.md
  5-1-story-name: backlog
  epic-5-retrospective: optional
```

**REGLAS:**
1. La key sigue el patrón `epic-{N}-source` donde `{N}` es el número de la épica.
2. El valor es la ruta resuelta de `{planning_artifacts}` + la ruta relativa del archivo del que se extrajo la épica.
3. Si la épica viene de un documento completo (no shardeado), no se agrega el marcador epic-source.

---

## 2. RE-EJECUCIÓN INCREMENTAL

Cuando `sprint-status.yaml` YA EXISTE, el workflow NO debe hacer FULL_LOAD. En su lugar:

**PASO 1: Detectar estado actual**
- Leer el `sprint-status.yaml` existente.
- Extraer todos los valores de `epic-{N}-source` para obtener la lista de archivos shard ya procesados.

**PASO 2: Detectar cambios**
- Escanear la carpeta de epics (`{planning_artifacts}/epics/` o el archivo `*epics.md*` correspondiente).
- Comparar archivos en disco vs archivos referenciados en los `epic-{N}-source`.
- Clasificar:
  - **Archivos nuevos**: shards que no aparecen en ningún `epic-{N}-source`.
  - **Archivos existentes**: shards ya referenciados.

**PASO 3: Detectar nuevos features (vía epic-list.md)**
- Leer `{planning_artifacts}/epics/epic-list.md` — este archivo actúa como índice ligero.
- Extraer los features y épicas listados.
- Comparar contra las épicas ya presentes en el sprint-status.
- La diferencia indica los features/épicas nuevos.

**PASO 4: Presentar menú al usuario**

> *"Ya existe sprint-status.yaml con {X} épicas (última: Epic {N}). He detectado {Y} feature(s) nuevo(s) desde epic-list.md: [lista]. ¿Cómo deseas proceder?"*
>
> **[A] Agregar al sprint actual** — Integra las nuevas épicas al sprint-status.yaml existente.
> **[N] Iniciar nuevo sprint** — Archiva el sprint actual y crea uno nuevo solo con los features nuevos.
> **[R] Re-procesar épica existente** — Recarga una épica específica para detectar stories nuevas.
> **[S] Sin cambios** — No modificar el archivo.

**Comportamiento por opción:**

**[A] Agregar al sprint actual:**
- Cargar SOLO los shards de los features nuevos.
- Hacer APPEND al sprint-status existente.
- El consecutivo de épicas CONTINÚA desde el último `epic-{N}` del sprint-status (NO reinicia).
- Las nuevas entradas entran como `backlog`.

**[N] Iniciar nuevo sprint:**
- Copiar `sprint-status.yaml` a `{implementation-artifacts}/archive/sprint-status-{YYYY-MM-DD}.yaml`.
- Crear un nuevo `sprint-status.yaml` SOLO con los features nuevos detectados.
- El consecutivo de épicas CONTINÚA desde el último `epic-{N}` del sprint archivado (NO reinicia).
- Preguntar al usuario si desea también trasladar épicas pendientes (`backlog`) del sprint anterior al nuevo.

**[R] Re-procesar épica existente:**
- El usuario indica qué épica(s) re-procesar.
- Leer el `epic-{N}-source` para saber qué shard cargar.
- Comparar stories del shard vs stories `{N}-*` del sprint-status.
- Agregar las nuevas como `backlog` sin modificar las existentes.

**[S] Sin cambios:** No modificar el archivo.

**REGLA CRÍTICA:** NUNCA sobrescribir ni degradar estados existentes en el sprint-status. Solo se permite AGREGAR entradas nuevas.

---

## 3. FEATURE STATUS FILE

Después de generar o actualizar el `sprint-status.yaml`, el workflow debe generar o actualizar `{implementation_artifacts}/feature-status.yaml`.

**Primera ejecución (no existe el archivo):**
Crear el archivo con la siguiente estructura:

```markdown
# Feature Status

| Feature | Epic Source | Status | Last Update |
|---------|-----------|--------|-------------|
| feature-1 | {planning_artifacts}/epics/epic-01-feature-name.md | backlog | {DD-MM-YYYY} |
| feature-2 | {planning_artifacts}/epics/epic-02-otro-feature.md | backlog | {DD-MM-YYYY} |
```

- Cada feature se identifica con `feature-{N}` donde `{N}` es el número secuencial del shard.
- Epic Source es la ruta del shard de épicas asociado.
- Status inicial: `backlog`.
- No solicitar datos adicionales del proyecto. Solo registrar features, status y fecha.

**Re-ejecución (archivo ya existe):**
- Leer el `feature-status.yaml` existente.
- Validar que contenga todos los features presentes en el sprint-status (vía `epic-{N}-source`).
- Si hay features nuevos, agregarlos como `backlog` al final de la tabla.
- NO modificar el `Status` ni `Last Update` de features existentes.

---

## 4. PRIMERA EJECUCIÓN DEL SPRINT-STATUS

Cuando `sprint-status.yaml` NO existe, continuar con el flujo estándar FULL_LOAD sin alteraciones, aplicando las reglas de trazabilidad de la sección 1 y generando el `feature-status.yaml` según la sección 3.
