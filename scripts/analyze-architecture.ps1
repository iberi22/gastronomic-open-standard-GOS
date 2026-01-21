<#
.SYNOPSIS
    Generates a comprehensive context prompt for AI Architecture Analysis.

.DESCRIPTION
    Scans the current project structure, reads key documentation files (README, ARCHITECTURE, AGENTS),
    and packages them into a single markdown prompt file. This file is designed to be fed into
    an AI (like GitHub Copilot or ChatGPT) to perform a robust architecture review.

.EXAMPLE
    .\scripts\analyze-architecture.ps1
#>

$ErrorActionPreference = "Stop"

# --- Configuration ---
$PROMPTS_DIR = "docs/prompts"
$OUTPUT_PREFIX = "ARCHITECTURE_REVIEW"
$MAX_FILE_SIZE_KB = 50 # Skip files larger than this for context inclusion

# --- Helper Functions ---

function Get-ProjectTree {
    # Generates a tree structure ignoring git and common temp dirs
    $exclude = @(".git", ".vs", "node_modules", "target", "dist", "build", ".gemini", ".history")

    Get-ChildItem -Recurse | Where-Object {
        $path = $_.FullName
        $params = $exclude | ForEach-Object { [regex]::Escape($_) }
        $pattern = ($params -join "|")
        $path -notmatch "\\($pattern)(\\|$)"
    } | ForEach-Object {
        $relPath = $_.FullName.Substring((Get-Location).Path.Length + 1)
        if ($_.PSIsContainer) { "$relPath/" } else { $relPath }
    }
}

function Get-FileContent {
    param($Path)
    if (Test-Path $Path) {
        $item = Get-Item $Path
        if ($item.Length -lt ($MAX_FILE_SIZE_KB * 1024)) {
            $content = Get-Content $Path -Raw
            return @"

### File: $Path
```
$content
```
"@
        } else {
            return "`n(File $Path skipped - too large)"
        }
    }
    return ""
}

# --- Main Execution ---

Write-Host "🧠 Git-Core Architecture Analyzer" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# 1. Prepare Output Directory
if (-not (Test-Path $PROMPTS_DIR)) {
    New-Item -ItemType Directory -Force -Path $PROMPTS_DIR | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$outputFile = "$PROMPTS_DIR/${OUTPUT_PREFIX}_${timestamp}.md"

Write-Host "🔍 Gathering project context..." -ForegroundColor Yellow

# 2. Gather Context
$projectTree = Get-ProjectTree | Out-String
$readme = Get-FileContent "README.md"
$architecture = if (Test-Path ".gitcore/ARCHITECTURE.md") { Get-FileContent ".gitcore/ARCHITECTURE.md" } else { Get-FileContent ".gitcore/ARCHITECTURE.md" }
$agents = Get-FileContent "AGENTS.md"
$installScript = Get-FileContent "install.ps1"

# 3. Construct Prompt
$promptContent = @"
# Architecture Analysis Request

**Context:** I need you to act as a Senior Software Architect and review the following project.
Your goal is to understand the project structure, current architecture, and goals, and then provide a robust architecture assessment.

## Project Structure
```text
$projectTree
```

## Key Documentation

$readme

$architecture

$agents

## Core Scripts

$installScript

## Instructions for AI

1.  **Analyze the Structure**: Does the folder structure make sense for the project type?
2.  **Review the Architecture**: Look for gaps in the `ARCHITECTURE.md`. Are key decisions missing?
3.  **Check Consistency**: Do the `AGENTS.md` rules align with the code structure?
4.  **Recommendations**: Provide concrete steps to improve the robustness of the system.
5.  **Diagram**: Generate a Mermaid diagram representing the high-level system components if possible.

"@

# 4. Save File
$promptContent | Out-File -FilePath $outputFile -Encoding utf8
$absolutePath = (Resolve-Path $outputFile).Path

Write-Host ""
Write-Host "✅ Analysis Prompt Generated!" -ForegroundColor Green
Write-Host "   File: $absolutePath" -ForegroundColor White
Write-Host ""
Write-Host "🚀 HOW TO USE:" -ForegroundColor Yellow
Write-Host "   1. Open the file above."
Write-Host "   2. Copy the entire content."
Write-Host "   3. Paste it into your AI chat (Copilot, ChatGPT, Claude)."
Write-Host "   4. Ask follow-up questions based on the analysis."
Write-Host ""

# Copy path to clipboard for convenience
Set-Clipboard -Value "#file:$absolutePath"
Write-Host "📋 File reference copied to clipboard!" -ForegroundColor Gray
