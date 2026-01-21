#!/bin/bash
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PR_NUMBER=$1
DELETE_BRANCH=${2:-true}
MERGE_METHOD=${3:-squash}

if [ -z "$PR_NUMBER" ]; then
    echo -e "${RED}❌ Uso: ./merge-draft-pr.sh <PR_NUMBER> [DELETE_BRANCH] [MERGE_METHOD]${NC}"
    echo -e "${CYAN}Ejemplo: ./merge-draft-pr.sh 69 true squash${NC}"
    exit 1
fi

echo -e "${CYAN}🔍 Verificando estado del PR #$PR_NUMBER...${NC}"

# Obtener info del PR
PR_INFO=$(gh pr view "$PR_NUMBER" --json isDraft,state,id,title,author)
IS_DRAFT=$(echo "$PR_INFO" | jq -r '.isDraft')
STATE=$(echo "$PR_INFO" | jq -r '.state')
PR_ID=$(echo "$PR_INFO" | jq -r '.id')
TITLE=$(echo "$PR_INFO" | jq -r '.title')
AUTHOR=$(echo "$PR_INFO" | jq -r '.author.login')

echo -e "${NC}📋 PR #${PR_NUMBER}: $TITLE${NC}"
echo -e "${NC}👤 Autor: $AUTHOR${NC}"

if [ "$STATE" != "OPEN" ]; then
    echo -e "${RED}❌ PR #$PR_NUMBER no está abierto (estado: $STATE)${NC}"
    exit 1
fi

# Convertir draft a ready si es necesario
if [ "$IS_DRAFT" = "true" ]; then
    echo -e "${YELLOW}📝 PR está en draft. Convirtiendo a ready...${NC}"

    gh api graphql -f query="mutation { markPullRequestReadyForReview(input: {pullRequestId: \"$PR_ID\"}) { pullRequest { id isDraft } } }" > /dev/null

    echo -e "${GREEN}✅ PR marcado como ready${NC}"
else
    echo -e "${GREEN}✅ PR ya está listo para merge${NC}"
fi

# Hacer merge
echo -e "${CYAN}🔀 Haciendo $MERGE_METHOD merge del PR #$PR_NUMBER...${NC}"

MERGE_ARGS="$PR_NUMBER --$MERGE_METHOD"
if [ "$DELETE_BRANCH" = "true" ]; then
    MERGE_ARGS="$MERGE_ARGS --delete-branch"
fi

gh pr merge $MERGE_ARGS

echo -e "${GREEN}✅ PR #$PR_NUMBER mergeado exitosamente${NC}"
echo -e "${CYAN}🎉 Cambios integrados a main${NC}"
