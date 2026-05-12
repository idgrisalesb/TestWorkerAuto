---
name: quality-process
description: "QA Quality Process — Phase 1 Planning (BMAD V6.0 test design), Phase 2 Design (QA Test Plan & Strategy), or Phase 3 AgileTest Registration (push validated design to Jira/AgileTest). Asks at startup which phase to execute."
web_bundle: true
version: 1.0.0
parameters:
  feature_id:
    description: 'Opcional: Feature ID a procesar (ej: "feature-1"). Solo aplica para la Fase 2 — Diseño.'
    required: false
    type: string
---

# Proceso de Calidad QA

**Goal:** Ejecutar el proceso de calidad QA del proyecto en la fase seleccionada. El proceso tiene dos fases complementarias que se ejecutan en secuencia por el QA asignado:

- **Fase 1 — Planeación:** Genera el Plan de Pruebas y Estrategia QA (alcance, riesgos R=IxP, Data Buckets, criterios Go/No-Go) a partir de los documentos fuente del proyecto.
- **Fase 2 — Diseño:** Genera el diseño de pruebas técnico (trazabilidad, Gatekeeper, FAC, Puntos Ciegos, Matriz Integral, TSR) usando BMAD V6.0 sobre los features del proyecto.

**Your Role:** Además de tu nombre, communication_style y persona, actúas como **QA Architect Senior** con 10+ años de experiencia en sistemas empresariales complejos (ERP, HCM, CRM, plataformas financieras, compliance regulatorio). Piensas como defensor del negocio, no solo como técnico de pruebas. Trabajas bajo la metodología BMAD v6.0.


## WORKFLOW ARCHITECTURE

**EXECUTION MODE: Phase-Selection + Automated Megaprompt**

Este workflow pregunta al inicio qué fase ejecutar y luego corre automáticamente la lógica correspondiente.

### Critical Rules (NO EXCEPTIONS)

- 🎯 **ALWAYS** preguntar la fase al usuario ANTES de cualquier otra acción
- ✅ **ALWAYS** comunicar en `{communication_language}` (Español para mensajes al usuario)
- 📁 **ALWAYS** usar rutas relativas (desde project-root) en documentos generados, NUNCA rutas absolutas
- 📄 **ALWAYS** cargar el prompt de la fase seleccionada desde `{workflow_root}/prompts/`

---

## INITIALIZATION SEQUENCE

### 1. Configuration Loading

Cargar y leer la configuración completa desde `{project-root}/_bmad/bmm/config.yaml` y resolver:

- `project_name`, `output_folder`, `user_name`, `communication_language`, `document_output_language`
- `planning_artifacts`, `implementation_artifacts`

### 2. Phase Selection (OBLIGATORIO — Primer paso interactivo)

Preguntar al usuario qué fase del proceso de calidad desea ejecutar:

```
🔎 Proceso de Calidad QA — Selección de Fase

El proceso de calidad tiene tres fases:

  1️⃣  Planeación      — Diseño técnico de pruebas: Gatekeeper, FAC en Gherkin,
                         Puntos Ciegos, Matriz Integral 360°, TSR y CSV de casos.
                         (Requiere: feature-status.yaml + archivos epic_source)

  2️⃣  Diseño          — Plan & Estrategia QA: alcance, tipos de prueba,
                         Matriz de Riesgo (R = I×P), Data Buckets y criterios Go/No-Go.
                         (Requiere: PRD, Arquitectura, Épicas u otros documentos fuente)

  3️⃣  Registro AgileTest — Empuja el diseño validado a Jira/AgileTest:
                         Requisitos, Test Cases con Steps, Planes de Prueba (PPR),
                         Planes de Ejecución (PEP) y links de trazabilidad.
                         (Requiere: Fase 1 completada y validada por el equipo QA)

  2️⃣  Diseño      — Diseño técnico de pruebas: Gatekeeper, FAC en Gherkin,
                     Puntos Ciegos, Matriz Integral 360°, TSR y CSV de casos.
                     (Requiere: feature-status.yaml + archivos epic_source)

¿Qué fase deseas ejecutar?
```

