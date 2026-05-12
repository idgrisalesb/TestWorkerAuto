---
name: 'shard-doc'
description: 'Intelligent document sharding with feature-aware and epic-aware naming conventions'
standalone: true
---

# Intelligent Shard Document

> **This task REPLACES the default `shard-doc` from BMAD core.**
> Instead of using `npx @kayvan/markdown-tree-parser explode` (which only does blind level-2 splitting with no naming control), this task performs **intelligent sharding** executed directly by the agent.

---

## Objective

Split large markdown documents into smaller, organized files with **context-aware naming**. The agent reads the document, auto-detects the document type (PRD or Epics), identifies section types, and creates shard files following the correct naming convention.

---

## Document Type Auto-Detection

The agent determines the sharding mode by analyzing the document content:

| Signal | Detected Mode |
|--------|--------------|
| Contains `### feature —` or `### feature -` headings | **PRD Mode** |
| Contains `## Epic` headings with story subsections (`### Story`) | **Epic Mode** |
| Neither detected | **Generic Mode** (standard `##` level sharding) |

The agent MUST confirm the detected mode with the user before proceeding.

---

## Mode 1: PRD Sharding

### When It Applies

The source document contains feature sections at `###` level inside a parent `##` container:

```markdown
## 3. Requirements by Feature

### feature — Product Hierarchy Management
...
### feature — Plans & Billing Cycles Configuration
...
```

### Feature Number Detection (`NNN`)

Before generating filenames, the agent MUST resolve the feature number (`NNN`) for each feature by following this priority order:

1. **Explicit number in heading**: Look for a leading number in the feature name after the dash (e.g., `### feature — 001 Product Hierarchy Management` → `001`, `### feature — 16 Plans & Billing` → `016`). Normalize to 3 digits with leading zeros.
2. **Sequential assignment**: If no number is found in the heading, assign numbers sequentially by order of appearance in the document, zero-padded to 3 digits (first feature = `001`, second = `002`, etc.).

### Naming Convention

| Section Type | Detection Pattern | Output Filename |
|---|---|---|
| **Feature** | `### feature — {Name}` | `feat-{NNN}-{kebab-name}.md` |
| **General section** | `## {Title}` (no features inside) | `{kebab-title}.md` |
| **Feature container** | `## {Title}` that contains `### feature —` | **Not emitted** — children are expanded |

### Feature Detection Rules

The heading MUST match:
- Level `###` (level 3)
- Text starts with `feature` (case-insensitive)
- Followed by ` — ` (em-dash) OR ` - ` (hyphen)
- Followed by the feature name

### PRD Section Map Example

```
Section Map (PRD Mode):
  ## 1. Goals and Background Context    → NORMAL  → 1-goals-and-background-context.md
  ## 2. Feature Map Overview            → NORMAL  → 2-feature-map-overview.md
  ## 3. Requirements by Feature         → FEATURE_CONTAINER → expand:
    ### feature — Product Hierarchy Mgmt  → FEATURE (NNN=001) → feat-001-product-hierarchy-mgmt.md
    ### feature — Plans & Billing Cycles  → FEATURE (NNN=002) → feat-002-plans-billing-cycles.md
    ### feature — Advanced Charge Models  → FEATURE (NNN=003) → feat-003-advanced-charge-models.md
    ...
  ## 4. Non-Functional Requirements     → NORMAL  → 4-non-functional-requirements.md
  ## 5. Technical Assumptions           → NORMAL  → 5-technical-assumptions.md
  ## 6. Traceability Matrix             → NORMAL  → 6-traceability-matrix.md
  ## 7. Glossary                        → NORMAL  → 7-glossary.md
```

### PRD Extraction Rules

**NORMAL sections:**
- Extract the full `##` section content including all children
- The `##` heading remains as-is in the shard file

**FEATURE sections:**
- Extract each `### feature — {Name}` with ALL content until next `### feature —` or next `##`
- **Promote** the `###` heading to `##` in the shard file
- Horizontal rules (`---`) between features are separators — do NOT include trailing `---`

### PRD index.md Structure

