#!/usr/bin/env bash

# Detect repository type and configure environment variables for workflows
# This script detects whether the repository is public or private and sets
# appropriate configuration for GitHub Actions workflows to optimize resource usage.

set -euo pipefail

REPOSITORY="${GITHUB_REPOSITORY:-${1:-}}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
RESET='\033[0m'

echo -e "${CYAN}🔍 Repository Configuration Detection${RESET}\n"

if [ -z "$REPOSITORY" ]; then
    echo -e "${RED}❌ Error: REPOSITORY not set${RESET}"
    echo "Usage: $0 [owner/repo]"
    exit 1
fi

# Detect repository visibility
if command -v gh &> /dev/null; then
    REPO_JSON=$(gh repo view "$REPOSITORY" --json visibility,isPrivate 2>/dev/null || echo '{"isPrivate":true,"visibility":"PRIVATE"}')
    IS_PRIVATE=$(echo "$REPO_JSON" | jq -r '.isPrivate')
    VISIBILITY=$(echo "$REPO_JSON" | jq -r '.visibility')

    if [ "$IS_PRIVATE" = "false" ]; then
        IS_PUBLIC="true"
    else
        IS_PUBLIC="false"
    fi
else
    echo -e "${YELLOW}⚠️  gh CLI not found, defaulting to PRIVATE${RESET}"
    IS_PUBLIC="false"
    VISIBILITY="PRIVATE"
fi

echo -e "📊 Repository: ${CYAN}$REPOSITORY${RESET}"
echo -e "🔒 Visibility: ${CYAN}$VISIBILITY${RESET}"

# Detect if main protocol repository
IS_MAIN_REPO="false"
if [[ "$REPOSITORY" =~ (Git-Core-Protocol|git-core|GitCore|ai-git-core) ]]; then
    IS_MAIN_REPO="true"
fi
echo -e "🏠 Is Main Repo: ${CYAN}$IS_MAIN_REPO${RESET}"

# Determine schedule mode
SCHEDULE_MODE="conservative"
ENABLE_SCHEDULES="false"

if [ "$IS_PUBLIC" = "true" ]; then
    # Public repos: Unlimited Actions minutes
    SCHEDULE_MODE="aggressive"
    ENABLE_SCHEDULES="true"
    echo -e "${GREEN}✅ PUBLIC repo: Aggressive scheduling enabled (unlimited minutes)${RESET}"
elif [ "$IS_MAIN_REPO" = "true" ]; then
    # Main repo (even if private): Moderate scheduling
    SCHEDULE_MODE="moderate"
    ENABLE_SCHEDULES="true"
    echo -e "${YELLOW}⚠️  MAIN PRIVATE repo: Moderate scheduling (2,000 min/month limit)${RESET}"
else
    # Other private repos: Conservative (event-based only)
    SCHEDULE_MODE="conservative"
    ENABLE_SCHEDULES="false"
    echo -e "${RED}🔒 PRIVATE repo: Conservative mode (event-based triggers only)${RESET}"
fi

# Output for GitHub Actions
if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "is_public=$IS_PUBLIC" >> "$GITHUB_OUTPUT"
    echo "is_main_repo=$IS_MAIN_REPO" >> "$GITHUB_OUTPUT"
    echo "enable_schedules=$ENABLE_SCHEDULES" >> "$GITHUB_OUTPUT"
    echo "schedule_mode=$SCHEDULE_MODE" >> "$GITHUB_OUTPUT"
fi

# Output for local usage
echo ""
echo "📋 Configuration Summary:"
echo "   IS_PUBLIC=$IS_PUBLIC"
echo "   IS_MAIN_REPO=$IS_MAIN_REPO"
echo "   ENABLE_SCHEDULES=$ENABLE_SCHEDULES"
echo "   SCHEDULE_MODE=$SCHEDULE_MODE"

echo ""
echo -e "${CYAN}💡 Schedule Mode Details:${RESET}"
case "$SCHEDULE_MODE" in
    aggressive)
        echo -e "   ${GREEN}• All scheduled workflows enabled${RESET}"
        echo -e "   ${GREEN}• High-frequency schedules (every 30 min)${RESET}"
        echo -e "   ${GREEN}• Multi-repo monitoring enabled${RESET}"
        echo -e "   ${GREEN}• Estimated: ~600 min/day (unlimited)${RESET}"
        ;;
    moderate)
        echo -e "   ${YELLOW}• Essential schedules only${RESET}"
        echo -e "   ${YELLOW}• Reduced frequency (every 6 hours)${RESET}"
        echo -e "   ${YELLOW}• Single-repo monitoring${RESET}"
        echo -e "   ${YELLOW}• Estimated: ~100 min/day (~3,000 min/month)${RESET}"
        ;;
    conservative)
        echo -e "   ${RED}• No scheduled workflows${RESET}"
        echo -e "   ${RED}• Event-based triggers only (push, PR, issues)${RESET}"
        echo -e "   ${RED}• Minimal resource usage${RESET}"
        echo -e "   ${RED}• Estimated: ~20 min/day (~600 min/month)${RESET}"
        ;;
esac

echo ""