Usar AskUserQuestion con las opciones:
```json
{
  "questions": [
    {
      "question": "¿Qué fase del proceso de calidad deseas ejecutar?",
      "header": "Proceso de Calidad QA — Selección de Fase",
      "multiSelect": false,
      "options": [
        {
          "label": "Fase 1 — Planeación",
          "description": "Plan & Estrategia QA: alcance, riesgos R=I×P, Data Buckets, criterios Go/No-Go"
        },
        {
          "label": "Fase 2 — Diseño",
          "description": "Plan & Estrategia QA: alcance, riesgos R=I×P, Data Buckets, criterios Go/No-Go"
        },
        {
          "label": "Fase 3 — Registro AgileTest",
          "description": "Empujar diseño validado a Jira/AgileTest: Requisitos, TCs con Steps, Planes (PPR), Ejecuciones (PEP) y links de trazabilidad"
        }
      ]
    }
  ]
}
```

- Si selecciona **Fase 1 — Planeación**: continuar con la sección `FASE 1 — PLANEACIÓN`
- Si selecciona **Fase 2 — Diseño**: continuar con la sección `FASE 2 — DISEÑO`
- Si selecciona **Fase 3 — Registro AgileTest**: continuar con la sección `FASE 3 — REGISTRO AGILETEST`

---

## FASE 1 — PLANEACIÓN

### Objetivo

Generar un Plan de Pruebas y Estrategia QA completo siguiendo la metodología BMAD v3.0 (Spec-Driven Quality). Produce el plan táctico que guía la ejecución de QA durante el sprint: alcance, tipos de prueba, matriz de riesgo predictivo, Data Buckets por feature y criterios de entrada/salida (Go/No-Go).

---

### F1.1: Auto Document Discovery (Zero User Interaction)

Buscar y leer automáticamente los documentos fuente desde sus rutas fijas. Notificar:

```
🔍 Buscando documentos fuente del proyecto...
```

#### Documento 1 — PRD / Requerimientos

Buscar con Glob en este orden:
1. `{planning_artifacts}/prd.md`
2. `{planning_artifacts}/PRD.md`
3. `{planning_artifacts}/*prd*.md`
4. `{planning_artifacts}/*requirements*.md`

Si encontrado: leer contenido completo → almacenar en `doc_prd`
Si no encontrado: `doc_prd = null`

#### Documento 2 — Arquitectura / ADR

Buscar con Glob en este orden:
1. `{planning_artifacts}/architecture.md`
2. `{planning_artifacts}/architecture-decision.md`
3. `{planning_artifacts}/*architecture*.md`
4. `{planning_artifacts}/*adr*.md`

Si encontrado: leer contenido completo → almacenar en `doc_architecture`
Si no encontrado: `doc_architecture = null`

#### Documento 3 — User Stories / Épicas

Buscar con Glob en este orden:
1. `{implementation_artifacts}/feature-status.yaml` → leer y para cada feature leer su `epic_source`
2. `{planning_artifacts}/epics.md`
3. `{planning_artifacts}/*epic*.md`
4. `{implementation_artifacts}/*epic*.md`

Si encontrado: leer contenido completo de todos los epic_source files y concatenar → almacenar en `doc_epics`
Si no encontrado: `doc_epics = null`

#### Documento 4 — Contexto Normativo / Regulatorio

Buscar con Glob en este orden:
1. `{project-root}/docs/*normativ*.md`
2. `{project-root}/docs/*regulat*.md`
3. `{project-root}/docs/*compliance*.md`
4. `{project-root}/docs/*legal*.md`
5. `{planning_artifacts}/*normativ*.md`

Si encontrado: leer contenido completo → almacenar en `doc_regulatory`
Si no encontrado: `doc_regulatory = null`

#### Documento 5 — Diseño UX / Wireframes

Buscar con Glob en este orden:
1. `{planning_artifacts}/ux-design.md`
2. `{planning_artifacts}/*ux*.md`
3. `{planning_artifacts}/*wireframe*.md`
4. `{planning_artifacts}/*design*.md`

Si encontrado: leer contenido completo → almacenar en `doc_ux`
Si no encontrado: `doc_ux = null`

#### Validación mínima

Verificar que al menos uno de los documentos fue encontrado. Si **ninguno** fue encontrado:

```
⚠️ No se encontraron documentos fuente en las rutas estándar del proyecto.

Rutas buscadas:
  • PRD:          {planning_artifacts}/prd.md (y variantes)
  • Arquitectura: {planning_artifacts}/architecture.md (y variantes)
  • Épicas:       {implementation_artifacts}/feature-status.yaml (y variantes)
  • Normativo:    {project-root}/docs/ (y variantes)
  • UX:           {planning_artifacts}/ux-design.md (y variantes)

¿Deseas continuar de todas formas o cancelar?
```

Esperar confirmación del usuario. Si cancela, detener el workflow.

#### Reporte y confirmación de documentos encontrados

Mostrar al usuario:

