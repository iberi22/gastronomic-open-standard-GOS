#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Guardian Agent Core Logic - "Evaluation Engine"

.DESCRIPTION
    Analyzes a Pull Request to determine if it is safe to auto-merge.
    Calculates Confidence Score based on:
    1. CI Status
    2. Review Status
    3. Semantic Risk (Risk Map)
    4. Diff Size

    Can run in Local Mode (Dry Run by default) or CI Mode (GitHub Actions).

.PARAMETER PrNumber
    The Pull Request number to evaluate.

.PARAMETER DryRun
    If set, only outputs the decision without executing Merge or Escalate actions.
    Default is $true for local execution security.

.EXAMPLE
    ./guardian-core.ps1 -PrNumber 42
    ./guardian-core.ps1 -PrNumber 42 -DryRun $false
#>

param (
    [Parameter(Mandatory=$true)]
    [string]$PrNumber,

    [switch]$DryRun = $true,

    [switch]$CiMode = $false
)

# --- Configuration ---
$RISK_MAP_FILE = ".gitcore/risk-map.json"
$THRESHOLD_CONFIDENCE = 70
$DEFAULT_RISK = 50

# --- Helper Functions ---
function Log-Info { param([string]$Msg) Write-Host "ℹ️ $Msg" -ForegroundColor Cyan }
function Log-Success { param([string]$Msg) Write-Host "✅ $Msg" -ForegroundColor Green }
function Log-Warn { param([string]$Msg) Write-Host "⚠️ $Msg" -ForegroundColor Yellow }
function Log-Error { param([string]$Msg) Write-Host "❌ $Msg" -ForegroundColor Red }

# Validar dependencias
if (-not (Get-Command "gh" -ErrorAction SilentlyContinue)) {
    Log-Error "GitHub CLI (gh) is required but not found."
    exit 1
}

Log-Info "🛡️ Guardian Agent Core (v3.1)"
Log-Info "Analyzing PR #$PrNumber..."

# --- 1. Fetch PR Data ---
try {
    # Check if PR exists first
    $PrExists = gh pr view $PrNumber --json state 2>$null
    if (-not $PrExists) {
        Log-Error "PR #$PrNumber not found in this repository."
        exit 1
    }

    $PrData = gh pr view $PrNumber --json labels,reviews,additions,deletions,changedFiles,files,headRefName -q "." | ConvertFrom-Json

    # Conclusion is not always available in top-level output, depend on state
    $CheckData = gh pr checks $PrNumber --json name,state | ConvertFrom-Json
} catch {
    Log-Error "Failed to fetch PR data. Check permissions or network."
    exit 1
}

# --- 2. Check Blocking Labels ---
$Labels = $PrData.labels.name
if ($Labels -contains "high-stakes") {
    Log-Warn "BLOCKER: 'high-stakes' label detected."
    $BlockerReason = "High Stakes"
    $HasBlocker = $true
} elseif ($Labels -contains "needs-human") {
    Log-Warn "BLOCKER: 'needs-human' label detected."
    $BlockerReason = "Needs Human"
    $HasBlocker = $true
} else {
    $HasBlocker = $false
}

# --- 3. Check CI Status ---
$FailedChecks = $CheckData | Where-Object { $_.state -ne "SUCCESS" -and $_.state -ne "SKIPPED" -and $_.conclusion -ne "SUCCESS" }
$AllCiPassed = ($FailedChecks.Count -eq 0)

# --- 4. Check Reviews ---
$Approvals = ($PrData.reviews | Where-Object { $_.state -eq "APPROVED" }).Count
$ChangesRequested = ($PrData.reviews | Where-Object { $_.state -eq "CHANGES_REQUESTED" }).Count
$ReviewOk = ($Approvals -gt 0 -and $ChangesRequested -eq 0)

# --- 5. Semantic Risk Analysis (Shadow Mode) ---
$MaxRisk = 0
$RiskReason = "Default"

