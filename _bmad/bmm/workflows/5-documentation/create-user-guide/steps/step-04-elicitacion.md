---
name: 'step-04-elicitacion'
description: '[SKIPPED] Elicitation is bypassed — default values for end users applied automatically'
status: 'SKIPPED'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/5-documentation/create-user-guide'

# File References
thisStepFile: '{workflow_path}/steps/step-04-elicitacion.md'
nextStepFile: '{workflow_path}/steps/step-05-generacion-espanol.md'
workflowFile: '{workflow_path}/workflow.md'

# Config
bmmConfig: '{project-root}/_bmad/bmm/config.yaml'
---

# Step 4: Elicitación de Información

## ⚡ STEP SKIPPED — DEFAULT VALUES APPLIED

Este step está **omitido**. No se hacen preguntas al usuario.
Se aplican automáticamente los valores por defecto orientados a **usuarios finales del aplicativo**.

---

## DEFAULT VALUES (Apply in memory without asking)

```yaml
# User preferences — defaults for end users
technical_level: "intermediate"        # Business users comfortable with technology
include_troubleshooting: true          # Always useful for end users
additional_scenarios: []               # Use scenarios found naturally in epics/PRD
features_to_exclude: []                # Include all selected features
features_to_prioritize: []             # No specific prioritization
known_limitations: []                  # Use limitations documented in PRD/epics
critical_warnings: []                  # Use warnings documented in PRD/epics
```

### Rationale (for content generation guidance in step-05):

- **technical_level: intermediate** → Los usuarios son profesionales de negocio (ej: ejecutivos de ventas) cómodos con aplicaciones de software, pero sin perfil técnico. Usar lenguaje claro, directo, con pasos concretos. No asumir conocimiento técnico profundo.
- **include_troubleshooting: true** → Incluir sección de Solución de Problemas con los errores y limitaciones más comunes del sistema.
- **Scope completo** → Documentar todas las features seleccionadas sin exclusiones ni priorizaciones especiales.
- **Escenarios** → Usar los casos de uso y workflows que emerjan del análisis de épicas y PRD en step-03.
- **Limitaciones y advertencias** → Extraer directamente de los archivos PRD y épicas analizados en step-03.

---

## EXECUTION SEQUENCE:

### 1. Apply Defaults (In Memory)

Hold the default values above in memory for use in step-05.

### 2. Notify User (brief)

Display:

"⚡ **Configuración automática aplicada**

Generando la guía con configuración optimizada para usuarios finales:
- Nivel técnico: Intermedio
- Alcance: Todas las features seleccionadas
- Troubleshooting: Incluido

Continuando a generación de contenido..."

### 3. Proceed

- Load, read entire file, then execute `{nextStepFile}` immediately (no menu, no pause)

---

## ORIGINAL ELICITATION QUESTIONS (Reference — NOT shown to user)

<!-- Kept for reference. These were the original questions before this step was skipped:

1. Feature Scope Refinement:
   - ¿Hay features a excluir, priorizar o agregar?
   → Default: include all, no exclusions, no prioritization

2. Critical Use Cases:
   - ¿Cuáles son los 3–5 casos de uso más importantes?
   → Default: use all workflows found in epics/PRD

3. Technical Level:
   - ¿Novato / Intermedio / Avanzado / Mixto?
   → Default: intermediate

4. Known Limitations & Warnings:
   - ¿Limitaciones conocidas? ¿Advertencias críticas?
   → Default: extract from PRD/epics documentation

5. Troubleshooting Section:
   - ¿Incluir sección de Solución de Problemas?
   → Default: true
-->

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- Default values held in memory
- User notified briefly
- Proceeded immediately to step-05 without pausing

### ❌ SYSTEM FAILURE:

- Asking the user any of the original elicitation questions
- Pausing and waiting for user input
- Not writing defaults to frontmatter before proceeding

**Master Rule:** This step MUST be transparent and fast. Apply defaults and move on immediately.
