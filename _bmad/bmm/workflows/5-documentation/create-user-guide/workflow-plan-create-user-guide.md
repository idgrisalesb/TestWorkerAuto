---
stepsCompleted: [1, 2, 3, 4, 5, 6]
workflow_name: create-user-guide
workflow_type: document-building
target_module: bmm
target_phase: 5-documentation
plan_approved: true
output_format_approved: true
structure_design_approved: true
---

# Workflow Creation Plan: create-user-guide

## Initial Project Context

- **Workflow Name:** create-user-guide
- **Workflow Type:** document-building
- **Module:** bmm
- **Phase:** 5-documentation
- **Target Location:** `_bmad/bmm/workflows/5-documentation/create-user-guide/`
- **Created:** 2026-01-14

## Target Structure

```
_bmad/bmm/workflows/5-documentation/          ← FASE (documentation)
└── create-user-guide/                         ← WORKFLOW FOLDER (todo dentro aquí)
    ├── workflow.md                            ← Main workflow file
    ├── steps/                                 ← Steps folder
    │   ├── step-01-init.md
    │   ├── step-02-seleccion-epicas.md
    │   ├── step-03-analisis-fuentes.md
    │   ├── step-04-elicitacion.md
    │   ├── step-05-generacion-espanol.md
    │   ├── step-06-traduccion-ingles.md
    │   └── step-07-validacion-guardado.md
    ├── templates/                             ← Templates folder
    │   ├── user-guide-template-es.md
    │   └── user-guide-template-en.md
    └── data/                                  ← Data files folder
        ├── audience-types.csv
        ├── diagram-types.csv
        └── section-structure.csv
```

**Important:** ALL workflow files (workflow.md, steps/, templates/, data/) go inside the `create-user-guide/` folder

## Problem Statement

Generar guías de usuario comprehensivas en español e inglés desde épicas y PRDs, con diagramas Mermaid y trazabilidad completa.

## Target Users

Product Managers, Technical Writers y equipos de documentación que necesitan crear guías de usuario a partir de artefactos existentes del proyecto (PRDs, épicas, stories, arquitectura).

---

## WORKFLOW REQUIREMENTS (Gathered in Step 2)

### 1. Workflow Purpose and Scope

**Problem Solved:**
Generar guías de usuario comprehensivas en español e inglés desde épicas y PRDs, con diagramas Mermaid y trazabilidad completa. Elimina el dolor de crear documentación de usuario manualmente y asegura consistencia y completitud.

**Primary Users:**
- Product Managers
- Technical Writers
- Equipos de documentación

**Main Outcome:**
Guías de usuario bilingües (español/inglés) con:
- Diagramas Mermaid explicativos
- Screenshot placeholders con índice
- Source citations completas
- Estructura navegable

### 2. Workflow Type Classification

**Type:** Document Workflow
- Genera documentos como output principal ✓
- No es primariamente interactivo/coaching
- No es autónomo sin input humano
- No coordina otros workflows

### 3. Workflow Flow and Step Structure

**Step Count:** 7 steps

**Step Names:**
1. step-01-init
2. step-02-seleccion-epicas
3. step-03-analisis-fuentes
4. step-04-elicitacion
5. step-05-generacion-espanol
6. step-06-traduccion-ingles
7. step-07-validacion-guardado

**Flow Type:** Mayormente LINEAL con LOOP DE CORRECCIÓN opcional
- Linear progression: step-01 → step-02 → ... → step-07
- Correction loop: step-07 → step-05 (si se detectan problemas en validación)

**Decision Points:**
1. **step-01:** Decisión sobre guías existentes (crear/actualizar/reemplazar/cancelar)
2. **step-02:** Selección de épicas a incluir (todas/específicas/excluir)
3. **step-04:** Inclusión de sección troubleshooting (sí/no)
4. **step-07:** Validación OK → save / Issues → loop to step-05

**Optional Steps:** Ninguno (todos obligatorios)

**Optional Elements Within Steps:**
- Party Mode (disponible en todos los steps)
- Advanced options (disponible en todos los steps)
- Troubleshooting section (decidido en step-04)

**Logical Phases:**
Inicialización → Selección → Análisis → Elicitación → Generación → Validación

### 4. User Interaction Style

**Collaboration Level:** SEMI-COLABORATIVO (40% input usuario / 60% autónomo)

**Interaction Map:**