```markdown
# {Document Title}

## Table of Contents

### General Sections

- [{Section Title}](./{filename}.md)
- ...

### Features

- [{Feature Name}](./feat-{NNN}-{kebab-name}.md)
- ...
```

---

## Mode 2: Epic Sharding

### When It Applies

The source document is an epics breakdown organized by feature, where each feature groups its epics under a `##` heading:

```markdown
# Project Name - Epic Breakdown

## Overview
...

## Measurement Units

### Epic 1: Core Entity & CRUD API
#### Story 1.1: Domain Entity & Database Schema
...
#### Story 1.2: API Setup & Secure Create Endpoint
...

### Epic 2: Business Rules & Integrity
#### Story 2.1: Usage Detection Service
...

## Cost Models

### Epic 1: Entity & Creation API
#### Story 1.1: Database & Entity Infrastructure
...
```

### Feature Number Detection (`NNN`)

Before generating filenames, the agent MUST resolve the feature number (`NNN`) by following this priority order:

1. **Source filename pattern**: Look for `feat-{digits}` in the filename (e.g., `epics-feat-016-name.md` → `16`, `epic-feat-083.md` → `83`). Strip leading zeros.
2. **Document title**: Look for `feat-{digits}` in the first `#` heading (e.g., `# feat-016 — Proyecciones Financieros` → `16`).
3. **Not found**: Ask the user: *"¿Cuál es el número del feature (`NNN`) para este documento de épicas?"*

### Naming Convention

Each `##` section that contains epics (detected by `### Epic` subsections) becomes a feature epic shard using the **feature-prefixed naming convention**:

```
epic-feat-{NNN}-{slug}.md
```

Where:
- `NNN` = feature number (no leading zeros), resolved via the detection rules above
- `slug` = kebab-case conversion of the `##` section heading

| Section | Output Filename (example: `NNN=16`) |
|---------|-------------------------------------|
| `## Measurement Units` (contains epics) | `epic-feat-16-measurement-units.md` |
| `## Cost Models` (contains epics) | `epic-feat-16-cost-models.md` |
| `## Storages` (contains epics) | `epic-feat-16-storages.md` |
| `## Overview` (no epics inside) | **Not a feature epic** → `overview.md` |

### Epic Detection Rules

A `##` section is an **epic feature group** if it contains at least one `### Epic` subsection (case-insensitive).

A `##` section is a **general section** if it does NOT contain `### Epic` subsections (e.g., `## Overview`, `## Requirements Inventory`, `## FR Coverage Map`).

### Epic Section Map Example

```
Section Map (Epic Mode — NNN=16):
  ## Overview                      → NORMAL → overview.md
  ## Requirements Inventory        → NORMAL → requirements-inventory.md
  ## Measurement Units             → EPIC_FEATURE → epic-feat-16-measurement-units.md
    Contains: Epic 16-1 (5 stories), Epic 16-2 (4 stories), Epic 16-3 (4 stories)
  ## Cost Models                   → EPIC_FEATURE → epic-feat-16-cost-models.md
    Contains: Epic 16-4 (3 stories), Epic 16-5 (2 stories), Epic 16-6 (2 stories)
  ## Storages                      → EPIC_FEATURE → epic-feat-16-storages.md
    Contains: Epic 16-7 (3 stories), Epic 16-8 (3 stories), ... Epic 16-13 (3 stories)
```

### Epic Extraction Rules

**EPIC_FEATURE sections:**
- Extract the entire `##` section with ALL content (all `### Epic` and `#### Story` children)
- The `##` heading remains as-is in the shard file
- Include all epics and stories belonging to that feature

**NORMAL sections:**
- Extract as standard kebab-case named files

### Epic index.md Structure

```markdown
# {Document Title} - Epic Index

## Overview

{Any introductory text from the source document before the first ##}

## Epic Master List

| Seq | Feature | Epics | Stories | Shard File |
|-----|---------|-------|---------|------------|
| 01 | Measurement Units | 5 | 20 | [epic-feat-16-measurement-units.md](./epic-feat-16-measurement-units.md) |
| 02 | Cost Models | 3 | 7 | [epic-feat-16-cost-models.md](./epic-feat-16-cost-models.md) |
| 03 | Storages | 7 | 15 | [epic-feat-16-storages.md](./epic-feat-16-storages.md) |

## General Sections

- [{Section Title}](./{filename}.md)
- ...
```