```
📋 Documentos fuente encontrados:

  ✅ PRD:           {ruta relativa o "No encontrado"}
  ✅ Arquitectura:  {ruta relativa o "No encontrado"}
  ✅ Épicas:        {ruta(s) relativa(s) o "No encontrado"}
  ✅ Normativo:     {ruta relativa o "No encontrado"}
  ✅ UX Design:     {ruta relativa o "No encontrado"}

📄 Total documentos cargados: {N de 5}
```

**Solicitar confirmación al usuario antes de continuar** usando AskUserQuestion:

```json
{
  "questions": [
    {
      "question": "¿Los documentos cargados son correctos para continuar?",
      "header": "Confirmación de documentos fuente",
      "multiSelect": false,
      "options": [
        {
          "label": "✅ Continuar con estos documentos",
          "description": "Proceder a generar el Plan de Pruebas con los documentos encontrados"
        },
        {
          "label": "➕ Agregar documentos adicionales al contexto",
          "description": "Indicar rutas o pegar contenido de documentos extra antes de continuar"
        },
        {
          "label": "❌ Cancelar",
          "description": "Detener el workflow"
        }
      ]
    }
  ]
}
```

**Si "Continuar":**
- Almacenar todos los contenidos encontrados concatenados en: `input_source_documents`
- Proceder a F1.2

**Si "Agregar documentos adicionales":**
- Pedir al usuario que indique las rutas o pegue el contenido adicional:
  ```
  📎 Indica las rutas de los documentos adicionales (una por línea) o pega
     directamente su contenido. Escribe "listo" cuando hayas terminado.
  ```
- Leer y cargar cada ruta indicada; si el usuario pega contenido directamente, almacenarlo tal cual
- Agregar el contenido adicional a `input_source_documents`
- Confirmar: `✅ Documentos adicionales cargados. Procediendo a generar el Plan de Pruebas...`
- Proceder a F1.2

**Si "Cancelar":**
- Detener el workflow

---

### F1.2: Automatic Megaprompt Execution

Proceder automáticamente sin más interacción:

**Step F1.2.1: Load Megaprompt**

1. Leer el archivo completo: `{workflow_root}/prompts/prompt_test_plan.md`
2. Este prompt transforma al agente en QA Architect Senior BMAD v3.0

**Step F1.2.2: Execute**

Notificar al usuario:

```
⚙️ Procesando documentos fuente...
🔍 Ejecutando análisis interno (Chain-of-Thought):
   • PASO 1: Impact Analysis (Blast Radius)
   • PASO 2: Technical Debt & Compliance Assessment
   • PASO 3: Risk Matrix Calculation (R = I × P)
   • PASO 4: Synergy Mapping (Agentes BMAD)

📋 Generando Plan de Pruebas BMAD v3.0...
```

Ejecutar el megaprompt completo usando `input_source_documents` como documentos fuente adjuntos.

El plan de pruebas generado debe incluir todas las secciones del prompt:
- Sección 1: Información General
- Sección 2: Objetivo & DoR / DoD
- Sección 3: Alcance de Pruebas
- Sección 4: Estrategia de Pruebas
- Sección 5: Ambiente & Datos de Prueba (Data Buckets por feature)
- Sección 6: Matriz de Riesgo Predictivo (R = I × P)
- Sección 7: Criterios de Entrada / Salida (Go / No-Go)

**Step F1.2.3: Save Output**

1. Generar timestamp: `YYYY-MM-DD-HHmmss` (ej: `2026-03-25-143052`)
2. Crear carpeta: `{implementation_artifacts}/quality-process/planeacion/test-plan-YYYY-MM-DD-HHmmss/`
3. Guardar el plan generado como: `test-plan.md`

**Frontmatter del documento generado:**
```yaml
---
workflow: quality-process
phase: planeacion
version: 1.0.0
methodology: BMAD v3.0 Spec-Driven Quality
generated_date: [ISO 8601 date]
project_name: {project_name}
source_documents:
  prd: [ruta relativa o null]
  architecture: [ruta relativa o null]
  epics: [ruta(s) relativa(s) o null]
  regulatory: [ruta relativa o null]
  ux_design: [ruta relativa o null]
---
```

---

### F1.3: Completion

Presentar al usuario:

```
✅ FASE 1 — PLANEACIÓN COMPLETADA

📁 Archivo: {implementation_artifacts}/quality-process/planeacion/test-plan-YYYY-MM-DD-HHmmss/test-plan.md

📋 Secciones incluidas:
  1. Información General
  2. Objetivo & DoR / DoD (Checklist de entrada y salida)
  3. Alcance de Pruebas (Features incluidas y excluidas)
  4. Estrategia de Pruebas (Tipos, técnicas, integración Human–AI)
  5. Ambiente & Datos de Prueba (Data Buckets por feature)
  6. Matriz de Riesgo Predictivo (Riesgos identificados por feature)
  7. Criterios de Entrada / Salida (Go / No-Go checklist)

⚠️  Riesgos críticos (R > 15): [N detectados — ver Sección 6]
🎯  Decisión Go/No-Go: [ver Sección 7]

🔍 Revisa el plan y completa las secciones marcadas como [PENDIENTE]
   con información específica de tu sprint/equipo.
```

**⚠️ NO sugerir continuar con Fase 2 ni ninguna acción adicional. El workflow termina aquí. El equipo de QA debe revisar y validar los documentos generados antes de ejecutar la Fase 2 — Diseño.**

---

## FASE 2 — DISEÑO

### Objetivo

Generar el diseño técnico de pruebas completo aplicando la metodología BMAD V6.0. Produce trazabilidad funcional, criterios de aceptación en Gherkin, puntos ciegos por arquetipo, Matriz Integral de Pruebas 360° y Test Summary Report.

---

### F2.1: Feature Selection (Interactivo)

**Capture feature_id parameter** si fue provisto en los argumentos del comando.

1. **Cargar el registro de features:**
   - Leer: `{implementation_artifacts}/feature-status.yaml`
   - Parsear YAML para extraer todos los features: `[{id, epic_source, status, last_update}, ...]`

2. **Si `feature_id` fue provisto como parámetro:**
   - Validar que existe en el registro; si no, listar IDs disponibles y detener
   - `filtered_features = [ese feature]`
   - Notificar: `✅ Feature seleccionado por parámetro: {feature_id}`
   - Ir a F2.2

3. **Si no se proveyó parámetro, preguntar al usuario:**

   Mostrar features disponibles:
   ```
   📋 Features disponibles en el proyecto:

   {por cada feature:
     "  • {feature.id}  [{feature.status}]  →  {feature.epic_source}"
   }
   ```

   Usar AskUserQuestion:
   ```json
   {
     "questions": [
       {
         "question": "¿Qué features deseas analizar?",
         "header": "Selección de Features — Fase 2 Diseño",
         "multiSelect": false,
         "options": [
           {
             "label": "Todos los features",
             "description": "Procesar todos los features del registro"
           },
           {
             "label": "Seleccionar features específicos",
             "description": "Elegir uno o más features por ID"
           }
         ]
       }
     ]
   }
   ```

   **Si "Todos los features":**
   - `filtered_features = all_features`
   - Notificar: `✅ Se procesarán todos los features ({count} features)`

   **Si "Seleccionar features específicos":**
   - Si ≤ 4 features: usar AskUserQuestion multiSelect con una opción por feature
   - Si > 4 features: pedir vía texto: "Ingresa los IDs separados por comas (ej: feature-1,feature-3):"
   - Validar cada ID contra el registro
   - `filtered_features = features encontrados`
   - Notificar:
     ```
     ✅ Features seleccionados ({count}):
     {por cada feature en filtered_features:
       "  • {feature.id} → {feature.epic_source}"
     }
     ```

4. Almacenar `filtered_features` en memoria.

---

### F2.2: Automatic Data Loading (Zero User Interaction)

**CARGAR TODOS LOS INPUTS AUTOMÁTICAMENTE:**

1. **INPUT 1 - PROYECTO:**
   - Cargar desde config: `{project_name}`
   - Almacenar como: `input_proyecto`

2. **INPUT 2 - FEATURES / HISTORIAS DE USUARIO:**
   - Usar `filtered_features` de F2.1
   - Por cada feature, leer su archivo `epic_source` y concatenar contenido
   - Almacenar contenido combinado como: `input_epicas`

3. **INPUT 3 - METAS DE NEGOCIO (PRD):**
   - Buscar en `{planning_artifacts}/`: `prd.md`, `PRD.md`, `product-requirements.md` o similar
   - Si encontrado: leer y almacenar como `input_metas`
   - Si no encontrado: extraer metas de negocio de los archivos epic_source → `input_metas`

4. **INPUT 4 - STACK TECNOLÓGICO:**
   - Cargar desde: `{project-root}/_siesa-agents/bmm/data/company-standards/technology-stack.md`
   - Almacenar como: `input_stack`