if (Test-Path $RISK_MAP_FILE) {
    try {
        $RiskMapJson = Get-Content $RISK_MAP_FILE -Raw | ConvertFrom-Json
        $PathsConfig = $RiskMapJson.paths
    } catch {
        Log-Warn "Error parsing risk-map.json"
        $PathsConfig = $null
    }
}

$ChangedFiles = $PrData.files.path
foreach ($File in $ChangedFiles) {
    $CurrentRisk = $DEFAULT_RISK
    $CurrentReason = "Default"

    # Simple wildcard matching simulation
    if ($PathsConfig) {
        # Note: PowerShell object properties are accessible as dictionary keys if structured correctly
        # This is a simplified matching logic. Real implementation needs robust glob matching.

        if ($File -like "src/auth/*") { $CurrentRisk = 100; $CurrentReason = "Critical: Auth" }
        elseif ($File -like ".github/workflows/*") { $CurrentRisk = 95; $CurrentReason = "Critical: CI/CD" }
        elseif ($File -like "docs/*") { $CurrentRisk = 5; $CurrentReason = "Low: Documentation" }
    }

    if ($CurrentRisk -gt $MaxRisk) {
        $MaxRisk = $CurrentRisk
        $RiskReason = $CurrentReason
    }
}
Log-Info "🧠 Semantic Risk (Shadow): $MaxRisk ($RiskReason)"

# --- 6. Calculate Confidence Score ---
$Confidence = 50

# CI Factor (+30)
if ($AllCiPassed) { $Confidence += 30 }

# Review Factor (+20 / -30)
if ($ReviewOk) { $Confidence += 20 }
if ($ChangesRequested -gt 0) { $Confidence -= 30 }

# Size Factor
$TotalLines = $PrData.additions + $PrData.deletions
if ($TotalLines -lt 100) { $Confidence += 20 }
elseif ($TotalLines -lt 300) { $Confidence += 10 }
elseif ($TotalLines -ge 500) { $Confidence -= 10 }

# Clamp
if ($Confidence -gt 100) { $Confidence = 100 }
if ($Confidence -lt 0) { $Confidence = 0 }

Log-Info "📊 Confidence Score: $Confidence%"

# --- 7. Make Decision ---
$Decision = "WAIT"
$Reason = ""

if ($HasBlocker) {
    $Decision = "ESCALATE"
    $Reason = "Blocking label present: $BlockerReason"
} elseif (-not $AllCiPassed) {
    $Decision = "WAIT"
    $Reason = "CI Checks not passed"
} elseif (-not $ReviewOk) {
    $Decision = "WAIT"
    $Reason = "Pending reviews"
} elseif ($Confidence -ge $THRESHOLD_CONFIDENCE) {
    $Decision = "MERGE"
    $Reason = "Confidence ($Confidence%) exceeds threshold ($THRESHOLD_CONFIDENCE%)"
} else {
    $Decision = "ESCALATE"
    $Reason = "Confidence ($Confidence%) too low"
}

Log-Success "🎯 Decision: $Decision ($Reason)"

# --- 8. Act (Or Dry Run) ---
if ($DryRun) {
    Log-Info "[DRY RUN] Would execute: $Decision"
    if ($CiMode) {
        # Export inputs for GitHub Actions subsequent steps if needed, or just exit logic
        Write-Output "::set-output name=decision::$Decision"
        Write-Output "::set-output name=confidence::$Confidence"
    }
    exit 0
}

# Real Execution Logic
switch ($Decision) {
    "MERGE" {
        Log-Info "Executing Auto-Merge..."
        gh pr merge $PrNumber --squash --auto --body "Merged by Guardian Agent (Confidence: $Confidence%)"
    }
    "ESCALATE" {
        Log-Info "Escalating to Human..."
        gh pr edit $PrNumber --add-label "needs-human"
        gh pr comment $PrNumber --body "⚠️ Escalating to human: $Reason"
    }
}