```
step-01 [🔴 ALTA COLABORACIÓN]
  ↓ Usuario decide: audiencia, acción sobre guías existentes

step-02 [🔴 ALTA COLABORACIÓN]
  ↓ Usuario selecciona: qué épicas incluir/excluir

step-03 [🟢 AUTÓNOMO]
  ↓ Agente lee y analiza artefactos (sin input usuario)

step-04 [🟡 COLABORACIÓN MEDIA]
  ↓ Usuario responde: exclusiones, nivel técnico, troubleshooting

step-05 [🟢 AUTÓNOMO con CHECKPOINTS]
  ↓ Agente genera contenido español (usuario puede revisar con [A])

step-06 [🟢 AUTÓNOMO con CHECKPOINTS]
  ↓ Agente traduce a inglés (usuario puede revisar con [A])

step-07 [🔴 ALTA COLABORACIÓN]
  ↓ Usuario valida y decide: guardar o corregir

Legend:
🔴 = Requiere input activo del usuario (DEBE pausar)
🟡 = Requiere input pero puede ser rápido
🟢 = Agente trabaja autónomamente (usuario puede supervisar)
```

**Critical Pause Points (MUST halt and wait for explicit confirmation):**
1. step-01: Después de presentar guías existentes
2. step-02: Después de presentar lista de épicas
3. step-04: Después de presentar funcionalidades identificadas
4. step-07: Después de self-check

**Workflow Adaptation to User Responses:**

**step-02 → posterior steps:**
- Si usuario excluye épicas → step-03 NO lee esas épicas
- Si usuario incluye solo 2 épicas → step-05 genera menos contenido
- Registro en frontmatter: `epics_selected: [1, 3, 5]`

**step-04 → step-05:**
- Si usuario dice "NO troubleshooting" → step-05 NO genera esa sección
- Si nivel técnico = "novice" → step-05 usa lenguaje más simple
- Si usuario menciona escenarios específicos → step-05 los incluye

**step-07 → loop:**
- Si validación falla → loop back to step-05 con correcciones
- Si validación OK → guardar y finalizar

### 5. Instruction Style (Intent-Based vs Prescriptive)

**Approach:** MIX (Prescriptive + Intent-Based)

| Step    | Style        | Justification                                                                      |
|---------|--------------|------------------------------------------------------------------------------------|
| step-01 | PRESCRIPTIVE | Decisión crítica sobre guías existentes, debe ser consistente y claro             |
| step-02 | PRESCRIPTIVE | Selección de épicas es crítica, necesita formato específico                       |
| step-03 | INTENT-BASED | Análisis flexible según artefactos disponibles                                    |
| step-04 | INTENT-BASED | Elicitación conversacional, se adapta a contexto                                  |
| step-05 | PRESCRIPTIVE | Generación con criterios estrictos (diagramas, citations, screenshots)            |
| step-06 | PRESCRIPTIVE | Traducción debe mantener estructura idéntica, criterios claros                    |
| step-07 | PRESCRIPTIVE | Validación con checklist específica, decisión clara                               |

**Prescriptive Example (step-02):**
```
EXECUTION SEQUENCE:
1. Scan docs/prd/ for files matching pattern: epic-*.md
2. For each epic file found:
   - Extract title from frontmatter or first H1
   - Add to list: "Epic [number]: [title]"
3. Display to user in Spanish:
   "He encontrado las siguientes épicas en el proyecto:
   - Epic 1: [título]
   - Epic 2: [título]
   ..."
4. Ask (exact text):
   "¿Cuáles épicas desea incluir en la guía de usuario?
   A) Todas las épicas
   B) Épicas específicas (proporcionar números separados por comas)
   C) Excluir épicas específicas (proporcionar números a excluir)"
5. Parse user response and store in frontmatter.epics_selected
6. HALT and show menu
```

**Intent-Based Example (step-04):**
```
STEP GOAL:
Elicit additional information from the user to refine the user guide scope and style.

EXECUTION APPROACH:
- Present the features identified from selected epics in a clear, organized manner
- Engage in conversational elicitation to understand:
  · Which features should be excluded or de-prioritized
  · Critical scenarios that need detailed documentation
  · Technical competency level of target audience
  · Known limitations or warnings users should be aware of
  · Whether troubleshooting section is needed
- Adapt your questions based on user responses and project context
- Use Party Mode if deeper discussion is needed with PM/UX agents
- Record all preferences in frontmatter for use in generation steps
```

### 6. Input Requirements

**Validation Strategy (step-01):**