5. **INPUT 5 - PLAN DE PRUEBAS (Fase 1 — Planeación):**
   - Buscar la carpeta más reciente en `{implementation_artifacts}/quality-process/planeacion/`:
     - Listar todas las subcarpetas con patrón `test-plan-*`
     - Ordenar por nombre descendente (el timestamp garantiza el orden cronológico)
     - Tomar la primera → es la ejecución más reciente
   - Si encontrada: leer `test-plan.md` → almacenar en `input_test_plan`
   - Si no encontrada: `input_test_plan = null`

**Notificar al usuario:**

```
🎯 BMAD V6.0 — Fase 2: Diseño de Pruebas

✅ Iniciando análisis automático...

📋 Datos cargados:
  • Proyecto: {input_proyecto}
  • Features registry: {implementation_artifacts}/feature-status.yaml
  • Features seleccionados: [lista de feature IDs]
  • PRD: [ruta encontrada o "extraído de epic_source files"]
  • Stack Tecnológico: _siesa-agents/bmm/data/company-standards/technology-stack.md
  • Plan de Pruebas (Fase 1): [ruta encontrada o "No encontrado — se continuará sin ese contexto"]

🚀 Ejecutando las 4 fases de análisis BMAD V6.0...
```

---

### F2.3: Load and Execute Megaprompt

1. **Cargar el Megaprompt:**
   - Leer el archivo completo: `{workflow_root}/prompts/prompt_design_test.md`
   - Este prompt transforma al agente en Principal QA Architect

2. **Inyectar inputs:**
   Reemplazar la sección `[INPUT]` del prompt:
   ```
   # [INPUT]:
   - **PROYECTO**: {input_proyecto}
   - **FEATURES / HISTORIAS DE USUARIO**: {input_epicas}
   - **METAS DE NEGOCIO (PRD)**: {input_metas}
   - **STACK TECNOLÓGICO**: {input_stack}
   - **PLAN DE PRUEBAS (contexto)**: {input_test_plan}
   ```

3. **Ejecutar las 4 FASES secuencialmente:**
   - FASE 1: GATEKEEPER GRANULAR Y LIMPIEZA DE BACKLOG
   - FASE 2: EL ESCALÓN DE CRITERIOS (FAC) en Gherkin
   - FASE 3: DETECCIÓN DE PUNTOS CIEGOS (Simulación Universal)
   - FASE 4: INGENIERÍA DE DISEÑO (ISO 29119-4) Y CALCULADORA DE RIESGO

   **Generar outputs en FORMATO EXACTO:**
   - I. REPORTE DEL GATEKEEPER (GRANULAR)
   - II. DEFINICIÓN DE FEATURES Y CRITERIOS MAESTROS (FAC) EN GHERKIN
   - III. PUNTOS CIEGOS DETECTADOS POR FEATURE
   - IV. MATRIZ INTEGRAL DE PRUEBAS (DISEÑO 360°)
   - V. INFORME TSR (TEST SUMMARY REPORT)
   - APÉNDICE: MATRIZ DE TRAZABILIDAD

---

### F2.4: Save Output

**Crear estructura de carpeta con timestamp:**

1. Generar timestamp: `YYYY-MM-DD-HHmmss` (ej: `2026-03-25-143052`)
2. Crear estructura de carpetas:
   - Raíz: `{implementation_artifacts}/quality-process/diseno/test-design-YYYY-MM-DD-HHmmss/`
   - Shards: `{implementation_artifacts}/quality-process/diseno/test-design-YYYY-MM-DD-HHmmss/shards/`
3. Guardar los 5 documentos dentro de la subcarpeta `shards/`:

**Documento 1:** `shards/test-design-phase1-gatekeeper.md` (Fase 1 — Clasificación Gatekeeper)
**Documento 2:** `shards/test-design-phase2-fac.md` (Fase 2 — Features y FAC en Gherkin)
**Documento 3:** `shards/test-design-phase3-blind-spots.md` (Fase 3 — Puntos Ciegos)
**Documento 4:** `shards/test-design-phase4-test-matrix.md` (Fase 4 — Matriz Integral)
**Documento 5:** `shards/test-design-phase5-tsr.md` (Fase 5 — TSR + Trazabilidad)

**Frontmatter para todos los documentos:**
```yaml
---
workflow: quality-process
phase: diseno
version: 1.0.0
methodology: BMAD V6.0 MegaPrompt
generated_date: [ISO 8601 date]
project_name: {input_proyecto}
input_documents:
  epics: [ruta(s) relativa(s)]
  prd: [ruta relativa o null]
  technology_stack: _siesa-agents/bmm/data/company-standards/technology-stack.md
  test_plan: [ruta relativa o null]
---
```

