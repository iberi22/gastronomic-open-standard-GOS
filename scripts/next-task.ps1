<#
.SYNOPSIS
    Selects the next priority task, creates a branch, and assigns it to an AI agent.
#>

param (
    [switch]$Auto,
    [string]$AgentOverride
)

# 0. Ensure 'gc' alias doesn't conflict with Get-Content
if ((Get-Alias gc -ErrorAction SilentlyContinue).Definition -eq "Get-Content") {
    Remove-Item alias:gc -Force -ErrorAction SilentlyContinue
}

# 1. Scan for Issues
Write-Host "🔍 Scanning Protocol for pending tasks..." -ForegroundColor Cyan

# Priority Order: label:bug, label:priority-high, then others
$issues = gh issue list --json number,title,labels,body --state open --limit 10 | ConvertFrom-Json

if (-not $issues -or $issues.Count -eq 0) {
    Write-Host "✅ No open issues found!" -ForegroundColor Green
    exit
}

# Simple Sorting Logic (Bugs first)
$selected = $issues | Sort-Object {
    if ($_.labels.name -contains "bug") { 0 }
    elseif ($_.labels.name -contains "urgent") { 1 }
    else { 2 }
} | Select-Object -First 1

$id = $selected.number
$title = $selected.title
$body = $selected.body

Write-Host "🎯 Selected Task: #$id - $title" -ForegroundColor Yellow
if (-not $Auto) {
    $confirm = Read-Host "Start this task? (Y/n)"
    if ($confirm -match "^[nN]") { exit }
}

# 2. Init Workspace via CLI
Write-Host "🚀 Initializing Workspace..."
# Parse JSON from gc task to get branch name if needed, but for now just run it
gc task "$title"

# 3. Agent Dispatch Strategy
$agent = "copilot" # Default
$is_complex = ($body.Length -gt 500) -or ($title -match "Implement|Create|Refactor")
$has_jules_label = ($selected.labels.name -contains "jules")

if ($AgentOverride) {
    $agent = $AgentOverride
} elseif ($has_jules_label -or $is_complex) {
    $agent = "jules"
}

Write-Host "🤖 Selected Agent: $agent" -ForegroundColor Magenta

switch ($agent) {
    "jules" {
        Write-Host "⚡ Triggering Jules (Async)..."

        # Ensure main is fresh for the agent
        git fetch origin main
        try {
            git merge origin/main
        } catch {
            Write-Warning "Merge conflict or error merging main. Please resolve manually."
        }

        # Label and Comment to trigger
        gh issue edit $id --add-label "jules"
        gh issue comment $id --body "@jules build this (triggered via next-task)"

        Write-Host "✅ Jules triggered on PR/Issue #$id. Check GitHub for progress." -ForegroundColor Green
    }
    "copilot" {
        Write-Host "💡 Starting Copilot Session..."
        Write-Host "Run this command to get help:" -ForegroundColor Yellow
        Write-Host "gh copilot suggest `"$title`""
    }
    "gemini" {
         Write-Host "✨ Starting Gemini Context..."
         # Placeholder for Gemini CLI interaction
         gc context suggest
    }
}
