# Step 1: Context Discovery & Initialization

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER generate content without user input
- ✅ ALWAYS treat this as collaborative discovery between technical peers
- 📋 YOU ARE A FACILITATOR, not a content generator
- 💬 FOCUS on discovering existing project context and technology stack
- 🎯 IDENTIFY critical implementation rules that AI agents need
- ⚠️ ABSOLUTELY NO TIME ESTIMATES - AI development speed has fundamentally changed
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

## EXECUTION PROTOCOLS:

- 🎯 Show your analysis before taking any action
- 📖 Read existing project files to understand current context
- 💾 Initialize document and update frontmatter
- 🚫 FORBIDDEN to load next step until discovery is complete

## CONTEXT FROM EXTENSION (INHERITED — READ BEFORE PROCEEDING):

The `workflow_ext.md` extension has already been executed. The following variables are now set in memory:

- **`{selected_mode}`** — Either `"general"` or `"feature-specific"`
- **`{output_file}`** — The resolved path for the output document
- **`{feature_name}`** — Only set if `selected_mode = "feature-specific"`

**IF `selected_mode = "feature-specific"`:**
- Narrow your discovery scope to code, configs, and patterns relevant to `{feature_name}`
- When speaking with the user, refer to the output document as `technical-preference.md` for `{feature_name}`
- Skip areas of the codebase clearly unrelated to this feature

**IF `selected_mode = "general"`:**
- Perform full project-wide discovery
- Refer to the output document as `project-context.md`

---

## CONTEXT BOUNDARIES:

- Variables from `workflow.md` are available in memory (`project_name`, `user_name`, `communication_language`, `user_skill_level`, etc.)
- Focus on existing project files and architecture decisions
- Look for patterns, conventions, and unique requirements
- Prioritize rules that prevent implementation mistakes

## YOUR TASK:

Discover the project's technology stack, existing patterns, and critical implementation rules that AI agents must follow when writing code.

---

## DISCOVERY SEQUENCE:

### 1. Check for Existing Output Document

First, check if the target output document already exists:

- Look for file at `{output_file}`
- If exists: Read complete file to understand existing rules
- Present to user: "Encontré un documento existente con {number_of_sections} secciones. ¿Deseas actualizarlo o crear uno nuevo?"

### 2. Discover Project Technology Stack

Load and analyze project files to identify technologies:

**Architecture Document:**

- Look for `{planning_artifacts}/architecture.md`
- Extract technology choices with specific versions
- Note architectural decisions that affect implementation

### 2.5 Load Company Standards (If Available)

Check for and load company-specific technology standards:

**Company Standards Discovery:**

- Look for `{company_standards_path}` directory
- If NOT found, also check `{project_root}/_bmad/bmm/workflows/3-solutioning/create-architecture/data/company-standards/`

**If directory exists, load ALL markdown files:**

- `technology-stack.md` — Predefined technology stack and versions
- `database-conventions.md` — PostgreSQL database naming conventions
- `backend-standards.md` — Backend development patterns and rules
- `frontend-standards.md` — Frontend development patterns
- `architecture-patterns.md` — Architectural decision patterns
- `technical-preferences-ux.md` — UX/UI preferences
- `vite-config-standard.md` — Vite Config Standard

**Priority Rules:**

- Company standards take PRECEDENCE over discovered patterns
- If technology versions differ, use company standards version
- Merge discovered patterns with company-defined rules

**Critical Rules to Extract:**

When loading company standards, specifically look for and highlight:

- 🔴 **siesa-ui-kit requirement** — Must check siesa-ui-kit before creating components
- 🔴 **Spanish UI text** — All user-facing text must be in Spanish
- 🔴 **DateTimeOffset** — Use DateTimeOffset not DateTime for PostgreSQL
- Technology stack versions (.NET 10, Vite 7+, etc.)

🔴 **MANDATORY — Load siesa-ui-kit Component Inventory:**

- Fetch the complete component catalog from: `https://siesa-ui-kit.pages.dev/llms.txt`
- Extract and include in the output document the **full list of available siesa-ui-kit components** organized by category
- This ensures AI agents know EXACTLY which components exist and can use them instead of creating custom alternatives
- Include a dedicated section listing all available siesa-ui-kit components
- If the URL is unreachable, warn the user: "⚠️ No se pudo cargar el catálogo de siesa-ui-kit. Incluir lista manualmente en el project context."

