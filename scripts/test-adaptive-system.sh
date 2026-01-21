#!/usr/bin/env bash

# Test suite for Adaptive Workflow System
# Validates that the adaptive workflow system correctly detects repository type
# and applies appropriate configurations.

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

test_assert() {
    local condition=$1
    local test_name=$2
    local error_msg=${3:-}

    ((TESTS_TOTAL++))

    if [ "$condition" = "true" ]; then
        echo -e "  ${GREEN}✓${RESET} $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "  ${RED}✗${RESET} $test_name"
        if [ -n "$error_msg" ]; then
            echo -e "    ${RED}→${RESET} $error_msg"
        fi
        ((TESTS_FAILED++))
    fi
}

echo -e "${CYAN}════════════════════════════════════════════════════════════════${RESET}"
echo -e "${CYAN}  🧪 Adaptive Workflow System - Test Suite                      ${RESET}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${RESET}"
echo ""

# ═══════════════════════════════════════════════════════════════════
# TEST 1: File Existence
# ═══════════════════════════════════════════════════════════════════
echo -e "${YELLOW}[1/6]${RESET} Testing file existence..."

test_assert \
    "$([ -f 'scripts/detect-repo-config.ps1' ] && echo true || echo false)" \
    "detect-repo-config.ps1 exists"

test_assert \
    "$([ -f 'scripts/detect-repo-config.sh' ] && echo true || echo false)" \
    "detect-repo-config.sh exists"

test_assert \
    "$([ -f '.github/workflows/_repo-config.yml' ] && echo true || echo false)" \
    "_repo-config.yml exists"

test_assert \
    "$([ -f 'docs/ADAPTIVE_WORKFLOWS.md' ] && echo true || echo false)" \
    "ADAPTIVE_WORKFLOWS.md exists"

# ═══════════════════════════════════════════════════════════════════
# TEST 2: Script Executability
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}[2/6]${RESET} Testing script executability..."

test_assert \
    "$([ -x 'scripts/detect-repo-config.sh' ] && echo true || echo false)" \
    "Bash script has execute permission"

# ═══════════════════════════════════════════════════════════════════
# TEST 3: Detection Script Output
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}[3/6]${RESET} Testing detection script output..."

if OUTPUT=$(./scripts/detect-repo-config.sh 2>&1); then
    test_assert \
        "$(echo "$OUTPUT" | grep -q 'IS_PUBLIC=' && echo true || echo false)" \
        "Script outputs IS_PUBLIC"

    test_assert \
        "$(echo "$OUTPUT" | grep -q 'IS_MAIN_REPO=' && echo true || echo false)" \
        "Script outputs IS_MAIN_REPO"

    test_assert \
        "$(echo "$OUTPUT" | grep -q 'ENABLE_SCHEDULES=' && echo true || echo false)" \
        "Script outputs ENABLE_SCHEDULES"

    test_assert \
        "$(echo "$OUTPUT" | grep -q 'SCHEDULE_MODE=' && echo true || echo false)" \
        "Script outputs SCHEDULE_MODE"
else
    test_assert "false" "Script runs without errors" "$OUTPUT"
fi

# ═══════════════════════════════════════════════════════════════════
# TEST 4: Workflow Syntax Validation
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}[4/6]${RESET} Testing workflow YAML syntax..."

WORKFLOWS=(
    ".github/workflows/_repo-config.yml"
    ".github/workflows/global-self-healing.yml"
    ".github/workflows/email-cleanup.yml"
    ".github/workflows/copilot-meta-analysis.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
    workflow_name=$(basename "$workflow")

    if [ -f "$workflow" ]; then
        HAS_NAME=$(grep -q "^name:" "$workflow" && echo true || echo false)
        HAS_ON=$(grep -q "^on:" "$workflow" && echo true || echo false)
        HAS_JOBS=$(grep -q "^jobs:" "$workflow" && echo true || echo false)

        IS_VALID=$([ "$HAS_NAME" = "true" ] && [ "$HAS_ON" = "true" ] && [ "$HAS_JOBS" = "true" ] && echo true || echo false)

        test_assert "$IS_VALID" "$workflow_name has valid YAML structure"
    fi
done

# ═══════════════════════════════════════════════════════════════════
# TEST 5: Timeout-Minutes Presence
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}[5/6]${RESET} Testing timeout-minutes in workflows..."

CRITICAL_WORKFLOWS=(
    ".github/workflows/global-self-healing.yml"
    ".github/workflows/email-cleanup.yml"
    ".github/workflows/copilot-meta-analysis.yml"
    ".github/workflows/planner-agent.yml"
    ".github/workflows/guardian-agent.yml"
    ".github/workflows/agent-dispatcher.yml"
)

for workflow in "${CRITICAL_WORKFLOWS[@]}"; do
    if [ -f "$workflow" ]; then
        workflow_name=$(basename "$workflow")
        HAS_TIMEOUT=$(grep -q "timeout-minutes:" "$workflow" && echo true || echo false)

        test_assert "$HAS_TIMEOUT" "$workflow_name has timeout-minutes defined"
    fi
done

# ═══════════════════════════════════════════════════════════════════
# TEST 6: Documentation Completeness
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}[6/6]${RESET} Testing documentation completeness..."

DOC_CONTENT=$(cat "docs/ADAPTIVE_WORKFLOWS.md")

REQUIRED_SECTIONS=(
    "Adaptive Workflow System"
    "AGGRESSIVE"
    "MODERATE"
    "CONSERVATIVE"
    "Installation"
    "Troubleshooting"
)

for section in "${REQUIRED_SECTIONS[@]}"; do
    HAS_SECTION=$(echo "$DOC_CONTENT" | grep -q "$section" && echo true || echo false)
    test_assert "$HAS_SECTION" "Documentation contains '$section' section"
done

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════${RESET}"
echo "  📊 Test Summary"
echo -e "${CYAN}════════════════════════════════════════════════════════════════${RESET}"
echo ""
echo "  Total:  $TESTS_TOTAL"
echo -e "  ${GREEN}Passed: $TESTS_PASSED${RESET}"
echo -e "  ${RED}Failed: $TESTS_FAILED${RESET}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${RESET}"
    exit 1
fi
