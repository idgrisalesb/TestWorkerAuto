---
name: delivery-sa-agent-guides
description: Generate client-ready delivery guides from user-guide documents indexed in the mcp-siesa-docs MCP. Use this skill when a delivery team member needs to transform user-guide content into simple, end-user friendly material. Always trigger on /delivery-agent-guides. Also trigger when the user says "generar guía de entrega", "guía para el cliente", "documentación de entrega para [project]", "guía para usuario final", or describes wanting to turn indexed user-guide docs into something a non-technical client can understand.
---

# Delivery Agent Guides

Transform user-guide documents (from the `mcp-siesa-docs` MCP) into a clear, client-ready delivery guide — plain language, no jargon, for non-technical end users.

The MCP is the only source of content. The local filesystem is not scanned.

---

## Flow

### Step 1: Discover projects with user-guides (automatic)

As soon as the skill is invoked, without asking the user first:

1. Call `list_collections()` to confirm `mcp-siesa-docs` is available.
2. Call `search_docs("user guide proyectos disponibles")` to find projects whose indexed docs include a `user-guide` directory.
3. Build the candidate list: **only include projects that have at least one document in their `user-guide` directory**. Projects with only feature specs, épicas, stories, or architecture docs are excluded (Option A).
4. Present the list to the user:
   ```
   Proyectos con guías de usuario disponibles:
   [1] {project-name-1}
   [2] {project-name-2}
   ...

   ¿Para cuál proyecto quieres generar la guía de entrega?
   ```
5. The user replies with a number or project name.

If zero projects qualify, tell the user plainly ("No encontré proyectos con user-guide indexado en el MCP") and stop.

---

### Step 2: Pull the user-guide content from the MCP

1. `search_docs("user guide [proyecto seleccionado]")` to list the user-guide documents of the chosen project.
2. For each result, call `get_document(path)` to fetch the full content.
3. **Strict filter**: process only documents whose `path` is inside the project's `user-guide` directory. Ignore feature specs, épicas, stories, architecture, or any other technical doc, even if they show up in results.

Keep the list of `path`s used — you will cite them in the final confirmation.

---

### Step 3: Write the delivery guide

Write one unified `delivery-guide.md`. All content in Spanish. Audience: non-technical end user.

**Content to keep and rewrite in plain language:**
- Feature name and purpose
- Step-by-step workflows
- Key concepts and field definitions (simplified)
- Troubleshooting and FAQs
- Warnings (⚠️) — rephrase without technical detail; keep the practical implication

**Content to transform:**
- Mermaid diagrams → rewrite as one or two plain sentences describing the flow. Never emit Mermaid syntax.

**Content to omit:**
- `📸 [Screenshot: ...]` placeholders
- `[Source: FX Story Y.Z]` traceability references
- Screenshot index tables
- Implementation component names (ContactManager, EmptyState, ErrorPanel, etc.) — describe the behavior instead
- `*Generado: ...` footers

**Output template:**

```markdown
---
project: {project-name}
generated_date: {YYYY-MM-DD}
sources:
  - {mcp-path-1}
  - {mcp-path-2}
audience: Usuario final no técnico
---

# Guía de {Nombre del Proyecto}

## ¿Qué es {Nombre del Proyecto}?
2-3 sentences. What the app does and who it is for. No technical terms.

## ¿Para qué sirve?
What problems it solves, from the user's perspective.

---

## {Feature 1}

### ¿Qué es?
One paragraph. Plain description.

### ¿Para qué sirve?
The practical benefit to the user.

### ¿Cómo se usa?
Numbered step-by-step. One clear action per step.
Include warnings inline (⚠️ ...) directly before the step that can cause an issue.

---

## {Feature 2}
(same structure)

---

## Solución de Problemas
Plain Q&A: "¿Qué hago si...? → ..."

## Preguntas Frecuentes
Plain Q&A. No technical language.
```

**Writing guidelines:**
- Target a reader who is comfortable with a smartphone but has no software background.
- Active voice, direct instructions: "Haz clic en...", "Escribe...", "Selecciona..."
- Short sentences. If a sentence needs a comma to explain a technical concept, rewrite it.
- If a concept has no practical value to the end user, drop it.

---

### Step 4: Save and confirm

Save to:
```
_bmad-output/documentation-artifacts/delivery-guides/{project-name}/delivery-guide.md
```

Create the directory if it doesn't exist.

Then confirm:
```
Guía guardada en: _bmad-output/documentation-artifacts/delivery-guides/{project-name}/delivery-guide.md

Features incluidas:
  - {feature 1}
  - {feature 2}

Fuentes del MCP:
  - {mcp-path-1}
  - {mcp-path-2}
```

---

## Transformation Reference

| Technical element | Delivery guide treatment |
|---|---|
| `deep linking` / URL única por registro | "Cada registro tiene su propia dirección web que puedes guardar o compartir" |
| `ContactManager`, `EmptyState`, `ErrorPanel` | Drop the name; describe what the user sees |
| `NIT/RUC` | Keep — explain once: "número de identificación tributaria (NIT/RUC)" |
| `Toast` notification | "mensaje de confirmación que aparece brevemente en pantalla" |
| Reintentar button on error | "si aparece un error, haz clic en Reintentar" |
| Panel de dos columnas | "La pantalla se divide en dos partes: a la izquierda la lista, a la derecha el detalle" |
| Validación inline | "mensajes de error junto al campo que necesita corrección" |
| Mermaid code block | One or two plain sentences describing the flow |
| `[Source: FX Story Y.Z]` | Omit |
| `📸 [Screenshot: ...]` | Omit |