Report: "✅ Estándares corporativos cargados: {count} archivos con {rules_count} reglas críticas"
Report: "✅ Catálogo siesa-ui-kit cargado: {component_count} componentes disponibles"

**Package Files:**

- Check for `package.json`, `requirements.txt`, `Cargo.toml`, etc.
- Extract exact versions of all dependencies
- Note development vs production dependencies

**Configuration Files:**

- Look for project language specific configs (example: `tsconfig.json`)
- Build tool configs (webpack, vite, next.config.js, etc.)
- Linting and formatting configs (.eslintrc, .prettierrc, etc.)
- Testing configurations (jest.config.js, vitest.config.ts, etc.)

### 3. Identify Existing Code Patterns

Search through existing codebase for patterns:

**Naming Conventions:**

- File naming patterns (PascalCase, kebab-case, etc.)
- Component/function naming conventions
- Variable naming patterns
- Test file naming patterns

**Code Organization:**

- How components are structured
- Where utilities and helpers are placed
- How services are organized
- Test organization patterns

**Documentation Patterns:**

- Comment styles and conventions
- Documentation requirements
- README and API doc patterns

### 4. Extract Critical Implementation Rules

Look for rules that AI agents might miss:

**Language-Specific Rules:**

- TypeScript strict mode requirements
- Import/export conventions
- Async/await vs Promise usage patterns
- Error handling patterns specific to the language

**Framework-Specific Rules:**

- React hooks usage patterns
- API route conventions
- Middleware usage patterns
- State management patterns

**Testing Rules:**

- Test structure requirements
- Mock usage conventions
- Integration vs unit test boundaries
- Coverage requirements

**Development Workflow Rules:**

- Branch naming conventions
- Commit message patterns
- PR review requirements
- Deployment procedures

### 5. Initialize Output Document

Based on discovery, create or update the output document at `{output_file}`:

#### A. Fresh Document Setup (if no existing file)

Copy template from `{installed_path}/project-context-template.md` to `{output_file}`.
Initialize frontmatter fields. Adjust title to match `{selected_mode}`:
- General: `# Project Context for AI Agents`
- Feature-specific: `# Technical Preference for {feature_name}`

#### B. Existing Document Update

Load existing file and prepare for updates.
Set frontmatter `sections_completed` to track what will be updated.

### 6. Present Discovery Summary

Report findings to user:

"Hola {user_name}! He analizado tu proyecto **{project_name}** para descubrir el contexto que los agentes de IA necesitan.

**Stack Tecnológico Descubierto:**
{list_of_technologies_with_versions}

**Patrones Existentes Encontrados:**

- {number_of_patterns} patrones de implementación
- {number_of_conventions} convenciones de código
- {number_of_rules} reglas críticas

**Áreas Clave para las Reglas de Contexto:**

- {area_1} (ej: configuración TypeScript)
- {area_2} (ej: patrones de Testing)
- {area_3} (ej: organización del código)

{if_existing_context}
**Contexto Existente:** Se encontraron {sections} secciones ya definidas. Podemos actualizarlas o agregar nuevas.
{/if_existing_context}

Listo para crear/actualizar tu documento de contexto. Esto ayudará a los agentes a implementar código de forma consistente con los estándares del proyecto.

[C] Continuar con la generación del contexto"

---

## SUCCESS METRICS:

✅ Documento de salida correctamente detectado o inicializado en `{output_file}`
✅ Stack tecnológico identificado con versiones exactas
✅ Estándares corporativos cargados (si están disponibles)
✅ Catálogo de siesa-ui-kit cargado
✅ Patrones de implementación críticos descubiertos
✅ Resumen de descubrimiento presentado claramente al usuario
✅ Usuario listo para proceder con la generación del contexto

## FAILURE MODES:

❌ No verificar si el documento de salida ya existe antes de crear uno nuevo
❌ No resolver `{output_file}` correctamente según `{selected_mode}`
❌ Faltan versiones críticas de tecnologías o configuraciones
❌ Pasar por alto patrones o convenciones de código importantes
❌ No inicializar el frontmatter correctamente
❌ No presentar un resumen claro del descubrimiento al usuario

---

## NEXT STEP:

After user selects [C] to continue, load `./step-02-generate.md` to collaboratively generate the specific context rules.

**Remember:** Do NOT proceed to step-02 until:
1. User explicitly selects [C]
2. Discovery is confirmed complete
3. The initial file has been written at `{output_file}` with proper frontmatter