**1. Scan Locations (in priority order):**

A) BMAD 6 locations:
   - `{planning_artifacts}/prd-*.md`
   - `{planning_artifacts}/architecture-*.md`
   - `{implementation_artifacts}/epic-*.md`

B) BMAD 4 locations (legacy):
   - `docs/prd/*.md`
   - `docs/architecture/*.md`

C) Custom locations:
   - `{project_knowledge}/**/*.md`

**2. Validate Mandatory Files:**

✓ At least 1 PRD file found
✓ At least 1 epic-*.md file found
✓ (Optional) core-workflows.md or similar

**3. Strategy if Files Missing:**

**If NO PRD found:**
- WARN: "No se encontraron documentos PRD en las ubicaciones esperadas"
- ASK: "¿Desea especificar una ubicación alternativa o continuar sin PRD?"
- OPTIONS:
  - A) Especificar path alternativo
  - B) Continuar sin PRD (documentar solo desde épicas)
  - C) Cancelar workflow

**If NO epics found:**
- CRITICAL ERROR: "No se encontraron épicas. Este workflow requiere épicas para documentar."
- SUGGEST: "Ejecute primero create-epics-and-stories o cree épicas manualmente"
- ABORT workflow

**If optional files missing:**
- INFO: "No se encontró [archivo]. La guía se generará sin esta información."
- CONTINUE normally

**Additional Useful Inputs (not mandatory):**

1. **Test suites:** `tests/**/*.test.{js,ts,py}` - Para documentar expected behaviors
2. **README.md** - Para contexto general y setup instructions
3. **CHANGELOG.md** - Para features recientes y versioning
4. **API documentation:** `docs/api/*.md` - Para guías de API consumers
5. **Existing screenshots:** `docs/images/**/*.png` - Para reutilizar en lugar de placeholders
6. **Previous user guides** - Para mantener consistencia de estilo

### 7. Output Specifications

**Primary Outputs:**
- `docs/user-guide/es/{audience}-guide.md` (Spanish version)
- `docs/user-guide/en/{audience}-guide.md` (English version)
- `docs/user-guide/index.md` (language selector)

**Output Timeline:**

| Step    | Output Action                                                                  |
|---------|--------------------------------------------------------------------------------|
| step-01 | Create outputFile with initial frontmatter                                     |
| step-02 | Update frontmatter with selected epics                                         |
| step-03 | Append "## Contexto del Proyecto" to Spanish outputFile                       |
| step-04 | Update frontmatter with user preferences                                       |
| step-05 | Append all main sections (Spanish): Intro, Features, Workflows, FAQ, etc.     |
| step-06 | Create English outputFile and generate translated content                     |
| step-07 | Validate, optionally correct, finalize; create/update index.md                |

**Save Strategy:**

**Incremental Auto-Save:**
- Each step that modifies document → SAVES automatically
- Append-only pattern: document grows progressively
- User sees progress in real-time

**Final Confirmation (Manual):**
- step-07 requires explicit confirmation [S] Save before finalizing
- Allows correction loop without losing work

**Review Checkpoints:**

**Checkpoint 1 (step-05, after Spanish generation):**
- [A] Advanced - Review/edit specific section
- [P] Party Mode - Collaborative review with tech-writer/pm
- [C] Continue - Proceed to translation

**Checkpoint 2 (step-06, after translation):**
- [A] Advanced - Review/edit translation
- [P] Party Mode - Validate translation quality
- [C] Continue - Proceed to validation

**Checkpoint 3 (step-07, after validation):**
- [V] Validate - View self-check results
- [F] Fix Issues - Correct problems (loop to step-05)
- [S] Save - Save and finalize

**Screenshot Index:**
- Part of main document (not separate file)
- Generated in step-05 (Spanish) and step-06 (English)
- Location: Last section before Appendix

Format:
```markdown
## Screenshot Index / Índice de Capturas de Pantalla

| ID | Ubicación | Descripción | Estado |
|----|-----------|-------------|--------|
| FEATURE_AUTH_LOGIN | Sección 4.1 | Pantalla de login | Pendiente |
```

### 8. Success Criteria

**TOP 5 NON-NEGOTIABLE CRITERIA:**

**1. 📄 BILINGUAL OUTPUT COMPLETO**
- ✓ Both versions (es/ and en/) generated
- ✓ Identical structure in both languages
- ✓ Same number of sections and subsections

VALIDATION:
- Count headers in both files → must match
- Verify both files exist and are non-empty

