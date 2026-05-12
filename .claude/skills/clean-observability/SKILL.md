---
name: clean-observability
description: Safely clean up stale state files in ~/.claude/observability/ left by abandoned BMAD workflows. Triggered by /clean-observability. Files belonging to live Claude Code sessions are never touched. Run this weekly or whenever the observability dir feels cluttered.
---

# Clean Observability State

Manual cleanup for `~/.claude/observability/`. Removes only files whose owning `claude.exe` PID is no longer alive. Leaves files of currently-running sessions intact.

## What to do when invoked

### Step 1 — Preview (dry-run)

Run the cleanup script in dry-run mode and show its output verbatim to the user. The script lives in this project at `siesa-agents/observability/scripts/sa-clean.js`. The Bash tool's working directory is the project root, so a relative path is sufficient:

```bash
node siesa-agents/observability/scripts/sa-clean.js --dry-run
```

The script prints:
- The set of currently-live Claude Code PIDs.
- How many files will be kept.
- The exact list of files that would be deleted.

**Important:** do NOT use `${CLAUDE_PROJECT_DIR}` — that variable is not exported to the Bash tool's subshell and would resolve to empty, causing a "file not found" error. Always use the relative path above.

### Step 2 — Ask the user

Show the preview and ask:

> ¿Procedo con el borrado de los N archivos listados? [s/N]

Wait for explicit confirmation. Do **not** auto-proceed.

### Step 3 — Apply (only if user confirms)

If the user replies affirmatively (e.g., "sí", "s", "yes", "y"), run:

```bash
node siesa-agents/observability/scripts/sa-clean.js --apply --rotate-buffer
```

Report the script's output verbatim.

If the user declines, end the turn with: `Ok, no borré nada.`

## Notes

- Never run `--apply` without explicit user confirmation in this turn.
- Do not edit or delete files manually — always use `sa-clean.js`.
- The `--rotate-buffer` flag rotates `buffer/events.jsonl` if it exceeds 5 MB. Safe for parallel sessions.
