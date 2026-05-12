---
name: 'step-07-validacion-guardado'
description: 'Validate Spanish user guide and save as single file'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/5-documentation/create-user-guide'

# File References
thisStepFile: '{workflow_path}/steps/step-07-validacion-guardado.md'
workflowFile: '{workflow_path}/workflow.md'
featuresOutputFolder: '{output_folder}/documentation-artifacts/user-guide'
# Validates each: {featuresOutputFolder}/{slug}-guide.md

# Loop reference (for corrections)
correctionTargetStep: '{workflow_path}/steps/step-05-generacion-espanol.md'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'

# Config
bmmConfig: '{project-root}/_bmad/bmm/config.yaml'
---

# Step 7: Validación y Guardado

## STEP GOAL:

Ejecutar validación comprehensiva (self-check) de cada archivo de feature generado (`{slug}-guide.md`), verificar cumplimiento de criterios de éxito por archivo, presentar resultados consolidados al usuario y permitir correcciones si es necesario. Si todo está correcto, marcar cada archivo como `approved` y actualizar `{workflowStateFile}`.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: When loading next step with 'C', ensure entire file is read
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are a quality assurance specialist and technical writer
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring quality validation expertise, user brings approval authority
- ✅ Maintain collaborative professional tone throughout

### Step-Specific Rules:

- 🎯 Focus ONLY on validation and finalization (PRESCRIPTIVE)
- 🚫 FORBIDDEN to skip validation checks
- 💬 Present clear validation results
- 🔄 Support loop back to step-05 if corrections needed

## EXECUTION PROTOCOLS:

- 🎯 Execute all validation checks systematically
- 💾 Only save/finalize with user approval
- 🔄 LOOP to step-05 if issues found and user requests fixes

## CONTEXT BOUNDARIES:

- Complete Spanish guide
- All frontmatter metrics
- This is final quality gate before delivery
- User has final approval authority

## TOP 5 NON-NEGOTIABLE CRITERIA:

1. **📄 Spanish Output Completo:** El archivo de guía existe, no está vacío y tiene todas las secciones requeridas
2. **🔗 Source Citations Obligatorias:** Every feature has citation
3. **📊 Diagramas Mermaid Completos:** Every feature/workflow has diagram
4. **📸 Screenshot Placeholders Presentes:** Correct format + Screenshot Index
5. **✅ Self-Check Pasado:** Completeness >= 90%, no TODOs

## EXECUTION SEQUENCE (PRESCRIPTIVE):

### 1. Announce Validation Start

"🔍 **Iniciando Validación Final**

Voy a ejecutar una verificación comprehensiva de la guía de usuario en español para asegurar que cumple todos los criterios de calidad.

**Criterios a Validar:**
1. Spanish output completo (archivo único)
2. Source citations obligatorias
3. Diagramas Mermaid completos
4. Screenshot placeholders presentes
5. Self-check de completitud

Este proceso tomará un momento..."

### 2. VALIDATION CHECK 1: Feature Files Completos

**Repeat for EACH feature file in `{workflowStateFile}.features_selected`:**

**Check 1.1: File Existence**
- `{slug}-guide.md` exists at `{featuresOutputFolder}`: {YES/NO}

**Check 1.2: File Non-Empty**
- File size: {bytes}
- Size > 5KB: {YES/NO}

**Check 1.3: Required Sections Present** (per feature file)

| Section | Present | Notes |
|---------|---------|-------|
| Funcionalidades | {✓/✗} | Sección principal de la feature |
| Flujos de Trabajo | {✓/✗} | |
| FAQ | {✓/✗} | |
| Glosario | {✓/✗} | |
| Índice de Capturas | {✓/✗} | |

Note: Introducción, Primeros Pasos, Conceptos Clave solo requeridos en el primer archivo.

**Result per file:** {PASS/FAIL}
**Overall Check 1 Result:** PASS only if ALL feature files pass

### 3. VALIDATION CHECK 2: Source Citations Obligatorias

**Check 2.1: Citation Presence**

Scan document for `[Source: F` pattern:
- Total source citations found: {count}
- From frontmatter.features_documented: {count}
- Citation ratio: {citations / features}

**Required:** Ratio >= 1.0 (at least one citation per feature)

**Check 2.2: Citation Format Validation**

For each citation:
- Matches pattern `[Source: F\d+ Story \d+\.\d+]`: {valid_count}/{total_count}
- All feature IDs reference selected features: {YES/NO}

**Check 2.3: No Invented Features**

- All features documented appear in analyzed epics: {YES/NO}
- No features without source: {YES/NO}

**Result:** {PASS/FAIL}

### 4. VALIDATION CHECK 3: Diagramas Mermaid Completos

**Check 3.1: Diagram Count**