**2. 🔗 SOURCE CITATIONS OBLIGATORIAS**
- ✓ Each feature has `[Source: Epic X Story Y]`
- ✓ Each workflow has source citation
- ✓ NO invented functionalities

VALIDATION:
- Regex search for `[Source: Epic \d+ Story \d+]`
- Count citations vs features → ratio >= 1.0
- Verify all epic numbers referenced actually exist

**3. 📊 DIAGRAMAS MERMAID COMPLETOS**
- ✓ Each feature has Mermaid diagram
- ✓ Each workflow has Mermaid diagram
- ✓ Diagrams localized (Spanish in es/, English in en/)

VALIDATION:
- Search for ```mermaid blocks
- Count diagrams >= count of features + workflows
- Verify diagram labels are in correct language

**4. 📸 SCREENSHOT PLACEHOLDERS PRESENTES**
- ✓ Screenshot placeholders with correct format
- ✓ Unique IDs in UPPER_SNAKE_CASE
- ✓ Complete Screenshot Index at end of document

VALIDATION:
- Regex search for `\[Screenshot: [A-Z_]+ - .*\]`
- Verify Screenshot Index table exists
- Cross-check: IDs in document match IDs in index

**5. ✅ SELF-CHECK PASADO**
- ✓ All selected epics are documented
- ✓ No empty or incomplete sections
- ✓ Complete frontmatter with metrics

VALIDATION:
- frontmatter.epics_selected all referenced in content
- No TODO or FIXME markers in final document
- frontmatter.completeness_score >= 90%

**Secondary Criteria (Important but don't block save):**
6. Troubleshooting section (if requested)
7. FAQ with at least 5 questions
8. Glossary with key terms defined
9. Language selector index.md created/updated
10. User confirmed language appropriate for audience

---

## TOOLS CONFIGURATION (Configured in Step 3)

### Core BMAD Tools

**Party-Mode:** ✅ INCLUDED
- **Integration Points:** Available as menu option [P] in all steps (01-07)
- **Purpose:** Collaborative discussion with other BMAD agents (PM, Analyst, UX Designer, Tech Writer)
- **Use Cases:**
  - step-01: Discuss documentation strategy
  - step-02: Prioritize epics with PM/Analyst
  - step-03: Analyze context with Analyst/PM
  - step-04: Discuss use cases with PM/UX
  - step-05: Collaborative content review
  - step-06: Translation quality validation
  - step-07: Final review and validation

**Advanced Elicitation:** ✅ INCLUDED
- **Integration Points:** Available as menu option [A] in all steps (01-07)
- **Purpose:** Deep dive into specific aspects using Socratic questioning and counterfactual analysis
- **Use Cases:**
  - step-01: Deep configuration and path exploration
  - step-02: Detailed epic analysis before selection
  - step-03: Deep dive into specific artifacts
  - step-04: Profundizar en escenarios específicos
  - step-05: Review/edit specific sections in detail
  - step-06: Review/edit translation details
  - step-07: Detailed validation and issue analysis

**Brainstorming:** ❌ NOT INCLUDED
- **Reason:** Not needed - workflow has clear structure and content is derived from existing artifacts (PRDs, epics), not creative ideation

### LLM Features

**File I/O:** ✅ INCLUDED (CRITICAL)
- **Operations Required:**
  - **READ:** PRD files, epic files, architecture docs, workflow docs
  - **WRITE:** Spanish user guide, English user guide, index.md
  - **UPDATE:** Append content incrementally to guide documents
- **File Locations:**
  - Input: `{planning_artifacts}/*.md`, `{implementation_artifacts}/epic-*.md`, `docs/prd/*.md`, `docs/architecture/*.md`
  - Output: `docs/user-guide/es/{audience}-guide.md`, `docs/user-guide/en/{audience}-guide.md`, `docs/user-guide/index.md`

**Web-Browsing:** ❌ NOT INCLUDED
- **Reason:** All content is derived from existing project artifacts; no need for real-time web data

**Sub-Agents:** ❌ NOT INCLUDED
- **Reason:** Workflow steps are sequential and interdependent; parallel processing not needed

**Sub-Processes:** ❌ NOT INCLUDED
- **Reason:** Workflow is primarily sequential with manageable processing time; no long-running parallel operations needed

### Memory Systems

**Sidecar File:** ✅ INCLUDED
- **Purpose:** Enable workflow resumability between sessions
- **Use Cases:**
  - User can pause after step-05 (Spanish generation) and resume later for translation
  - User can pause during step-07 corrections and resume workflow
  - Maintain progress for large projects with many epics
- **State Tracked:**
  - Current step position
  - Selected epics and user preferences
  - Generated content progress
  - Validation results
- **File Location:** `{bmb_creations_output_folder}/workflows/create-user-guide/.sidecar-create-user-guide.yaml`

**Vector Database:** ❌ NOT INCLUDED
- **Reason:** Not needed for v1; no requirement for semantic search across workflow history

### External Integrations

**Git Integration:** ❌ NOT INCLUDED
- **Reason:** User can commit generated guides manually; automatic commits not required for v1

**Context-7 / Playwright / Database Connectors:** ❌ NOT INCLUDED
- **Reason:** Not applicable to documentation generation workflow

### Installation Requirements

**Tools Requiring Installation:** NONE
- All selected tools (File I/O, Party-Mode, Advanced Elicitation, Sidecar File) are built into BMAD Core
- No external dependencies or installations required

**User Installation Preference:** N/A
- No installations needed

### Tools Configuration Summary

**✅ Included Tools (4):**
1. File I/O (LLM feature - critical)
2. Party-Mode (BMAD workflow)
3. Advanced Elicitation (BMAD workflow)
4. Sidecar File (Memory system)

**❌ Excluded Tools (6):**
1. Brainstorming
2. Web-Browsing
3. Sub-Agents
4. Sub-Processes
5. Git Integration
6. Vector Database

**Installation Requirements:** None - all tools are BMAD built-ins

---

## OUTPUT FORMAT DESIGN (Designed in Step 5)

### Format Type

**Selected Format:** STRUCTURED

- Document type: Technical Documentation (User Guide)
- File format: Markdown (.md)
- Frequency: Single document per audience (with bilingual versions)
- Consistency: Cross-document identical structure required

### Structure Specifications

**Required Sections (9 obligatory):**

1. **Frontmatter (YAML)** - Workflow metadata and tracking
2. **Introduction** - Product overview, target audience, guide usage
3. **Getting Started** - Prerequisites, setup, system access, interface overview
4. **Core Concepts** - Key terminology, main concepts, user roles
5. **Features and How to Use Them** - Feature descriptions with diagrams, screenshots, source citations
6. **Common Workflows** - Step-by-step workflows with diagrams and screenshots
7. **FAQ** - Frequently asked questions
8. **Glossary** - Terms and definitions
9. **Screenshot Index** - Consolidated table of all screenshot placeholders

**Optional Sections (2 conditional):**

10. **Troubleshooting** - Common issues and solutions (decided in step-04)
11. **Appendix** - Quick reference tables, keyboard shortcuts, additional resources (if relevant)

**Section Ordering Rules:**

- Sections 1-9: FIXED order (cannot be changed)
- Troubleshooting: Goes between FAQ and Glossary (if included)
- Appendix: Goes after Screenshot Index (if included)

### Cross-Document Consistency Requirements

**Bilingual Consistency (Spanish/English):**

1. **Identical Structure:**
   - Spanish (es/) and English (en/) versions must have EXACTLY the same sections
   - Same number of headers (H1, H2, H3, H4)
   - Same number of Mermaid diagrams
   - Same number of screenshot placeholders

2. **Non-Translatable Elements:**
   - Source citations: `[Source: Epic X Story Y]` → remain unchanged
   - Screenshot IDs: `FEATURE_AUTH_LOGIN` → remain unchanged
   - Frontmatter keys → remain in English

3. **Localized Elements:**
   - All textual content
   - Mermaid diagram labels
   - Screenshot descriptions
   - Section headers

### Format Standards

**Header Format:**

```markdown
# [Product Name] User Guide          ← H1 (main title only)
## Introduction                       ← H2 (main sections)
### What is [Product]?                ← H3 (subsections)
#### Creating a New Credential        ← H4 (specific procedures)
```

**Diagram Format:**

- **Syntax:** Mermaid code blocks
- **Location:** Immediately after feature/workflow description
- **Labels:** Localized according to document language
- **Allowed Types:** flowchart, sequenceDiagram, stateDiagram-v2, journey

**Screenshot Placeholder Format:**

```markdown
[Screenshot: IDENTIFIER - Description]

Where:
- IDENTIFIER = UPPER_SNAKE_CASE with prefix (FEATURE_, WORKFLOW_, UI_, ERROR_)
- Description = Specific in document language
```

**Source Citation Format:**

```markdown
[Source: Epic X Story Y]
[Source: Epic X Story Y, Epic Z Story W]
[Source: PRD - section-name]
```

### Frontmatter Structure (YAML)

```yaml
---
# Workflow state
stepsCompleted: []
currentStep: step-01-init
workflow_name: create-user-guide
workflow_version: 1.0.0

# Project context
project_name: ""
generated_date: ""
last_modified: ""

# Configuration
target_audience: ""          # enduser / admin / api / mixed
output_language: ""           # es / en
epics_selected: []           # [1, 3, 5]
epics_excluded: []           # [2, 4]

# Source artifacts discovered
source_artifacts:
  prd_docs: []
  epic_files: []
  architecture_docs: []
  workflow_docs: []

# Content tracking
features_documented: 0
workflows_documented: 0
diagrams_generated: 0
screenshot_placeholders: 0

# Quality metrics
source_citations_count: 0
completeness_score: 0
review_status: "draft"        # draft / reviewed / approved

# User preferences
technical_level: ""           # novice / intermediate / mixed
include_troubleshooting: false
additional_scenarios: []

# Bilingual output
spanish_version: ""           # path to es/ file
english_version: ""           # path to en/ file
translation_completed: false
---
```

### Template Information

**Templates to Create:**

1. **user-guide-template-es.md**
   - Complete structure in Spanish
   - Placeholders: `{{project_name}}`, `{{generated_date}}`, `{{audience}}`
   - All sections with Spanish headers
   - Location: `{targetWorkflowPath}/templates/user-guide-template-es.md`

2. **user-guide-template-en.md**
   - Same structure as Spanish template
   - All sections and headers in English
   - Same placeholders
   - Location: `{targetWorkflowPath}/templates/user-guide-template-en.md`

### Data Files (CSV)

**1. audience-types.csv**

Purpose: Define target audience types and filename patterns

```csv
audience_id,audience_name_es,audience_name_en,description_es,description_en,filename_prefix
enduser,Usuarios Finales,End Users,"Usuarios que interactúan con la aplicación","Users who interact with the application",enduser-guide
admin,Administradores,Administrators,"Usuarios que gestionan el sistema","Users who manage the system",admin-guide
api,Consumidores de API,API Consumers,"Desarrolladores que integran con el sistema","Developers who integrate with the system",api-guide
mixed,Audiencia Mixta,Mixed Audience,"Usuarios finales y administradores","End users and administrators",complete-guide
```

**2. diagram-types.csv**

Purpose: Define Mermaid diagram types for different content

```csv
content_type,diagram_type,mermaid_syntax,use_case_es,use_case_en
feature_overview,flowchart,"flowchart LR","Mostrar componentes y relaciones","Show components and relationships"
user_workflow,flowchart,"flowchart TD","Proceso paso a paso con decisiones","Step-by-step process with decisions"
sequential_process,sequenceDiagram,"sequenceDiagram","Interacciones usuario-sistema","User-system interactions"
state_changes,stateDiagram-v2,"stateDiagram-v2","Cambios de estado de datos","Data state changes"
user_journey,journey,"journey","Experiencia del usuario","User experience across touchpoints"
```

**3. section-structure.csv**

Purpose: Define section order and requirements

```csv
section_id,section_name_es,section_name_en,description,required
1,Introducción,Introduction,"What is the product, who is this guide for, how to use it",true
2,Primeros Pasos,Getting Started,"Prerequisites, setup, accessing system, interface overview",true
3,Conceptos Clave,Core Concepts,"Key terminology, main concepts, user roles",true
4,Funcionalidades,Features and How to Use Them,"Feature descriptions with diagrams and screenshots",true
5,Flujos de Trabajo,Common Workflows,"Step-by-step workflows with diagrams",true
6,Solución de Problemas,Troubleshooting,"Common issues and solutions",false
7,Preguntas Frecuentes,FAQ,"Frequently asked questions",true
8,Glosario,Glossary,"Terms and definitions",true
9,Índice de Capturas,Screenshot Index,"Table of all screenshot placeholders",true
```

### Special Considerations

**Validation Requirements:**

- Bilingual output must have identical structure (header count, diagram count, screenshot count)
- All features must have source citations
- All features and workflows must have Mermaid diagrams
- Screenshot Index must consolidate all placeholders
- Frontmatter completeness_score must be >= 90%

**Accessibility Requirements:**

- Clear header hierarchy (H1 → H2 → H3 → H4)
- Descriptive screenshot placeholders for screen readers
- Mermaid diagrams with clear labels
- Glossary for technical terms

**Quality Standards:**

- No TODO or FIXME markers in final output
- All source citations must reference existing epic/story files
- Diagrams must be valid Mermaid syntax
- Screenshot IDs must be unique and follow naming convention

---

## WORKFLOW STRUCTURE DESIGN (Designed in Step 6)

### Step Structure

**Total Steps:** 8 (including continuation support)

1. **step-01-init.md** - Initialization with continuation detection
2. **step-01b-continue.md** - Resume workflow from saved state
3. **step-02-seleccion-epicas.md** - Epic selection (PRESCRIPTIVE)
4. **step-03-analisis-fuentes.md** - Artifact analysis (INTENT-BASED)
5. **step-04-elicitacion.md** - Information elicitation (INTENT-BASED)
6. **step-05-generacion-espanol.md** - Spanish content generation (PRESCRIPTIVE)
7. **step-06-traduccion-ingles.md** - English translation (PRESCRIPTIVE)
8. **step-07-validacion-guardado.md** - Validation and save (PRESCRIPTIVE)

**Flow:** Linear with optional loop (step-07 → step-05 for corrections)

**Continuation Support:** YES (step-01b-continue.md for resumability)

### Interaction Patterns by Step

| Step | Collaboration Level | Menu Options | Pause Required |
|------|---------------------|--------------|----------------|
| 01 | 🔴 High | [A] [P] [C] | Yes - after audience selection |
| 01b | 🟡 Medium | [R] [M] [C] | Yes - review progress |
| 02 | 🔴 High | [A] [P] [R] [C] | Yes - after epic selection |
| 03 | 🟢 Autonomous | [A] [P] [R] [C] | No - autonomous work |
| 04 | 🟡 Medium | [A] [P] [C] | Yes - after elicitation |
| 05 | 🟢 Autonomous | [A] [P] [C] | No - checkpoints available |
| 06 | 🟢 Autonomous | [A] [P] [C] | No - checkpoints available |
| 07 | 🔴 High | [V] [F] [S] | Yes - after validation |

### Data Flow Map

```
step-01-init
  ├─ INPUT: config.yaml, existing guides scan
  ├─ OUTPUT → frontmatter: target_audience, output_language, generated_date
  └─ CREATE: outputFile (es/[audience]-guide.md) with initial frontmatter

step-01b-continue (if resuming)
  ├─ INPUT: sidecar file (.sidecar-create-user-guide.yaml)
  ├─ OUTPUT: load previous state
  └─ JUMP: to appropriate step based on stepsCompleted

step-02-seleccion-epicas
  ├─ INPUT: frontmatter from step-01
  ├─ PROCESS: scan epic-*.md files
  └─ OUTPUT → frontmatter: epics_selected, epics_excluded, source_artifacts.epic_files

step-03-analisis-fuentes
  ├─ INPUT: frontmatter.epics_selected, PRD/architecture files
  ├─ PROCESS: read and analyze artifacts
  ├─ OUTPUT → frontmatter: source_artifacts (prd_docs, architecture_docs, workflow_docs)
  └─ APPEND → outputFile: "## Contexto del Proyecto" section

step-04-elicitacion
  ├─ INPUT: frontmatter from step-03
  ├─ PROCESS: conversational elicitation
  └─ OUTPUT → frontmatter: technical_level, include_troubleshooting, additional_scenarios

step-05-generacion-espanol
  ├─ INPUT: frontmatter (all data from steps 01-04), source_artifacts
  ├─ PROCESS: generate Spanish content with Mermaid diagrams, screenshots, citations
  ├─ APPEND → outputFile: all main sections (Introduction → Screenshot Index)
  └─ OUTPUT → frontmatter: features_documented, workflows_documented, diagrams_generated,
                           screenshot_placeholders, source_citations_count

step-06-traduccion-ingles
  ├─ INPUT: outputFile (Spanish version), frontmatter
  ├─ PROCESS: translate maintaining identical structure
  ├─ CREATE: en/[audience]-guide.md
  └─ OUTPUT → frontmatter: english_version, spanish_version, translation_completed

step-07-validacion-guardado
  ├─ INPUT: both output files (es/ and en/), frontmatter
  ├─ PROCESS: self-check validation (headers, diagrams, screenshots, citations)
  ├─ OUTPUT: validation report
  ├─ IF [S] Save: update frontmatter (review_status: "approved"), CREATE index.md, FINALIZE
  └─ IF [F] Fix: LOOP → step-05 with corrections list
```

### State Persistence (Sidecar File)

**Location:** `_bmad-output/bmb-creations/workflows/create-user-guide/.sidecar-create-user-guide.yaml`

**Content Structure:**
```yaml
workflow_name: create-user-guide
current_step: step-05-generacion-espanol
steps_completed: [1, 2, 3, 4]
last_updated: "2026-01-14T15:30:00Z"

# Context restoration
target_audience: enduser
epics_selected: [1, 3, 5]
technical_level: intermediate
include_troubleshooting: true

# Output paths
spanish_output: "docs/user-guide/es/enduser-guide.md"
english_output: "docs/user-guide/en/enduser-guide.md"

# Progress
features_documented: 8
workflows_documented: 3
```

### File Structure Design

```
_bmad/bmm/workflows/5-documentation/create-user-guide/
├── workflow.md                           ← Main workflow configuration
│
├── steps/                                ← Step files (8 total)
│   ├── step-01-init.md
│   ├── step-01b-continue.md
│   ├── step-02-seleccion-epicas.md
│   ├── step-03-analisis-fuentes.md
│   ├── step-04-elicitacion.md
│   ├── step-05-generacion-espanol.md
│   ├── step-06-traduccion-ingles.md
│   └── step-07-validacion-guardado.md
│
├── templates/                            ← Template files (2 total)
│   ├── user-guide-template-es.md
│   └── user-guide-template-en.md
│
└── data/                                 ← CSV data files (3 total)
    ├── audience-types.csv               ← 4 audience types
    ├── diagram-types.csv                ← 5 diagram types
    └── section-structure.csv            ← 9 sections
```

### Path Variables (for step files)

```yaml
# Workflow paths
workflow_path: '{project-root}/_bmad/bmm/workflows/5-documentation/create-user-guide'
thisStepFile: '{workflow_path}/steps/step-[N]-[name].md'
nextStepFile: '{workflow_path}/steps/step-[N+1]-[name].md'
workflowFile: '{workflow_path}/workflow.md'

# Output files (created during execution)
outputFileSpanish: 'docs/user-guide/es/{audience}-guide.md'
outputFileEnglish: 'docs/user-guide/en/{audience}-guide.md'
indexFile: 'docs/user-guide/index.md'

# Templates
templateSpanish: '{workflow_path}/templates/user-guide-template-es.md'
templateEnglish: '{workflow_path}/templates/user-guide-template-en.md'

# Data files
audienceTypesData: '{workflow_path}/data/audience-types.csv'
diagramTypesData: '{workflow_path}/data/diagram-types.csv'
sectionStructureData: '{workflow_path}/data/section-structure.csv'

# Core workflows
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'

# Config
bmmConfig: '{project-root}/_bmad/bmm/config.yaml'
```

### Special Mechanisms

**Continuation Detection (step-01-init):**
```
1. Check if outputFile exists with frontmatter.stepsCompleted not empty
2. IF YES: Load step-01b-continue.md (resume from saved state)
3. IF NO: Continue with normal initialization
```

**Loop Mechanism (step-07 → step-05):**
```
In step-07, menu option [F] Fix Issues:
1. Collect list of validation issues
2. Store corrections in sidecar
3. Load step-05-generacion-espanol.md with corrections context
4. Re-generate affected sections
5. Return to step-07 for validation
```

**Progress Tracking (all steps):**
```
Before loading next step:
1. Update frontmatter.stepsCompleted (add current step number)
2. Update frontmatter.currentStep (set to next step name)
3. Update frontmatter.last_modified (timestamp)
4. Save outputFile
5. Update sidecar file
```

### Menu Options Standard

**All steps include:**
- `[A]` Advanced - Deep dive using Advanced Elicitation workflow
- `[P]` Party Mode - Collaborative discussion with other BMAD agents
- `[C]` Continue - Proceed to next step

**Additional options per step:**
- step-01b: `[R]` Review Progress, `[M]` Modify
- step-02: `[R]` Refresh (re-scan epics)
- step-03: `[R]` Re-scan (re-scan artifacts)
- step-07: `[V]` Validate, `[F]` Fix Issues, `[S]` Save

---

## Next Steps

Workflow structure design complete. Ready to proceed to workflow build phase.
