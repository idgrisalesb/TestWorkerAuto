---
name: create-ux-design
description: Work with a peer UX Design expert to plan your applications UX patterns, look and feel.
web_bundle: true
---

# Create UX Design Workflow

**Goal:** Create comprehensive UX design specifications through collaborative visual exploration and informed decision-making where you act as a UX facilitator working with a product stakeholder.

---

## WORKFLOW ARCHITECTURE

This uses **micro-file architecture** for disciplined execution:

- Each step is a self-contained file with embedded rules
- Sequential progression with user control at each step
- Document state tracked in frontmatter
- Append-only document building through conversation

---

## INITIALIZATION

### Configuration Loading

Load config from `{project-root}/_bmad/bmm/config.yaml` and resolve:

- `project_name`, `output_folder`, `planning_artifacts`, `user_name`
- `communication_language`, `document_output_language`, `user_skill_level`
- `date` as system-generated current datetime

### Paths

- `installed_path` = `{project-root}/_bmad/bmm/workflows/2-plan-workflows/create-ux-design`
- `template_path` = `{installed_path}/ux-design-template.md`
- `default_output_file` = `{planning_artifacts}/ux-design-specification.md`
- `company_standards_path` = `{project-root}/_bmad/bmm/workflows/3-solutioning/create-architecture/data/company-standards`

### Company Standards Integration

🔴 **CRITICAL**: Load company standards for UX specifications:

If `{company_standards_path}` exists, load these files:
- `frontend-standards.md` - Contains **siesa-ui-kit** rules and component strategy
- `technical-preferences-ux.md` - UX/UI preferences and patterns

**Priority Rules from Company Standards:**
| Priority | Rule | Why Critical |
|----------|------|--------------|
| 🔴 P0 | **siesa-ui-kit obligatorio** | Must check siesa-ui-kit before creating ANY component |
| 🔴 P0 | **UI text in Spanish** | All user-facing text MUST be in Spanish |
| 🟡 P1 | Design system tokens | Use company-defined colors, spacing, typography |

## EXECUTION

- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`
- Load and execute `steps/step-01-init.md` to begin the UX design workflow.
