#!/usr/bin/env python3
"""
BMAD Story Orchestrator
=======================
Automates the full story development cycle (create → dev → code-review)
by invoking the Claude Code CLI in sequential, clean-context sessions.

Source of truth: _bmad-output/implementation-artifacts/sprint-status.yaml
Resume state:    scripts/.orchestrator-state.json
Logs:            scripts/logs/
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# Ensure stdout/stderr handle Unicode on Windows consoles (cp1252 → utf-8)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
def _find_project_root() -> Path:
    """Walk up from CWD until we find sprint-status.yaml or a known marker."""
    SPRINT_REL = Path("_bmad-output") / "implementation-artifacts" / "sprint-status.yaml"
    candidate = Path.cwd().resolve()
    for _ in range(10):  # max 10 levels up
        if (candidate / SPRINT_REL).exists():
            return candidate
        parent = candidate.parent
        if parent == candidate:
            break
        candidate = parent
    # Fallback: original behavior relative to script
    return Path(__file__).resolve().parent.parent

SCRIPT_DIR    = Path(__file__).resolve().parent
PROJECT_ROOT  = _find_project_root()
SPRINT_STATUS = PROJECT_ROOT / "_bmad-output" / "implementation-artifacts" / "sprint-status.yaml"
STATE_FILE    = SCRIPT_DIR / ".orchestrator-state.json"
LOGS_DIR      = SCRIPT_DIR / "logs"

# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------
STEPS = ["create", "dev", "review"]

_NO_QUESTIONS = (
    ' Run in batch mode: do not ask questions, do not offer further help, '
    'do not suggest next steps, do not wait for user input. '
    'Complete the task fully and stop.'
)

STEP_PROMPTS = {
    "create": '/bmad:bmm:workflows:create-story create story {story_id}' + _NO_QUESTIONS,
    "dev": '/bmad:bmm:workflows:dev-story implement story {story_id}' + _NO_QUESTIONS,
    "review": (
        '/bmad:bmm:workflows:code-review review the code for story {story_id}. '
        'Apply ALL fixes automatically without asking for confirmation. '
        'Do not pause for user input — apply every correction you find.'
        + _NO_QUESTIONS
    ),
}

MAX_RETRIES = 8
DEFAULT_WAIT_SECS = 300  # 5 minutes

# ANSI colors
C_RESET = "\033[0m"
C_BOLD = "\033[1m"
C_GREEN = "\033[32m"
C_YELLOW = "\033[33m"
C_RED = "\033[31m"
C_CYAN = "\033[36m"
C_DIM = "\033[2m"
C_MAGENTA = "\033[35m"
C_BLUE = "\033[34m"


# ---------------------------------------------------------------------------
# Sprint-status parser (stdlib only, no yaml lib)
# ---------------------------------------------------------------------------
def parse_sprint_status(path: Path) -> list[dict]:
    """Return list of {'epic': int, 'story_id': str, 'status': str}."""
    stories: list[dict] = []
    current_epic: int | None = None

    with open(path) as f:
        in_dev_status = False
        for raw_line in f:
            line = raw_line.strip()

            # Detect development_status block
            if line == "development_status:":
                in_dev_status = True
                continue
            if not in_dev_status:
                continue

            # Skip comments and blanks
            if not line or line.startswith("#"):
                continue

            # Parse key: value (ignore inline comments)
            m = re.match(r'^(\S+):\s*(\S+)', line)
            if not m:
                continue
            key, value = m.group(1), m.group(2)

            # Epic line
            epic_m = re.match(r'^epic-(\d+)$', key)
            if epic_m:
                current_epic = int(epic_m.group(1))
                continue

            # Retrospective lines — skip
            if "retrospective" in key:
                continue

            # Story line
            story_m = re.match(r'^(\d+)-(\d+)', key)
            if story_m and current_epic is not None:
                stories.append({
                    "epic": current_epic,
                    "story_id": key,
                    "status": value,
                })

    return stories


# ---------------------------------------------------------------------------
# State management
# ---------------------------------------------------------------------------
def load_state() -> dict | None:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            return None
    return None


def save_state(story_id: str, step: str, completed: bool):
    state = {
        "story_id": story_id,
        "step": step,
        "completed": completed,
        "timestamp": datetime.now().isoformat(),
    }
    STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


def clear_state():
    if STATE_FILE.exists():
        STATE_FILE.unlink()


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
class Logger:
    def __init__(self):
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.general_log = open(LOGS_DIR / f"orchestrator_{ts}.log", "w", encoding="utf-8")
        self._step_log = None

    def open_step_log(self, story_id: str, step: str):
        self.close_step_log()
        story_dir = LOGS_DIR / f"story_{story_id}"
        story_dir.mkdir(parents=True, exist_ok=True)
        self._step_log = open(story_dir / f"{step}.log", "w", encoding="utf-8")

    def close_step_log(self):
        if self._step_log:
            self._step_log.close()
            self._step_log = None

    def log(self, text: str, *, to_step=True):
        ts = datetime.now().strftime("%H:%M:%S")
        entry = f"[{ts}] {text}\n"
        self.general_log.write(entry)
        self.general_log.flush()
        if to_step and self._step_log:
            self._step_log.write(entry)
            self._step_log.flush()

    def log_output(self, text: str):
        """Log raw output to step log only."""
        safe = text.encode("utf-8", errors="replace").decode("utf-8")
        if self._step_log:
            self._step_log.write(safe)
            self._step_log.flush()

    def close(self):
        self.close_step_log()
        self.general_log.close()


# ---------------------------------------------------------------------------
# Rate-limit detection
# ---------------------------------------------------------------------------
_RATE_LIMIT_PATTERNS = [
    re.compile(r'rate.?limit', re.IGNORECASE),
    re.compile(r'too many requests', re.IGNORECASE),
    re.compile(r'overloaded', re.IGNORECASE),
    re.compile(r'try again in', re.IGNORECASE),
    re.compile(r'retry.after', re.IGNORECASE),
]

_WAIT_TIME_PATTERNS = [
    re.compile(r'(\d+)\s*second', re.IGNORECASE),
    re.compile(r'(\d+)\s*minute', re.IGNORECASE),
    re.compile(r'try again in\s*(\d+)', re.IGNORECASE),
    re.compile(r'wait\s*(\d+)', re.IGNORECASE),
]


def detect_rate_limit(output: str) -> bool:
    return any(p.search(output) for p in _RATE_LIMIT_PATTERNS)


def extract_wait_time(output: str) -> int:
    """Extract wait time in seconds from error output. Returns default if not found."""
    for p in _WAIT_TIME_PATTERNS:
        m = p.search(output)
        if m:
            val = int(m.group(1))
            if "minute" in p.pattern.lower():
                return val * 60
            return val if val <= 600 else DEFAULT_WAIT_SECS
    return DEFAULT_WAIT_SECS


def countdown_wait(seconds: int, logger: Logger):
    """Wait with a visible countdown."""
    print(f"\n{C_YELLOW}Esperando {seconds}s por rate limit...{C_RESET}")
    logger.log(f"Rate limit — waiting {seconds}s")
    end = time.time() + seconds
    while True:
        remaining = int(end - time.time())
        if remaining <= 0:
            break
        mins, secs = divmod(remaining, 60)
        sys.stdout.write(f"\r{C_DIM}   {mins:02d}:{secs:02d} restantes...{C_RESET}  ")
        sys.stdout.flush()
        time.sleep(1)
    sys.stdout.write("\r" + " " * 40 + "\r")
    sys.stdout.flush()
    print(f"{C_GREEN}Reanudando...{C_RESET}\n")


# ---------------------------------------------------------------------------
# Question detection
# ---------------------------------------------------------------------------
def detect_question(output: str) -> str | None:
    """Check if Claude ended with a question. Returns the question text or None."""
    lines = output.strip().splitlines()
    if not lines:
        return None
    tail = []
    for line in reversed(lines):
        stripped = line.strip()
        if stripped:
            tail.insert(0, stripped)
        if len(tail) >= 5:
            break

    tail_text = "\n".join(tail)

    # Phrases that look like questions but are just polite closings — ignore them
    courtesy_patterns = [
        re.compile(r'(estoy a la orden|happy to help|let me know if|feel free to|si tienes (preguntas|dudas)|cualquier (pregunta|duda))', re.IGNORECASE),
        re.compile(r'(if you (have|need)|si (necesitas|quieres|tienes))', re.IGNORECASE),
    ]
    if any(p.search(tail_text) for p in courtesy_patterns):
        return None

    # Only treat as a real question if it ends with ? or uses direct action-blocking phrases
    if tail_text.rstrip().endswith("?"):
        return tail_text
    question_patterns = [
        re.compile(r'would you like (me to|to)', re.IGNORECASE),
        re.compile(r'do you want (me to|to)', re.IGNORECASE),
        re.compile(r'should I (proceed|continue|apply|create|make)', re.IGNORECASE),
        re.compile(r'please (confirm|clarify|specify)', re.IGNORECASE),
        re.compile(r'which (one|option) (do|should|would)', re.IGNORECASE),
    ]
    if any(p.search(tail_text) for p in question_patterns):
        return tail_text
    return None


# ---------------------------------------------------------------------------
# Stream-JSON event renderer
# ---------------------------------------------------------------------------
def _truncate(text: str, max_len: int = 200) -> str:
    """Truncate text for display."""
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


def _format_tool_input(name: str, inp: dict) -> str:
    """Format a tool_use input for compact display."""
    if name == "Read":
        path = inp.get("file_path", "")
        parts = []
        if path:
            parts.append(path.replace(str(PROJECT_ROOT) + "/", ""))
        if inp.get("offset"):
            parts.append(f"offset={inp['offset']}")
        if inp.get("limit"):
            parts.append(f"limit={inp['limit']}")
        return " ".join(parts)
    if name == "Write":
        path = inp.get("file_path", "")
        return path.replace(str(PROJECT_ROOT) + "/", "")
    if name == "Edit":
        path = inp.get("file_path", "")
        old = _truncate(inp.get("old_string", ""), 60)
        return f"{path.replace(str(PROJECT_ROOT) + '/', '')}  old={old!r}"
    if name == "Glob":
        return inp.get("pattern", "")
    if name == "Grep":
        pattern = inp.get("pattern", "")
        path = inp.get("path", "")
        return f"/{pattern}/ in {path.replace(str(PROJECT_ROOT) + '/', '') or '.'}"
    if name == "Bash":
        cmd = inp.get("command", "")
        return _truncate(cmd, 120)
    if name == "Skill":
        return inp.get("skill", "")
    # Generic
    return _truncate(json.dumps(inp, ensure_ascii=False), 120)


def _format_tool_result(event: dict) -> str:
    """Format a tool result for compact display."""
    result = event.get("tool_use_result", "")
    if isinstance(result, dict):
        # File read result
        if "file" in result:
            f = result["file"]
            path = f.get("filePath", "")
            lines = f.get("totalLines", "?")
            return f"{path.replace(str(PROJECT_ROOT) + '/', '')} ({lines} lines)"
        if "filenames" in result:
            count = len(result["filenames"])
            truncated = result.get("truncated", False)
            suffix = "+" if truncated else ""
            return f"{count}{suffix} files"
        if "durationMs" in result:
            return f"done in {result['durationMs']}ms"
        return _truncate(json.dumps(result, ensure_ascii=False), 150)
    if isinstance(result, str):
        # Error results
        if result.startswith("Error:"):
            return f"{C_RED}{_truncate(result, 150)}{C_RESET}"
        return _truncate(result, 150)
    return str(result)[:150]


def render_event(event: dict, logger: Logger) -> str | None:
    """
    Render a stream-json event to the terminal.
    Returns extracted assistant text (for question detection) or None.
    """
    etype = event.get("type", "")
    assistant_text = None

    if etype == "system":
        subtype = event.get("subtype", "")
        if subtype == "init":
            model = event.get("model", "?")
            mode = event.get("permissionMode", "?")
            print(f"  {C_DIM}modelo={model}  permisos={mode}{C_RESET}")
            logger.log(f"Init: model={model} permissionMode={mode}")
        # Skip hook events silently

    elif etype == "assistant":
        msg = event.get("message", {})
        content = msg.get("content", [])
        for block in content:
            btype = block.get("type", "")
            if btype == "text":
                text = block.get("text", "")
                if text.strip():
                    print(f"\n{text}")
                    assistant_text = text
                    logger.log_output(text + "\n")
            elif btype == "tool_use":
                name = block.get("name", "?")
                inp = block.get("input", {})
                formatted = _format_tool_input(name, inp)
                print(f"  {C_MAGENTA}{name}{C_RESET} {C_DIM}{formatted}{C_RESET}")
                logger.log_output(f"[tool_use] {name}: {formatted}\n")

    elif etype == "user":
        # Tool result
        formatted = _format_tool_result(event)
        if formatted:
            print(f"  {C_DIM}   ↳ {formatted}{C_RESET}")
            logger.log_output(f"[tool_result] {formatted}\n")

    elif etype == "rate_limit_event":
        info = event.get("rate_limit_info", {})
        status = info.get("status", "")
        if status != "allowed":
            resets_at = info.get("resetsAt", 0)
            now = int(time.time())
            wait = max(resets_at - now, DEFAULT_WAIT_SECS) if resets_at > now else DEFAULT_WAIT_SECS
            print(f"\n  {C_RED}Rate limit: status={status}{C_RESET}")
            logger.log(f"Rate limit event: status={status} resetsAt={resets_at}")
            # Will be handled by caller via return value

    elif etype == "result":
        subtype = event.get("subtype", "")
        is_error = event.get("is_error", False)
        duration = event.get("duration_ms", 0)
        cost = event.get("total_cost_usd", 0)
        turns = event.get("num_turns", 0)

        dur_str = f"{duration / 1000:.1f}s" if duration else "?"
        cost_str = f"${cost:.4f}" if cost else "?"

        if is_error:
            err_msg = event.get("result", "unknown error")
            print(f"\n  {C_RED}Error: {_truncate(err_msg, 200)}{C_RESET}")
            print(f"  {C_DIM}duración={dur_str} costo={cost_str} turnos={turns}{C_RESET}")
        else:
            print(f"\n  {C_DIM}───────────────────────────────────────")
            print(f"  duración={dur_str}  costo={cost_str}  turnos={turns}{C_RESET}")
        logger.log(f"Result: subtype={subtype} error={is_error} duration={dur_str} cost={cost_str} turns={turns}")

    return assistant_text


# ---------------------------------------------------------------------------
# Claude invocation
# ---------------------------------------------------------------------------
def run_claude_step(
    prompt: str,
    model: str | None,
    logger: Logger,
    story_id: str,
    step: str,
) -> tuple[bool, str]:
    """
    Run a single Claude CLI invocation with real-time stream-json output.

    Uses --output-format stream-json to get structured events as they happen,
    including tool calls, results, and text — all rendered live.
    Returns (success: bool, full_assistant_text: str).
    """
    claude_bin = shutil.which("claude") or shutil.which("claude.cmd") or "claude"
    cmd = [
        claude_bin,
        "--print",
        "--dangerously-skip-permissions",
        "--verbose",
        "--output-format", "stream-json",
    ]
    if model:
        cmd.extend(["--model", model])

    cmd.append(prompt)

    logger.log(f"Running: claude ... '{prompt[:80]}...'")

    env = os.environ.copy()
    env.pop("CLAUDECODE", None)  # Allow nested invocation

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(PROJECT_ROOT),
            env=env,
        )
    except FileNotFoundError:
        print(f"{C_RED}Claude CLI not found. Install it first.{C_RESET}")
        logger.log("ERROR: claude CLI not found")
        return False, ""

    all_assistant_text: list[str] = []
    hit_rate_limit = False
    result_event: dict | None = None

    try:
        for raw_line in iter(proc.stdout.readline, b""):
            line = raw_line.decode("utf-8", errors="replace").rstrip("\n\r")
            if not line:
                continue

            # Log raw JSON
            logger.log_output(line + "\n")

            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                # Not JSON — print as-is (shouldn't happen with stream-json)
                print(line)
                continue

            text = render_event(event, logger)
            if text:
                all_assistant_text.append(text)

            # Track rate limit events
            if event.get("type") == "rate_limit_event":
                info = event.get("rate_limit_info", {})
                if info.get("status") != "allowed":
                    hit_rate_limit = True

            # Capture the result event
            if event.get("type") == "result":
                result_event = event

    except KeyboardInterrupt:
        proc.kill()
        raise

    # Read any stderr
    stderr = proc.stderr.read().decode("utf-8", errors="replace").strip()
    proc.wait()

    if stderr:
        # Check if stderr contains rate limit info
        if detect_rate_limit(stderr):
            hit_rate_limit = True
            print(f"\n  {C_RED}stderr: {_truncate(stderr, 200)}{C_RESET}")
        logger.log(f"stderr: {stderr[:300]}")

    full_text = "\n".join(all_assistant_text)

    # Determine success
    if result_event:
        success = not result_event.get("is_error", False)
    else:
        success = proc.returncode == 0

    if hit_rate_limit:
        success = False  # Force retry

    logger.log(f"Exit code: {proc.returncode} | success={success} | rate_limit={hit_rate_limit}")
    return success, full_text


def execute_step(
    story_id: str,
    step: str,
    model: str | None,
    logger: Logger,
    extra_context: str = "",
) -> bool:
    """Execute a step with retry logic for rate limits and question handling."""
    prompt_template = STEP_PROMPTS[step]
    prompt = prompt_template.format(story_id=story_id)
    if extra_context:
        prompt = f"{prompt}\n\nAdditional context from user: {extra_context}"

    step_label = {"create": "Create Story", "dev": "Dev Story", "review": "Code Review"}[step]

    print(f"\n{'='*60}")
    print(f"{C_BOLD}{C_CYAN}[{story_id}] {step_label}{C_RESET}")
    print(f"{'='*60}")
    logger.log(f"=== Step: {step_label} for {story_id} ===")

    for attempt in range(1, MAX_RETRIES + 1):
        if attempt > 1:
            print(f"\n{C_YELLOW}Intento {attempt}/{MAX_RETRIES}{C_RESET}")
            logger.log(f"Retry attempt {attempt}/{MAX_RETRIES}")

        success, output = run_claude_step(prompt, model, logger, story_id, step)

        # Check rate limit in output text too
        if not success and detect_rate_limit(output):
            wait = extract_wait_time(output)
            countdown_wait(wait, logger)
            continue

        # Rate limit detected via event (success was forced to False)
        if not success and not output.strip():
            # Likely rate limit with no text output
            countdown_wait(DEFAULT_WAIT_SECS, logger)
            continue

        if success:
            # Check for questions only if the step didn't succeed cleanly.
            # If success=True, Claude completed the task — ignore any closing
            # courtesy text that might look like a question.
            pass
        else:
            question = detect_question(output)
            if question:
                print(f"\n{C_YELLOW}{'─'*60}")
                print(f"Claude hizo una pregunta:")
                print(f"{'─'*60}{C_RESET}")
                print(question)
                print(f"{C_YELLOW}{'─'*60}{C_RESET}")
                print(f"{C_DIM}Escribe tu respuesta (o 'abort' para detener):{C_RESET}")

                try:
                    user_input = input(f"{C_BOLD}> {C_RESET}").strip()
                except (EOFError, KeyboardInterrupt):
                    print(f"\n{C_RED}Abortado por el usuario.{C_RESET}")
                    return False

                if user_input.lower() == "abort":
                    print(f"{C_RED}Abortado por el usuario.{C_RESET}")
                    logger.log("User aborted after question")
                    return False

                logger.log(f"User answered question: {user_input}")
                prompt = prompt_template.format(story_id=story_id)
                prompt = f"{prompt}\n\nUser clarification: {user_input}"
                continue

        if success:
            print(f"\n{C_GREEN}{step_label} completado para {story_id}{C_RESET}\n")
            logger.log(f"Step {step} completed successfully for {story_id}")
            return True

        # Generic failure
        print(f"\n{C_RED}{step_label} falló (exit code != 0){C_RESET}")
        logger.log(f"Step {step} failed for {story_id}")
        if attempt < MAX_RETRIES:
            print(f"{C_YELLOW}Reintentando en 30s...{C_RESET}")
            countdown_wait(30, logger)
        continue

    print(f"{C_RED}Maximo de reintentos alcanzado para {step_label} [{story_id}]{C_RESET}")
    logger.log(f"Max retries exhausted for {step} on {story_id}")
    return False


# ---------------------------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------------------------
def build_plan(
    stories: list[dict],
    epic_filter: int | None,
    start_story: str | None,
    start_step: str | None,
    state: dict | None,
) -> list[tuple[str, str]]:
    """
    Build ordered list of (story_id, step) pairs to execute.
    Skips done stories. Applies --epic, --story, --step filters and resume state.
    """
    # Filter by epic
    if epic_filter is not None:
        stories = [s for s in stories if s["epic"] == epic_filter]

    # Map sprint-status values to the first orchestrator step to run.
    # - backlog: nothing done yet → start at create
    # - ready-for-dev: create already ran → start at dev
    # - in-progress: dev started (treat as needing dev again) → start at dev
    # - review: dev done, needs review → start at review
    # - done: skip entirely
    STATUS_TO_FIRST_STEP = {
        "backlog": "create",
        "ready-for-dev": "dev",
        "in-progress": "dev",
        "review": "review",
    }

    done_ids = {s["story_id"] for s in stories if s["status"] == "done"}
    pending = [s for s in stories if s["status"] != "done"]

    if done_ids:
        print(f"{C_DIM}Saltando {len(done_ids)} historia(s) ya completadas: {', '.join(sorted(done_ids))}{C_RESET}")

    # Build plan respecting each story's current status
    plan: list[tuple[str, str]] = []
    for s in pending:
        first_step = STATUS_TO_FIRST_STEP.get(s["status"], "create")
        first_idx = STEPS.index(first_step)
        for step in STEPS[first_idx:]:
            plan.append((s["story_id"], step))

    if not plan:
        return plan

    # Determine start point: (1) --story flag, (2) state file, (3) beginning
    resume_story = start_story
    resume_step = start_step

    if resume_story is None and state is not None:
        resume_story = state.get("story_id")
        if state.get("completed", False):
            # Last step was completed — advance to next
            last_step = state.get("step")
            if last_step in STEPS:
                idx = STEPS.index(last_step)
                if idx + 1 < len(STEPS):
                    resume_step = STEPS[idx + 1]
                else:
                    # Story was fully done, start next story from first pending step
                    story_ids = [s["story_id"] for s in pending]
                    if resume_story in story_ids:
                        si = story_ids.index(resume_story)
                        if si + 1 < len(story_ids):
                            resume_story = story_ids[si + 1]
                            resume_step = None  # Will use plan's first step
                        else:
                            return []  # All done
                    else:
                        resume_story = None
        else:
            # Last step was NOT completed — retry it
            resume_step = state.get("step")

    # Apply start_step only for --step flag (first story only)
    if start_story and start_step is None:
        resume_step = STEPS[0]

    # Find the start point in plan
    if resume_story:
        target_step = resume_step or STEPS[0]
        target = (resume_story, target_step)
        if target in plan:
            idx = plan.index(target)
            plan = plan[idx:]
        else:
            # Try to find story at any step
            matching = [(i, p) for i, p in enumerate(plan) if p[0] == resume_story]
            if matching:
                plan = plan[matching[0][0]:]

    return plan


def main():
    parser = argparse.ArgumentParser(
        description="BMAD Story Orchestrator — automates the create→dev→review cycle"
    )
    parser.add_argument("--epic", type=int, metavar="N", help="Solo procesar historias del epic N")
    parser.add_argument("--story", type=str, metavar="ID", help="Empezar desde esta historia (e.g. 3-2)")
    parser.add_argument("--only-story", type=str, metavar="ID", help="Procesar exclusivamente esta historia (e.g. 2-1)")
    parser.add_argument(
        "--step",
        choices=STEPS,
        help="Empezar desde este paso (solo primera historia)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Mostrar el plan sin ejecutar")
    parser.add_argument("--model", type=str, help="Modelo de Claude a usar")
    parser.add_argument("--yes", action="store_true", help="Omitir confirmación interactiva y ejecutar directamente")
    args = parser.parse_args()

    # Normalize --story: accept "3-2" as prefix match
    story_override = None
    if args.story:
        story_override = args.story

    print(f"\n{C_BOLD}{'-'*60}")
    print(f"  BMAD Story Orchestrator")
    print(f"{'-'*60}{C_RESET}\n")

    # Parse sprint status
    if not SPRINT_STATUS.exists():
        print(f"{C_RED}No se encontro {SPRINT_STATUS}{C_RESET}")
        sys.exit(1)

    stories = parse_sprint_status(SPRINT_STATUS)
    if not stories:
        print(f"{C_RED}No se encontraron historias en sprint-status.yaml{C_RESET}")
        sys.exit(1)

    print(f"{C_DIM}Historias encontradas: {len(stories)}{C_RESET}")

    # Resolve --story prefix to full ID
    if story_override:
        matches = [s["story_id"] for s in stories if s["story_id"].startswith(story_override)]
        if len(matches) == 1:
            story_override = matches[0]
        elif len(matches) > 1:
            print(f"{C_RED}'{args.story}' coincide con multiples historias: {matches}{C_RESET}")
            sys.exit(1)
        elif len(matches) == 0:
            exact = [s["story_id"] for s in stories if s["story_id"] == story_override]
            if not exact:
                print(f"{C_RED}Historia '{args.story}' no encontrada en sprint-status.yaml{C_RESET}")
                sys.exit(1)

    # Apply --only-story filter
    if args.only_story:
        only_id = args.only_story
        matches = [s for s in stories if s["story_id"] == only_id or s["story_id"].startswith(only_id)]
        if len(matches) == 0:
            print(f"{C_RED}Historia '{only_id}' no encontrada en sprint-status.yaml{C_RESET}")
            sys.exit(1)
        if len(matches) > 1:
            ids = [s["story_id"] for s in matches]
            print(f"{C_RED}'{only_id}' coincide con multiples historias: {ids}{C_RESET}")
            sys.exit(1)
        stories = matches
        print(f"{C_CYAN}Filtrando exclusivamente historia: {stories[0]['story_id']}{C_RESET}")

    # Load resume state
    state = load_state()
    if state and not story_override and not args.only_story:
        print(f"{C_CYAN}Estado anterior encontrado: story={state.get('story_id')}, "
              f"step={state.get('step')}, completed={state.get('completed')}{C_RESET}")

    # Build plan
    plan = build_plan(stories, args.epic, story_override, args.step, state)

    if not plan:
        print(f"\n{C_GREEN}No hay historias pendientes por procesar.{C_RESET}")
        clear_state()
        sys.exit(0)

    # Display plan
    print(f"\n{C_BOLD}Plan de ejecucion:{C_RESET}")
    current_story = None
    for story_id, step in plan:
        if story_id != current_story:
            current_story = story_id
            print(f"\n  {C_BOLD}{story_id}{C_RESET}")
        print(f"    {step}")

    if args.dry_run:
        print(f"\n{C_YELLOW}--dry-run: no se ejecuta nada.{C_RESET}")
        sys.exit(0)

    if args.yes:
        print(f"\n{C_DIM}Confirmación automática (--yes){C_RESET}")
    else:
        print(f"\n{C_DIM}Escribe {C_RESET}{C_BOLD}C{C_RESET}{C_DIM} para continuar o {C_RESET}{C_BOLD}X{C_RESET}{C_DIM} para cancelar:{C_RESET}")
        try:
            while True:
                choice = input(f"{C_BOLD}> {C_RESET}").strip().upper()
                if choice == "C":
                    break
                elif choice == "X":
                    print(f"\n{C_RED}Cancelado.{C_RESET}")
                    sys.exit(1)
                else:
                    print(f"{C_YELLOW}Opción no válida. Escribe C para continuar o X para cancelar.{C_RESET}")
        except (EOFError, KeyboardInterrupt):
            print(f"\n{C_RED}Cancelado.{C_RESET}")
            sys.exit(1)

    # Execute
    logger = Logger()
    logger.log(f"Orchestrator started. Plan: {len(plan)} steps.")
    if args.model:
        logger.log(f"Model override: {args.model}")

    try:
        for story_id, step in plan:
            logger.open_step_log(story_id, step)
            save_state(story_id, step, completed=False)

            success = execute_step(story_id, step, args.model, logger)

            if success:
                save_state(story_id, step, completed=True)
            else:
                print(f"\n{C_RED}{'-'*60}")
                print(f"  Orquestador detenido en [{story_id}] paso '{step}'")
                print(f"  Reanuda con: python3 scripts/bmad_orchestrator.py")
                print(f"{'-'*60}{C_RESET}")
                logger.log(f"Orchestrator stopped at {story_id}/{step}")
                logger.close()
                sys.exit(1)

        # All done
        clear_state()
        print(f"\n{C_GREEN}{'-'*60}")
        print(f"  Todas las historias completadas exitosamente!")
        print(f"{'-'*60}{C_RESET}\n")
        logger.log("Orchestrator completed all steps successfully.")
        logger.close()

    except KeyboardInterrupt:
        print(f"\n\n{C_YELLOW}Interrumpido por el usuario. Estado guardado.{C_RESET}")
        print(f"{C_DIM}Reanuda con: python3 scripts/bmad_orchestrator.py{C_RESET}")
        logger.log("Orchestrator interrupted by user (KeyboardInterrupt)")
        logger.close()
        sys.exit(130)


if __name__ == "__main__":
    main()
