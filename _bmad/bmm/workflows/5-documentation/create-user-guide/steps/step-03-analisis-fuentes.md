---
name: 'step-03-analisis-fuentes'
description: 'Analyze selected feature files (PRD + epics) to extract content for user guide'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/5-documentation/create-user-guide'

# File References
thisStepFile: '{workflow_path}/steps/step-03-analisis-fuentes.md'
nextStepFile: '{workflow_path}/steps/step-04-elicitacion.md'
workflowFile: '{workflow_path}/workflow.md'

# Data Locations
featuresFolder: '{planning_artifacts}/prd'
epicsFolder: '{planning_artifacts}/epics'

# Config
bmmConfig: '{project-root}/_bmad/bmm/config.yaml'
---

# Step 3: Análisis de Fuentes

## STEP GOAL:

Para cada feature seleccionada en step-02, leer su archivo PRD (`prd/feature-*.md`) y su archivo de épica (`epics/epic-*.md`) si existe. Extraer: descripción de la feature, requisitos funcionales, key behaviors, historias de usuario, acceptance criteria y workflows identificados. Este es un step autónomo — el agente trabaja sin requerir input constante.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Step-Specific Rules:

- 🎯 Focus ONLY on reading and analyzing feature files (INTENT-BASED)
- 🚫 FORBIDDEN to generate user guide content yet (that happens in step-05)
- 💬 Work autonomously but provide progress updates por feature
- 📊 Extract: description, FRs, key behaviors, user stories, workflows, warnings

## EXECUTION PROTOCOLS:

- 🎯 Read ALL files for each selected feature before moving to the next
- 💾 Keep analysis results in memory (no state file)
- 🚫 FORBIDDEN to skip any selected feature

## CONTEXT BOUNDARIES:

- `frontmatter.features_selected` contains the list of features to analyze (set in step-02)
- Each entry has: id, slug, title, prd_file, epic_file (or null), has_epic
- Target audience: enduser (configured in step-01)
- Information extracted here feeds directly into step-04 and step-05

## EXECUTION APPROACH (INTENT-BASED):

This step uses INTENT-BASED execution. You have flexibility in HOW you analyze each file, but must accomplish the GOAL of building a complete picture of each feature's behavior and user-facing workflows.

### For each feature, extract:

1. **Feature Overview:**
   - What does this feature do for the end user?
   - What problem does it solve?
   - Feature ID and canonical name

2. **Key Behaviors (from PRD):**
   - What are the main behaviors users experience?
   - What are the UI interactions described?
   - What constraints or rules apply?

3. **Functional Requirements (from PRD):**
   - Which FRs are covered (FR1, FR2, etc.)?
   - Brief summary of each FR's user impact

4. **User Stories & Acceptance Criteria (from Epic, if exists):**
   - List of user stories (Story X.Y format)
   - Key acceptance criteria per story (GWT scenarios)
   - What "done" looks like from the user's perspective

5. **User Workflows (from Epic or PRD):**
   - Step-by-step processes users follow
   - Decision points and branching scenarios
   - Integration points with other features

6. **Warnings / Limitations:**
   - Known constraints (field limits, validation rules, etc.)
   - Behaviors that might surprise users

## EXECUTION SEQUENCE:

### 1. Announce Analysis Start

"🔍 **Iniciando Análisis de Features**

Voy a leer y analizar los archivos de cada feature seleccionada para extraer toda la información necesaria para la guía de usuario.

**Features a analizar:** {features_count}
{for each feature in features_selected}
- **{id}** — {title} {if has_epic: '(PRD + épica)' else: '(solo PRD)'}
{end for}

Esto puede tomar un momento. Te mantendré informado del progreso..."

### 2. Read General Context Documents

Before reading individual features, read these general documents if they exist:

- `{planning_artifacts}/prd/goals.md` → System purpose and strategic goals
- `{planning_artifacts}/prd/background-context.md` → Business context, target users
- `{planning_artifacts}/prd/user-interface-design-goals.md` → UI/UX principles

