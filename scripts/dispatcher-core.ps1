#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Dispatcher Core Logic - "Assignment Engine"

.DESCRIPTION
    Analyzes unassigned issues and dispatches them to AI agents or Humans based on Semantic Risk.

    Logic:
    1. Filter issues by Label (default: 'ai-agent').
    2. Check Semantic Risk (Risk Map vs Issue Context).
    3. If High Risk (>80): Escalate to Human.
    4. If Low Risk: Dispatch to Copilot/Jules (Round Robin/Random).

.PARAMETER Strategy
    Distribution strategy: 'round-robin', 'copilot-only', 'jules-only', 'random'.

.PARAMETER MaxIssues
    Max number of issues to process.

.PARAMETER LabelFilter
    Label to search for (default: 'ai-agent').

.PARAMETER DryRun
    If set, only outputs the decision.
#>

param (
    [string]$Strategy = "round-robin",
    [int]$MaxIssues = 5,
    [string]$LabelFilter = "ai-agent",
    [switch]$DryRun = $false
)

# --- Configuration ---
$RISK_MAP_FILE = ".gitcore/risk-map.json"
$HIGH_RISK_THRESHOLD = 80

# --- Helper Functions ---
function Log-Info { param([string]$Msg) Write-Host "ℹ️ $Msg" -ForegroundColor Cyan }
function Log-Success { param([string]$Msg) Write-Host "✅ $Msg" -ForegroundColor Green }
function Log-Warn { param([string]$Msg) Write-Host "⚠️ $Msg" -ForegroundColor Yellow }
function Log-Error { param([string]$Msg) Write-Host "❌ $Msg" -ForegroundColor Red }

if (-not (Get-Command "gh" -ErrorAction SilentlyContinue)) {
    Log-Error "GitHub CLI (gh) is required but not found."
    exit 1
}

Log-Info "🤖 Dispatcher Core (v3.1)"
Log-Info "Strategy: $Strategy | Max: $MaxIssues | Filter: $LabelFilter"

# --- 1. Load Risk Map ---
$RiskKeywords = @{}
if (Test-Path $RISK_MAP_FILE) {
    try {
        $RiskMap = Get-Content $RISK_MAP_FILE -Raw | ConvertFrom-Json
        $PathsConfig = $RiskMap.paths

        foreach ($Pattern in $PathsConfig.PSObject.Properties.Name) {
            $Entry = $PathsConfig.$Pattern
            if ($Entry.risk -ge $HIGH_RISK_THRESHOLD) {
                # Extract simple keyword from pattern (e.g., 'src/auth/*' -> 'auth')
                # This is heuristic.
                if ($Pattern -match "src/([^/]+)/") {
                    $Keyword = $matches[1]
                    $RiskKeywords[$Keyword] = $Entry.risk
                }
            }
        }
        Log-Info "🔥 High Risk Keywords loaded: $($RiskKeywords.Keys -join ', ')"
    } catch {
        Log-Warn "Failed to load Risk Map. Proceeding without risk analysis."
    }
}

# --- 2. Fetch Issues ---
try {
    # Get issues with label, excluding those already assigned to copilot/jules/human
    # Note: Complex filtering in CLI is hard, fetching JSON and filtering in PowerShell is better.
    $IssuesJson = gh issue list --label "$LabelFilter" --json number,title,labels,body --limit 100
    if (-not $IssuesJson) {
        Log-Info "No issues found with label '$LabelFilter'."
        exit 0
    }
    $AllIssues = $IssuesJson | ConvertFrom-Json
} catch {
    Log-Error "Failed to fetch issues."
    exit 1
}

# Filter out already assigned ones (heuristic)
$Candidates = @()
foreach ($Issue in $AllIssues) {
    $AssignedAgents = $Issue.labels.name | Where-Object { $_ -in "copilot","jules","needs-human" }
    if (-not $AssignedAgents) {
        $Candidates += $Issue
    }
}

$Count = [Math]::Min($Candidates.Count, $MaxIssues)
if ($Count -eq 0) {
    Log-Info "No unassigned candidates found."
    exit 0
}

Log-Info "Found $Count candidates to dispatch."

# --- 3. Dispatch Loop ---
$CopilotCount = 0
$JulesCount = 0
$HumanCount = 0

for ($i = 0; $i -lt $Count; $i++) {
    $Issue = $Candidates[$i]
    $RiskScore = 0
    $RiskReason = "Default"

    # --- Semantic Risk Analysis ---
    # Check Title and Labels for Risk Keywords
    foreach ($Key in $RiskKeywords.Keys) {
        if ($Issue.title -match "$Key" -or ($Issue.labels.name -contains $Key)) {
            $RiskScore = $RiskKeywords[$Key]
            $RiskReason = "High Risk Keyword detected: '$Key' (Risk: $RiskScore)"
            break
        }
    }

    # --- Decision ---
    $AssignedAgent = ""

    if ($RiskScore -ge $HIGH_RISK_THRESHOLD) {
        $AssignedAgent = "human"
    } else {
        # Select Agent based on Strategy
        switch ($Strategy) {
            "copilot-only" { $AssignedAgent = "copilot" }
            "jules-only"   { $AssignedAgent = "jules" }
            "random" {
                if ((Get-Random -Minimum 0 -Maximum 2) -eq 0) { $AssignedAgent = "copilot" } else { $AssignedAgent = "jules" }
            }
            "round-robin" {
                # Simple round robin based on loop index even/odd
                if ($i % 2 -eq 0) { $AssignedAgent = "copilot" } else { $AssignedAgent = "jules" }
            }
            Default { $AssignedAgent = "copilot" }
        }
    }

    Log-Info "Processing Issue #$($Issue.number): '$($Issue.title)' -> $AssignedAgent"

    if ($DryRun) {
        Log-Info "[DRY RUN] Would assign to $AssignedAgent"
        continue
    }

    # --- Execution ---
    if ($AssignedAgent -eq "human") {
        gh issue edit $Issue.number --add-label "needs-human" --remove-label $LabelFilter
        gh issue comment $Issue.number --body "⚠️ **Dispatcher**: High Risk detected ($RiskReason). Escalating to Human Review."
        $HumanCount++
    } else {
        gh issue edit $Issue.number --add-label $AssignedAgent --remove-label $LabelFilter

        $Body = "🤖 **Agent Dispatcher**: Assigned to **$AssignedAgent**.`n`n"
        $Body += "- Strategy: $Strategy`n"
        $Body += "- Risk Analysis: Safe (Score: $RiskScore)`n"

        gh issue comment $Issue.number --body $Body

        if ($AssignedAgent -eq "copilot") { $CopilotCount++ } else { $JulesCount++ }
    }
}

Log-Success "Dispatch Complete: Copilot=$CopilotCount, Jules=$JulesCount, Human=$HumanCount"
