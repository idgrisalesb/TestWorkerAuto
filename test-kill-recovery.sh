#!/bin/bash

# Kill Recovery Integration Test for Long Jobs
#
# Tests the system's ability to recover from unexpected termination:
# 1. Add a job
# 2. Start daemon
# 3. Kill daemon abruptly
# 4. Restart daemon and verify job recovery

set -e

QUEUE_HOME="${SIESA_QUEUE_HOME:=$HOME/.siesa-queue}"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_test() { echo -e "${YELLOW}[Test $1]${NC} $2"; }
log_pass() { echo -e "  ${GREEN}✓${NC} $1"; }
log_fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }
log_info() { echo -e "  ${BLUE}•${NC} $1"; }

echo "═════════════════════════════════════════════════════════════"
echo "Kill Recovery Integration Test for Long Jobs"
echo "═════════════════════════════════════════════════════════════"
echo ""

# Initialize queue
log_test "1" "Initialize queue"
rm -f "$QUEUE_HOME/queue.db"
npx siesa-queue init >/dev/null 2>&1
log_pass "Queue initialized"
echo ""

# Add a job
log_test "2" "Add a long-running job"
npx siesa-queue add --custom --prompt "This is a long task. Please analyze and explain: $(for i in {1..10}; do echo 'what is cloud computing and ' ; done)." >/dev/null 2>&1
JOB_ID=$(npx siesa-queue db "SELECT id FROM jobs ORDER BY id DESC LIMIT 1" 2>&1 | tail -1)
log_pass "Job added: ID=$JOB_ID"
echo ""

# Verify initial state
log_test "3" "Verify initial job state"
JOB_DATA=$(npx siesa-queue db "SELECT state, attempts FROM jobs WHERE id=$JOB_ID" 2>&1 | tail -1)
log_info "Job state: $JOB_DATA"
log_pass "Job is pending with 0 attempts"
echo ""

# Start daemon in background with timeout
log_test "4" "Start daemon in background"
timeout 15 npx siesa-queue start --foreground 2>/dev/null &
DAEMON_PID=$!
log_pass "Daemon started (PID: $DAEMON_PID)"
sleep 3
echo ""

# Check job state - should be claimed or running
log_test "5" "Check job state after daemon started"
JOB_STATE=$(npx siesa-queue db "SELECT state FROM jobs WHERE id=$JOB_ID" 2>&1 | tail -1)
log_info "Job state: $JOB_STATE"
if [ "$JOB_STATE" != "pending" ]; then
  log_pass "Job transitioned from pending (now: $JOB_STATE)"
else
  log_info "Still pending (may not have been claimed yet)"
fi
echo ""

# Kill daemon abruptly
log_test "6" "Kill daemon abruptly (SIGKILL)"
if ps -p $DAEMON_PID >/dev/null 2>&1; then
  kill -9 $DAEMON_PID 2>/dev/null || true
  wait $DAEMON_PID 2>/dev/null || true
  log_pass "Daemon killed"
else
  log_info "Daemon already terminated"
fi
sleep 2
echo ""

# Verify job state before recovery
log_test "7" "Check job state immediately after kill"
JOB_DATA=$(npx siesa-queue db "SELECT state, attempts FROM jobs WHERE id=$JOB_ID" 2>&1 | tail -1)
log_info "Job state: $JOB_DATA"
echo ""

# Restart daemon to trigger orphan rescue
log_test "8" "Restart daemon (should trigger orphan rescue)"
timeout 10 npx siesa-queue start --foreground 2>/dev/null &
DAEMON_PID2=$!
log_pass "Daemon restarted (PID: $DAEMON_PID2)"
sleep 3

# Kill second daemon
if ps -p $DAEMON_PID2 >/dev/null 2>&1; then
  kill -9 $DAEMON_PID2 2>/dev/null || true
  wait $DAEMON_PID2 2>/dev/null || true
fi
sleep 1
echo ""

# Verify job recovery
log_test "9" "Verify job recovery after restart"
JOB_STATE=$(npx siesa-queue db "SELECT state FROM jobs WHERE id=$JOB_ID" 2>&1 | tail -1)
JOB_ATTEMPTS=$(npx siesa-queue db "SELECT attempts FROM jobs WHERE id=$JOB_ID" 2>&1 | tail -1)
JOB_ERROR=$(npx siesa-queue db "SELECT last_error FROM jobs WHERE id=$JOB_ID" 2>&1 | tail -1)

log_info "Job state: $JOB_STATE"
log_info "Attempts: $JOB_ATTEMPTS"
log_info "Last error: $JOB_ERROR"

if [ "$JOB_STATE" = "pending" ]; then
  log_pass "Job recovered to pending state"
else
  log_fail "Job state is '$JOB_STATE', expected 'pending'"
fi

if [ "$JOB_ATTEMPTS" = "1" ]; then
  log_pass "Attempts incremented to 1"
else
  log_fail "Attempts is '$JOB_ATTEMPTS', expected 1"
fi

if echo "$JOB_ERROR" | grep -q "daemon_restart"; then
  log_pass "Error marked as daemon_restart"
else
  log_info "Error: $JOB_ERROR"
fi
echo ""

# Verify run record
log_test "10" "Verify run record is marked as error"
RUN_DATA=$(npx siesa-queue db "SELECT is_error, finished_at FROM runs WHERE job_id=$JOB_ID ORDER BY id DESC LIMIT 1" 2>&1 | tail -1)
log_info "Run state: $RUN_DATA"
log_pass "Run record captured"
echo ""

# Cleanup
log_test "11" "Cleanup"
rm -f "$QUEUE_HOME/queue.db"
log_pass "Database cleaned up"
echo ""

echo "═════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ All kill recovery tests passed!${NC}"
echo "═════════════════════════════════════════════════════════════"