Extract: system name, overall purpose, target users description, UI principles.

**Progress update:** "✓ Contexto general leído"

### 3. Analyze Each Selected Feature

**Repeat for EACH feature in `frontmatter.features_selected`:**

#### 3a. Read PRD Feature File

Read complete `{planning_artifacts}/{feature.prd_file}`.

Extract:
- Feature ID and title (from H2 header)
- Feature description (introductory paragraphs)
- Mapped FRs (from FR table or list)
- Key Behaviors (from "Key Behaviors" section or equivalent)
- Any UI-specific behaviors or constraints mentioned

**Progress update:** "✓ {feature.id} PRD leído — {behaviors_count} key behaviors identificados"

#### 3b. Read Epic File (If Exists)

If `feature.has_epic == true`, read complete `{planning_artifacts}/{feature.epic_file}`.

Extract:
- Epic description and acceptance criteria (epic level)
- For each Story (Story X.Y):
  - Story title and user story text (As a... I want... So that...)
  - All GWT (Given/When/Then) scenarios → these become user workflows
  - Key acceptance criteria relevant to end users

**Progress update:** "✓ {feature.id} épica leída — {stories_count} historias, {workflows_count} workflows identificados"

#### 3c. Build Feature Summary

For each feature, compile:

```
feature_summary:
  id: "F1"
  title: "Captura & Descubrimiento de Leads"
  description: "[2-3 sentence description from PRD]"
  user_value: "[What value this gives end users]"
  key_behaviors: ["behavior 1", "behavior 2", ...]
  functional_requirements: ["FR1: ...", "FR2: ..."]
  user_stories:
    - id: "Story 1.1"
      title: "..."
      workflows: ["workflow description 1", "workflow description 2"]
  warnings_limitations: ["limitation 1", ...]
  source_prd: "prd/feature-{slug}.md"
  source_epic: "epics/epic-{slug}.md" (or null)
```

### 4. Synthesize Cross-Feature Context

After analyzing all features, identify:

- **User Roles:** All user roles mentioned across features
- **Common Patterns:** UI patterns repeated across features (e.g., CRUD, search/filter)
- **Feature Dependencies:** Which features reference or depend on others
- **Global Workflows:** Multi-feature workflows that span several features

### 5. Read Architecture (Optional but Recommended)

If `{planning_artifacts}/architecture.md` exists:
- Read it and extract: system architecture overview, key components, tech stack relevant to users

**Progress update:** "✓ Arquitectura leída"

### 6. Analysis Complete Message

"✅ **Análisis de Features Completado**

**Resumen del Análisis:**

| Feature | Behaviors | Historias | Workflows |
|---------|-----------|-----------|-----------|
{for each feature}
| {id} — {title} | {behaviors_count} | {stories_count} | {workflows_count} |
{end for}

**Totales:**
- Features analizadas: {features_count}
- Behaviors identificados: {total_behaviors}
- Historias de usuario: {total_stories}
- Workflows documentables: {total_workflows}

Todo el análisis está en memoria y listo para generación.

**Siguiente paso:** Configuración automática y generación de contenido."

### 7. Proceed Automatically

No menu in this step. After analysis is complete:
- Load, read entire file, then execute `{nextStepFile}` immediately (no pause)

## CRITICAL STEP COMPLETION NOTE

NO MENU in this step. Proceed automatically to `{nextStepFile}` once all features have been analyzed and context section is saved.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All selected feature PRD files read completely
- All available epic files read completely
- General context docs read (goals, background, UI goals)
- Feature summaries built in memory with: description, behaviors, stories, workflows
- Ready to proceed to step 4

### ❌ SYSTEM FAILURE:

- Skipping any selected feature file
- Not reading epic files when they exist
- Generating guide content (reserved for step-05)
- Writing to `_workflow-state.md` (forbidden — no state file)

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