Scan document for ```mermaid blocks:
- Total diagrams: {count}

**Check 3.2: Minimum Diagram Coverage**

From frontmatter:
- features_documented: {count}
- workflows_documented: {count}
- Expected minimum diagrams: {features + workflows}
- Actual diagrams: {count}
- Coverage: {actual >= expected}

**Check 3.3: Diagram Localization**

Sample 5 random diagrams:
- Diagrams use Spanish labels: {YES/NO}

**Result:** {PASS/FAIL}

### 5. VALIDATION CHECK 4: Screenshot Placeholders

**Check 4.1: Screenshot Format**

Scan document for `[Screenshot: ` pattern:
- Total screenshots: {count}

**Check 4.2: ID Format Validation**

For each screenshot placeholder:
- ID in UPPER_SNAKE_CASE: {valid_count}/{total_count}
- ID has valid prefix (FEATURE_/WORKFLOW_/UI_/ERROR_): {valid_count}/{total_count}
- All IDs are unique: {YES/NO}

**Check 4.3: Screenshot Index Validation**

- Screenshot Index section exists: {YES/NO}
- All placeholder IDs appear in index: {YES/NO}
- Index table format correct: {YES/NO}

**Result:** {PASS/FAIL}

### 6. VALIDATION CHECK 5: Self-Check Completitud

**Check 5.1: Feature Coverage**

From frontmatter.features_selected list:

- All selected features referenced in content: {YES/NO}
  {for each feature in features_selected}
  - {feature.id} — {feature.title}: {referenced count} times
  {end for}

**Check 5.2: No Incomplete Markers**

Scan both documents for:
- TODO markers: {count found} (should be 0)
- FIXME markers: {count found} (should be 0)
- [TBD] markers: {count found} (should be 0)
- Empty sections (## Header with no content): {count found}

**Check 5.3: Completeness Score Calculation**

Calculate score based on:
- All required sections present: {25 points if yes}
- All features have diagrams: {25 points if yes}
- All features have citations: {20 points if yes}
- Screenshot index complete: {15 points if yes}
- No incomplete markers: {15 points if yes}

**Completeness Score:** {total}/100

**Required:** Score >= 90

**Result:** {PASS/FAIL}

### 7. Compile Validation Report

**📊 VALIDATION REPORT**

```
=== USER GUIDE VALIDATION RESULTS ===

Project: {project_name}
Audience: {target_audience}
Output: {outputFile}
Date: {current_date}

CRITERIA 1: Spanish Output Completo
├─ File Existence: {PASS/FAIL}
├─ File Size: {PASS/FAIL}
└─ Required Sections: {PASS/FAIL}
   └─ Sections present: {sections_found}/8
Status: {✓ PASS / ✗ FAIL}

CRITERIA 2: Source Citations Obligatorias
├─ Citation Count: {count} citations for {features_count} features
├─ Citation Ratio: {ratio} (required: >= 1.0)
├─ Format Valid: {valid_count}/{total_count}
└─ Epic References Valid: {YES/NO}
Status: {✓ PASS / ✗ FAIL}

CRITERIA 3: Diagramas Mermaid Completos
├─ Diagram Count: {count}
├─ Minimum Coverage: {actual} >= {expected} required
└─ Spanish Labels: {YES/NO}
Status: {✓ PASS / ✗ FAIL}

CRITERIA 4: Screenshot Placeholders
├─ Placeholder Count: {count}
├─ ID Format: {valid_count}/{total_count} valid (UPPER_SNAKE_CASE)
├─ Screenshot Index: {EXISTS/MISSING}
└─ Index Completeness: {matched}/{total} IDs
Status: {✓ PASS / ✗ FAIL}

CRITERIA 5: Self-Check Completitud
├─ Feature Coverage: {covered_count}/{selected_count} features documented
├─ Incomplete Markers: {count} found (should be 0)
├─ Completeness Score: {score}/100 (required: >= 90)
Status: {✓ PASS / ✗ FAIL}

=== OVERALL RESULT ===

Criteria Passed: {passed_count}/5
Overall Status: {✅ APPROVED / ⚠️ NEEDS ATTENTION / ❌ FAILED}

{if issues found:}
=== ISSUES FOUND ===

{list all validation failures with specific details}

1. {Issue description}
   Location: {where}
   Required: {what's needed}

2. {Issue description}
   ...
{endif}
```

### 8. Present Validation Results to User

Display in Spanish (using `{communication_language}`):

"🔍 **Validación Completada**

{if all checks passed:}

✅ **¡Excelente! Todas las validaciones pasaron.**

Tu guía de usuario cumple con todos los criterios de calidad:

- ✓ Guía en español generada y completa
- ✓ {citations_count} source citations presentes ({ratio} por feature)
- ✓ {diagrams_count} diagramas Mermaid completos con labels en español
- ✓ {screenshots_count} screenshot placeholders con índice completo
- ✓ Completeness score: {score}/100 (excelente)

**Estadísticas Finales:**
- Features documentadas: {features_count}
- Workflows documentados: {workflows_count}
- Total páginas (aprox): {estimated_pages}
- Palabra count (aprox): {word_count}

¿Listo para guardar y finalizar?

{else:}

⚠️ **Atención: Se encontraron {issues_count} problemas que necesitan corrección.**

{Display issues list}

**Opciones:**
- Puedo intentar corregir estos problemas automáticamente (loop a step-05)
- O puedes revisar manualmente y volver a ejecutar el workflow

¿Qué prefieres hacer?

{endif}"

### 9. Update Completeness Score in Feature Files

For each feature file: update frontmatter with `completeness_score` and `review_status`.

### 10. Present FINAL MENU OPTIONS

**IF all validations passed:**

Display: **Select an Option:** [V] View Report [S] Save and Finalize

**IF validations failed:**

Display: **Select an Option:** [V] View Report [F] Fix Issues [S] Save Anyway (not recommended)

#### EXECUTION RULES:

- ALWAYS halt and wait for user input after presenting menu
- DO NOT proceed without explicit user choice
- After other menu items execution, return to this menu

#### Menu Handling Logic:

**Common options:**
- IF V: Display complete validation report in detail, return to menu
- IF A (if shown): Execute `{advancedElicitationTask}` for detailed issue analysis
- IF P (if shown): Execute `{partyModeWorkflow}` for collaborative review

**If ALL passed:**
- IF S: Proceed to finalization (section 11)

**If FAILED:**
- IF F: Collect issues, prepare corrections context, LOOP to `{correctionTargetStep}` with corrections
- IF S: Warn user, confirm, then proceed to finalization (not recommended)

### 11. Finalization Sequence (When User Selects [S] Save)

**11.1: Update Final Frontmatter**

For each feature file, update frontmatter:
```yaml
review_status: "approved"
last_modified: "{current_timestamp}"
```

**11.2: Save Files**

- Save each `{slug}-guide.md`

**11.3: Generate Completion Summary**

"✅ **¡Workflow Completado Exitosamente!**

**📦 Archivos Generados:**

{for each feature file}
- **{feature.id} — {feature.title}**
  - Ubicación: `{featuresOutputFolder}/{slug}-guide.md`
  - Acción: {action} (creado/actualizado)
  - Tamaño: {file_size}
{end for}

> 💡 Los archivos de feature son independientes y actualizables. Re-ejecuta el workflow para agregar nuevas features (se crean nuevos archivos) o actualizar las existentes (se modifican los archivos actuales).

**📊 Estadísticas Finales:**

| Métrica | Valor |
|---------|-------|
| Features documentadas | {features_count} |
| Workflows documentados | {workflows_count} |
| Diagramas Mermaid | {diagrams_count} |
| Screenshot placeholders | {screenshots_count} |
| Source citations | {citations_count} |
| Completeness score | {score}/100 |
| Palabras totales (aprox) | {word_count} |

**📋 Features Documentadas:**

{For each feature in features_selected:}
- {feature.id} — {feature.title} ✓ Documentada
{End for}

**✅ Próximos Pasos:**

1. Revisar la guía generada
2. Capturar las {screenshots_count} screenshots identificadas en el Screenshot Index
3. Reemplazar placeholders con screenshots reales
4. Revisar diagramas Mermaid y ajustar si es necesario
5. Al completar nuevos features, re-ejecutar el workflow para actualizar la guía

**¡Gracias por usar el generador de guías de usuario!**"

### 12. Workflow Complete

Workflow has finished successfully. No further steps.

---

## LOOP MECHANISM (If [F] Fix Issues Selected):

**When user selects [F] Fix Issues:**

1. **Prepare Corrections Context:**
   - Compile list of all validation issues
   - Identify which features/workflows need correction
   - Prepare specific instructions for fixes

2. **Hold Corrections in Memory:**
   - List all issues: description, location, fix needed

3. **Loop to step-05:**
   - Load, read entire file `{correctionTargetStep}`
   - Execute step-05 with corrections context
   - Step-05 will regenerate problematic sections
   - After step-05 completes, return directly to step-07 (this step) for re-validation
   - NOTE: Step-06 is DISABLED — do not load it

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All 5 validation checks executed against EACH feature file
- Validation report generated (consolidated + per-file)
- User presented with clear results
- IF issues: user offered fix or save options per file
- IF no issues: all feature files saved with `review_status: approved`
- Completion summary with per-file details displayed
- Workflow finished

### ❌ SYSTEM FAILURE:

- Validating a single combined file instead of per-feature files
- Skipping validation checks for any feature file
- Not calculating completeness score per file
- Saving without user approval
- Not updating feature file frontmatter to "approved"
- Writing to `_workflow-state.md` (forbidden — no state file)
- Not offering fix option when issues found

**Master Rule:** Skipping steps, optimizing sequences, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
