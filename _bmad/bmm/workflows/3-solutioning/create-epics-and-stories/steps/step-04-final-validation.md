---
name: 'step-04-final-validation'
description: 'Validate complete coverage of all requirements and ensure implementation readiness'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/3-solutioning/create-epics-and-stories'

# File References
thisStepFile: '{workflow_path}/steps/step-04-final-validation.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{planning_artifacts}/epics.md'

# Task References
advancedElicitationTask: '{project-root}/_bmad/core/workflows/advanced-elicitation/workflow.xml'
partyModeWorkflow: '{project-root}/_bmad/core/workflows/party-mode/workflow.md'

# Template References
epicsTemplate: '{workflow_path}/templates/epics-template.md'
---

# Step 4: Final Validation

## STEP GOAL:

To validate complete coverage of all requirements and ensure stories are ready for development.

## MANDATORY EXECUTION RULES (READ FIRST):

### Universal Rules:

- 🛑 NEVER generate content without user input
- 📖 CRITICAL: Read the complete step file before taking any action
- 🔄 CRITICAL: Process validation sequentially without skipping
- 📋 YOU ARE A FACILITATOR, not a content generator
- ✅ YOU MUST ALWAYS SPEAK OUTPUT In your Agent communication style with the config `{communication_language}`

### Role Reinforcement:

- ✅ You are a product strategist and technical specifications writer
- ✅ If you already have been given communication or persona patterns, continue to use those while playing this new role
- ✅ We engage in collaborative dialogue, not command-response
- ✅ You bring validation expertise and quality assurance
- ✅ User brings their implementation priorities and final review

### Step-Specific Rules:

- 🎯 Focus ONLY on validating complete requirements coverage
- 🚫 FORBIDDEN to skip any validation checks
- 💬 Validate FR coverage, story completeness, and dependencies
- 🚪 ENSURE all stories are ready for development

## EXECUTION PROTOCOLS:

- 🎯 Validate every requirement has story coverage
- 💾 Check story dependencies and flow
- 📖 Verify architecture compliance
- 🚫 FORBIDDEN to approve incomplete coverage

## CONTEXT BOUNDARIES:

- Available context: Complete epic and story breakdown from previous steps
- Focus: Final validation of requirements coverage and story readiness
- Limits: Validation only, no new content creation
- Dependencies: Completed story generation from Step 3

## VALIDATION PROCESS:

### 1. FR Coverage Validation

Review the complete epic and story breakdown to ensure EVERY FR is covered:

**CRITICAL CHECK:**

- Go through each FR from the Requirements Inventory
- Verify it appears in at least one story
- Check that acceptance criteria fully address the FR
- No FRs should be left uncovered

### 2. Architecture Implementation Validation

**Check for Starter Template Setup:**

- Does Architecture document specify a starter template?
- If YES: Epic 1 Story 1 must be "Set up initial project from starter template"
- This includes cloning, installing dependencies, initial configuration

**Database/Entity Creation Validation:**

- Are database tables/entities created ONLY when needed by stories?
- ❌ WRONG: Epic 1 creates all tables upfront
- ✅ RIGHT: Tables created as part of the first story that needs them
- Each story should create/modify ONLY what it needs

### 3. Story Quality Validation

**Each story must:**

- Be completable by a single dev agent
- Have clear acceptance criteria
- Reference specific FRs it implements
- Include necessary technical details
- **Not have forward dependencies** (can only depend on PREVIOUS stories)
- Be implementable without waiting for future stories

### 4. Epic Structure Validation

**Check that:**

- Epics deliver user value, not technical milestones
- Dependencies flow naturally
- Foundation stories only setup what's needed
- No big upfront technical work

### 5. Epic Acceptance Criteria Coverage Validation (CRITICAL)

**Purpose:** Ensure each high-level Epic AC is supported by one or more stories within that epic.

**For each Epic, validate:**

1. **Load Epic AC:** Review all Acceptance Criteria (QA Validation) for the epic
2. **Map AC to Stories:** For each Epic AC, identify which stories support it
3. **Verify Coverage:** Each Epic AC must have at least one story that implements it

**Validation Format:**

```
Epic 1: [Title]
├── AC-E1.1: [Criterion] → Supported by: Story 1.1, Story 1.2
├── AC-E1.2: [Criterion] → Supported by: Story 1.3
└── AC-E1.3: [Criterion] → Supported by: Story 1.2, Story 1.4

Epic 2: [Title]
├── AC-E2.1: [Criterion] → Supported by: Story 2.1
├── AC-E2.2: [Criterion] → Supported by: Story 2.2, Story 2.3
└── AC-E2.3: [Criterion] → Supported by: Story 2.3
```

**🚨 VALIDATION RULES:**

- ❌ FAIL: Epic AC has NO supporting stories
- ❌ FAIL: Epic AC is too technical (should be high-level, user-oriented)
- ❌ FAIL: Story AC does not collectively satisfy the Epic AC
- ✅ PASS: Every Epic AC maps to at least one story
- ✅ PASS: Epic AC is verifiable by QA without technical knowledge

**If gaps are found:**
- Identify which Epic AC lacks story coverage
- Recommend adding stories OR adjusting Epic AC
- Do NOT proceed until all Epic AC have story support

### 6. Dependency Validation (CRITICAL)

**Epic Independence Check:**

- Does each epic deliver COMPLETE functionality for its domain?
- Can Epic 2 function without Epic 3 being implemented?
- Can Epic 3 function standalone using Epic 1 & 2 outputs?
- ❌ WRONG: Epic 2 requires Epic 3 features to work
- ✅ RIGHT: Each epic is independently valuable

**Within-Epic Story Dependency Check:**
For each epic, review stories in order:

- Can Story N.1 be completed without Stories N.2, N.3, etc.?
- Can Story N.2 be completed using only Story N.1 output?
- Can Story N.3 be completed using only Stories N.1 & N.2 outputs?
- ❌ WRONG: "This story depends on a future story"
- ❌ WRONG: Story references features not yet implemented
- ✅ RIGHT: Each story builds only on previous stories

### 7. Complete and Save

If all validations pass:

- Update any remaining placeholders in the document
- Ensure proper formatting
- Save the final epics.md

**Present Final Menu:**
**All validations complete!** [C] Complete Workflow

When C is selected, the workflow is complete and the epics.md is ready for development.

---

## 🚨 SYSTEM SUCCESS/FAILURE METRICS

### ✅ SUCCESS:

- All FRs covered by at least one story
- Architecture compliance validated
- Story quality requirements met
- Epic structure delivers user value
- **Every Epic AC (QA Validation) maps to at least one supporting story**
- **Epic AC to Story coverage matrix is complete**
- No forward dependencies in stories
- Document is complete and ready for development

### ❌ SYSTEM FAILURE:

- Missing FR coverage
- Architecture requirements not met
- Stories too large or missing AC
- Epic AC without supporting stories
- **Gaps in Epic AC → Story coverage validation**
- Forward dependencies detected
- Incomplete or improperly formatted document

**Master Rule:** Skipping validations, approving incomplete coverage, or not following exact instructions is FORBIDDEN and constitutes SYSTEM FAILURE.