**Exportar casos de prueba a CSV (Siesa FT-SD-007 v5.0):**

Después de guardar `shards/test-design-phase4-test-matrix.md`:

1. Leer el contenido completo del archivo generado
2. Identificar secciones `## F# — [Nombre Feature]` → `ID Épica` formato `EPIC-POS-F{n}`
3. Parsear todas las filas de tabla `| TC-` extrayendo las 12 columnas de la matriz
4. Mapear a las 13 columnas del formato Siesa CSV:

   | Columna Matriz | → Columna CSV |
   |---|---|
   | Header `## F{n} — ...` | `ID Épica` (ej: `EPIC-POS-F1`) |
   | `ID` | `ID Caso de Prueba` |
   | `Escenario` | `Título` |
   | `Funcionalidad` + `: ` + `Escenario` | `Descripción Completa` |
   | `Precondiciones` | `Precondiciones` |
   | `Pasos` | `Pasos de Ejecución` |
   | `Resultado Esperado` | `Resultados Esperados` |
   | `Estrategia` | `Tipo prueba` |
   | _(vacío)_ | `Fecha Ejecución` |
   | `"Not Started"` | `Estado` |
   | _(vacío)_ | `ID Defecto` |
   | _(vacío)_ | `Descripción Fallo` |
   | `Level: [Level] \| Technique: [Technique] \| Risk: [Risk] \| Priority: [Priority]` | `Notas` |

5. **🚨 CRÍTICO — Compatibilidad Windows CSV:**
   - ✅ Usar **Write tool ONLY** — NUNCA bash, cat, echo, sed, awk
   - ✅ Construir el **string CSV completo en memoria** y luego llamar Write una vez
   - ✅ Envolver **TODOS los campos** en comillas dobles
   - ✅ Escapar comillas internas duplicándolas: `"` → `""`
   - ✅ Encoding: UTF-8

6. Guardar como: `{implementation_artifacts}/quality-process/diseno/test-design-YYYY-MM-DD-HHmmss/test-cases.csv` (en la raíz, NO en shards/)

---

### F2.5: Completion

Presentar al usuario:

```
✅ FASE 2 — DISEÑO COMPLETADA

📁 Carpeta: {implementation_artifacts}/quality-process/diseno/test-design-YYYY-MM-DD-HHmmss/

📄 Archivos en raíz:
  • test-design.md   — Documento unificado (phases 1–5)
  • test-cases.csv   — Casos exportados (Siesa FT-SD-007 v5.0)

📂 shards/ (documentos individuales por fase):
  • test-design-phase1-gatekeeper.md
  • test-design-phase2-fac.md
  • test-design-phase3-blind-spots.md
  • test-design-phase4-test-matrix.md
  • test-design-phase5-tsr.md

📊 Métricas:
  • Features identificados: [count]
  • Casos de prueba totales: [count]
  • Casos P0 (Críticos): [count]
  • Cobertura de riesgos críticos: [%]%
```

**⚠️ El workflow termina aquí. El equipo de QA debe revisar y validar los documentos generados.**

---

### F2.6: Merge Documents (Automatic)

Inmediatamente después de guardar los documentos en F2.4, ejecutar el script de merge usando la Bash tool:

```bash
python {project-root}/_siesa-agents/scripts/merge_test_design.py "{carpeta_generada}"
```

Donde `{carpeta_generada}` es la ruta absoluta de la carpeta creada en F2.4 (ej: `{implementation_artifacts}/quality-process/diseno/test-design-YYYY-MM-DD-HHmmss/`).

El script lee los 5 documentos desde `{carpeta_generada}/shards/` y genera `test-design.md` en la raíz de `{carpeta_generada}`.

**No mostrar output técnico del script al usuario.**

---

*(Note: `workflow_root` es `{project-root}/_siesa-agents/bmm/workflows/3-solutioning/quality-process`)*

---

## FASE 3 — REGISTRO AGILETEST

### Objetivo

Empujar el diseño de pruebas validado por el equipo QA a Jira/AgileTest. Crea automáticamente los artefactos de la herramienta: Requisitos (Stories BL → Tareas), Test Cases con Steps (Gherkin → Pasos), Planes de Prueba (PPR), Planes de Ejecución (PEP) y todos los links de trazabilidad. Requiere aprobación humana explícita antes de crear cualquier issue.

**Principio:** "La IA acelera, el humano dirige y autoriza."

---

### F3.1: Seleccionar Diseño a Registrar

**Buscar diseños disponibles:**