---

## Mode 3: Generic Sharding (Fallback)

### When It Applies

No features (`### feature —`) and no epic groups (`### Epic`) detected. Falls back to standard `##` level splitting.

### Naming Convention

Standard kebab-case from heading text:

```
{kebab-heading-text}.md
```

---

## Shared Flow (All Modes)

### Step 1: Ask Document Type

Preguntar al usuario qué documento desea shardear:
> *"¿Qué documento deseas shardear?"*
> **[P] PRD** — Shardea el PRD por features
> **[E] Epics** — Shardea el documento de épicas por feature
> **[G] Generic** — Sharding genérico por secciones `##`

### Step 2: Locate & Analyze Document

- Según la opción elegida, buscar el documento en `{planning_artifacts}/`:
  - **PRD**: buscar `prd.md` o `*prd*.md`
  - **Epics**: buscar `epics.md` o `*epic*.md`
  - **Generic**: pedir la ruta al usuario
- Si no se encuentra, pedir la ruta manualmente.
- Verify file exists and is markdown (.md). HALT if not found.
- Read the document, build the section map according to the mode seleccionado.
- **Present the section map to the user for confirmation.**

### Step 3: Get Destination Folder

- Default destination: same location as source, folder named after source file without .md
  - `planning-artifacts/prd.md` → `planning-artifacts/prd/`
  - `planning-artifacts/epics.md` → `planning-artifacts/epics/`
- Ask user to confirm or provide custom path
- Create folder if needed

### Step 4: Execute Sharding

For each entry in the section map, following the rules of the detected mode:
- Create each shard file with the correct naming convention
- Preserve all content: paragraphs, lists, tables, code blocks, sub-headings
- The document frontmatter (`---` YAML block at top) is NOT included in any shard
- Horizontal rules (`---`) used as separators between sections are NOT included in shards

### Step 5: Generate index.md

Create `{destination}/index.md` following the structure defined for the detected mode.

### Step 6: Verify Output

- Count files created
- Verify each file has content (non-empty)
- Verify index.md exists with correct links
- Display completion report:

```
Intelligent Shard Complete ({MODE} Mode):
  Source: {source-path}
  Destination: {destination-path}
  Mode: {PRD | Epic | Generic}
  General sections: {count}
  Feature/Epic shards: {count}
  Total files: {count} (+ index.md)

  Files created:
    ✓ index.md
    ✓ {file-1}
    ✓ {file-2}
    ...
```

### Step 7: Archive Original Document

- Move the source file to `{source-dir}/archive/` automatically.
- If the `archive/` directory does not exist, create it.
- Inform the user: *"El archivo fuente ha sido movido a `_bmad-output/planning_artifacts/archive/{filename}`."*

---

## Kebab-Case Rules (All Modes)

Applied to heading text to generate filenames:

1. Remove the prefix (`feature — `, `Epic N:`, numbering like `1.`, `2.`, etc.)
2. Lowercase all text
3. Replace spaces with hyphens
4. Remove special characters: `&`, `,`, `(`, `)`, `/`, `'`, `"`, `:`, `;`
5. Collapse multiple consecutive hyphens into one
6. Trim leading/trailing hyphens

---

## Edge Cases

1. **No recognizable pattern**: Fall back to Generic Mode (standard `##` splitting)
2. **Multiple feature containers in PRD**: Expand all `##` sections that contain `### feature —`
3. **Mixed content before first subsection**: Include intro text in index.md
4. **Empty sections**: Skip sections with no content (heading only)
5. **Deep nesting**: Only shard at the detection level. Everything below stays inside the shard
6. **Epic feature number (`NNN`) not detectable**: If neither the filename nor the document title contain a `feat-{digits}` pattern, the agent MUST ask the user before proceeding — never assume or default to `0`.
