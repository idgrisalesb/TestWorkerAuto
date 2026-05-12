---
name: 'step-03-review'
description: 'Execute the adversarial code review and find specific issues'

# Path Definitions
workflow_path: '{project-root}/_bmad/bmm/workflows/4-implementation/code-review'

# File References
thisStepFile: '{workflow_path}/steps/step-03-review.md'
nextStepFile: '{workflow_path}/steps/step-04-fix.md'
workflowFile: '{workflow_path}/workflow.md'
outputFile: '{output_folder}/review-{story_key}.md'
---

# Step 3: Execute Adversarial Review

## STEP GOAL:
To execute the review plan, rigorously verifying every claim against the actual code, and finding at least 3-10 specific, actionable issues.

## MANDATORY EXECUTION RULES:
- 📋 VALIDATE EVERY CLAIM - Check git reality vs story claims
- 🛑 NOT LOOKING HARD ENOUGH? Find more problems!
- 🔍 Find minimum 3 specific issues

## Sequence of Instructions

### 1. Git vs Story Logic Check

1. Analyze discrepancies found in Step 1.
2. **Files in Git but not in Story**: Mark as MEDIUM finding (Incomplete documentation).
3. **Files in Story but not in Git**: Mark as HIGH finding (False claims).
4. **Uncommitted changes**: Mark as MEDIUM finding (Transparency).

### 2. Comprehensive File Analysis

Create a **Comprehensive File List** (Story List + Git Items).
For EACH file in the list:
1. **Read the file content**.
2. **Code Quality Scan**:
   - **Security**: SQLi, XSS, insecure deps, missing auth.
   - **Performance**: N+1 queries, loops, memory usage.
   - **Error Handling**: Empty catches, generic errors.
   - **Maintainability**: Magic numbers, bad naming, monolithic functions.
   - **Test Quality**: "Expect true to be true" patterns (Red Flag).

### 3. AC & Task Verification

1. **AC Validation**:
   - Read specific lines implementing the AC.
   - If missing/partial -> HIGH SEVERITY.
2. **Task Completion Audit**:
   - For items marked `[x]`, verify the code exists.
   - If marked done but code missing -> CRITICAL FINDING.

### 4. Re-Scan Loop

**CRITICAL CHECK**: Do you have < 3 issues total?
- If yes: **LOOK HARDER**.
- Re-examine for edge cases, null handling, documentation gaps.
- You MUST find at least 3 issues.

### 5. Document Findings

Append findings to `{outputFile}`:

```markdown
## Review Findings

### Critical Issues (Must Fix)
- [CRITICAL] Task X marked done but feature Y missing in `file.ts`.
- [HIGH] AC Z not implemented.

### Medium Issues (Should Fix)
- [MED] Security risk in `auth.ts` line 42.

### Low Issues (Nice to Fix)
- [LOW] Variable naming in `utils.ts`.
```

### 6. Present MENU OPTIONS

Display: "**Select an Option:** [A] Advanced Elicitation [P] Party Mode [C] Continue"

#### Menu Handling Logic:
- IF C: Save findings to {outputFile}, update frontmatter `stepsCompleted: [1, 2, 3]`, then load/execute {nextStepFile}
- IF A/P: Execute respective flows
- IF Others: Loop

#### EXECUTION RULES:
- ALWAYS halt and wait for user input
- ONLY proceed to next step when user selects 'C'