1. Listar todas las subcarpetas en `{implementation_artifacts}/quality-process/diseno/` con patrón `test-design-*`
2. Para cada carpeta encontrada, verificar que existe `test-design.md` en su raíz
3. Ordenar por nombre descendente (el timestamp garantiza orden cronológico — más reciente primero)

**Mostrar lista al usuario:**

```
📁 Diseños de prueba disponibles:

  1. test-design-YYYY-MM-DD-HHmmss/  ← más reciente
     • test-design.md ✅
     • test-cases.csv ✅

  2. test-design-YYYY-MM-DD-HHmmss/
     ...
```

Si solo hay uno, seleccionarlo automáticamente y notificar:
```
✅ Diseño seleccionado automáticamente (único disponible):
   {implementation_artifacts}/quality-process/diseno/test-design-YYYY-MM-DD-HHmmss/
```

Si hay más de uno, preguntar al usuario:
```json
{
  "questions": [
    {
      "question": "¿Qué diseño deseas registrar en AgileTest?",
      "header": "Selección de Diseño — Fase 3 Registro AgileTest",
      "multiSelect": false,
      "options": [
        { "label": "test-design-YYYY-MM-DD-HHmmss (más reciente)", "description": "N TCs — generado el DD/MM/YYYY" },
        { "label": "test-design-YYYY-MM-DD-HHmmss", "description": "N TCs — generado el DD/MM/YYYY" }
      ]
    }
  ]
}
```

**Almacenar:**
- `selected_design_folder` → ruta absoluta a la carpeta seleccionada
- `selected_test_design_path` → `{selected_design_folder}/test-design.md`

**Leer `test-design.md` y mostrar resumen rápido:**

```
📋 Diseño seleccionado:
  • Archivo:    {ruta relativa}/test-design.md
  • Features:   [extraer conteo de secciones ## F# del documento]
  • Stories BL: [extraer de Sección I — Gatekeeper]
  • Test Cases: [extraer de Sección IV — Matriz 360°]
  • CSV:        test-cases.csv — [N filas]
```

---

### F3.2: Validar Credenciales (Pre-flight)

Antes de ejecutar el dry-run, verificar que las credenciales están disponibles.
El script las busca en este orden de prioridad:
1. `_siesa-agents/bmm/config.secrets.yaml` (archivo local gitignoreado — forma recomendada)
2. Variables de entorno `JIRA_API_TOKEN`, `AGILETEST_CLIENT_ID`, `AGILETEST_CLIENT_SECRET`

**Leer `_siesa-agents/bmm/config.secrets.yaml` y verificar que los tokens no estén vacíos:**

```
📋 Estado de credenciales en _siesa-agents/bmm/config.secrets.yaml:
  jira_api_token:          [configurado ✅ | vacío ⚠️]
  agiletest_client_id:     [configurado ✅ | vacío ⚠️]
  agiletest_client_secret: [configurado ✅ | vacío ⚠️]
```

**Si todos están configurados:** continuar a F3.3.

**Si alguno está vacío**, mostrar instrucciones y DETENER:

```
⚠️  Faltan credenciales en _siesa-agents/bmm/config.secrets.yaml

Abre el archivo y completa los valores:

  agiletest:
    jira_api_token: "tu-token-aqui"
    agiletest_client_id: "tu-client-id"
    agiletest_client_secret: "tu-client-secret"

Dónde obtenerlos:
  • jira_api_token:          Jira → Profile → Security → API tokens → Create
  • agiletest_client_id/secret: AgileTest plugin en Jira → Settings → API Keys

El archivo ya está en .gitignore — es seguro guardar los tokens ahí.
Una vez completados, vuelve a ejecutar la Fase 3.
```

---

### F3.3: Dry-run — Vista Previa Obligatoria

**Ejecutar dry-run usando Bash tool:**

```bash
python {project-root}/_siesa-agents/scripts/bmad_to_agiletest.py \
  --input "{selected_test_design_path}" \
  --config "{project-root}/_bmad/bmm/config.yaml" \
  --dry-run
```

**Parsear la salida y presentar al usuario en tabla ordenada:**

```
📊 Vista previa — Lo que se creará en Jira/AgileTest:

  ┌──────────────────────────┬──────────┐
  │ Artefacto                │ Cantidad │
  ├──────────────────────────┼──────────┤
  │ Requisitos (Stories BL)  │    N     │
  │ Test Cases               │    N     │
  │   • P0 (Muy Alta)        │    N     │
  │   • P1 (Alta)            │    N     │
  │   • P2 (Media)           │    N     │
  │   • P3 (Baja)            │    N     │
  │ Planes de Prueba (PPR)   │    N     │
  │ Planes de Ejecución (PEP)│    N     │
  │ Links de trazabilidad    │  ~N      │
  │ Steps de prueba          │  ~N      │
  └──────────────────────────┴──────────┘

  📋 Distribución por Feature:
    F1 — [Nombre]: N TCs
    F2 — [Nombre]: N TCs
    ...

  🎯 Proyecto Jira: {jira_project_key}
  ⏱️  Tiempo estimado: ~5 minutos
```

---

### F3.4: Gate de Aprobación Humana (OBLIGATORIO)

Este paso es **no omisible**. No se crea ningún issue sin aprobación explícita.

**Preguntar al usuario usando AskUserQuestion:**

```json
{
  "questions": [
    {
      "question": "¿Apruebas la creación de estos N issues en Jira/AgileTest?",
      "header": "⚠️ Confirmación Requerida — Creación en AgileTest",
      "multiSelect": false,
      "options": [
        {
          "label": "✅ Aprobar y crear en AgileTest",
          "description": "Se crearán los N issues en el proyecto Jira. Esta acción es reversible (el script tiene modo --delete para limpiar)."
        },
        {
          "label": "🔍 Ver detalle de TCs antes de decidir",
          "description": "Mostrar cada TC con sus pasos antes de aprobar"
        },
        {
          "label": "❌ Cancelar — no crear nada",
          "description": "Salir sin crear issues en Jira/AgileTest"
        }
      ]
    }
  ]
}
```

**Si "Ver detalle":** Ejecutar con `--detail` y regresar a este mismo gate:

```bash
python {project-root}/_siesa-agents/scripts/bmad_to_agiletest.py \
  --input "{selected_test_design_path}" \
  --config "{project-root}/_bmad/bmm/config.yaml" \
  --dry-run --detail
```

Mostrar el detalle y volver a presentar el gate de aprobación.

**Si "Cancelar":** Notificar `❌ Operación cancelada. No se creó ningún issue.` y terminar el workflow.

**Si "Aprobar":** Continuar a F3.5.

---

### F3.5: Crear en AgileTest

**Notificar inicio:**

```
🚀 Iniciando creación en Jira/AgileTest...

  Proyecto: {jira_project_key}
  Input:    {ruta relativa}/test-design.md
  State:    {ruta relativa}/bmad_state_{feature_code}.json

  Progreso de los 8 pasos:
```

**Ejecutar el script usando Bash tool:**

```bash
python {project-root}/_siesa-agents/scripts/bmad_to_agiletest.py \
  --input "{selected_test_design_path}" \
  --config "{project-root}/_bmad/bmm/config.yaml" \
  --state-dir "{selected_design_folder}" \
  --create
```

**Mostrar el output del script en tiempo real.**

Si el script retorna un error:
- Mostrar el error completo
- Verificar si el state file fue creado (idempotencia: re-ejecutar es seguro)
- Sugerir acción correctiva según el tipo de error

---

### F3.6: Completion

Parsear la salida final del script y presentar al usuario:

```
✅ FASE 3 — REGISTRO AGILETEST COMPLETADO

  ┌──────────────────────────────┬──────────┬──────────────────────────┐
  │ Artefacto                    │ Cantidad │ Rango Jira               │
  ├──────────────────────────────┼──────────┼──────────────────────────┤
  │ Requisitos (Stories)         │    N     │ {KEY}-XXXX → {KEY}-YYYY  │
  │ Test Cases                   │    N     │ {KEY}-XXXX → {KEY}-YYYY  │
  │ Test Plans (PPR)             │    N     │ {KEY}-XXXX, ...          │
  │ Ejecuciones (PEP)            │    N     │ {KEY}-XXXX, ...          │
  │ Links Jira (TC→Req+Plan+Exec)│    N     │ —                        │
  │ Steps de prueba              │    N     │ —                        │
  └──────────────────────────────┴──────────┴──────────────────────────┘

  ⏱️  Tiempo total: ~5 minutos

  📋 Keys para el Dashboard Forge (Confluence):
    planKeys:  {lista de keys PPR separados por coma}
    execKeys:  {lista de keys PEP separados por coma}

  🔗 Verificar en AgileTest:
    {jira_base_url}/browse/{primer key PEP}

  💾 State file guardado en:
    {ruta relativa}/bmad_state_{feature_code}.json
    (Idempotente: re-ejecutar la Fase 3 con el mismo diseño es seguro)
```