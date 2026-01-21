#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Test suite for Adaptive Workflow System

.DESCRIPTION
    Validates that the adaptive workflow system correctly detects repository type
    and applies appropriate configurations.

.PARAMETER Verbose
    Show detailed test output
#>

param(
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

# Colors
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

$TestsPassed = 0
$TestsFailed = 0
$TestsTotal = 0

function Test-Assert {
    param(
        [bool]$Condition,
        [string]$TestName,
        [string]$ErrorMessage = ""
    )

    $script:TestsTotal++

    if ($Condition) {
        Write-Host "  ${Green}✓${Reset} $TestName" -ForegroundColor Green
        $script:TestsPassed++
    } else {
        Write-Host "  ${Red}✗${Reset} $TestName" -ForegroundColor Red
        if ($ErrorMessage) {
            Write-Host "    ${Red}→${Reset} $ErrorMessage" -ForegroundColor Red
        }
        $script:TestsFailed++
    }
}

Write-Host "${Cyan}════════════════════════════════════════════════════════════════${Reset}"
Write-Host "${Cyan}  🧪 Adaptive Workflow System - Test Suite                      ${Reset}"
Write-Host "${Cyan}════════════════════════════════════════════════════════════════${Reset}"
Write-Host ""

# ═══════════════════════════════════════════════════════════════════
# TEST 1: File Existence
# ═══════════════════════════════════════════════════════════════════
Write-Host "${Yellow}[1/6]${Reset} Testing file existence..."

Test-Assert `
    (Test-Path "scripts/detect-repo-config.ps1") `
    "detect-repo-config.ps1 exists"

Test-Assert `
    (Test-Path "scripts/detect-repo-config.sh") `
    "detect-repo-config.sh exists"

Test-Assert `
    (Test-Path ".github/workflows/_repo-config.yml") `
    "_repo-config.yml exists"

Test-Assert `
    (Test-Path "docs/ADAPTIVE_WORKFLOWS.md") `
    "ADAPTIVE_WORKFLOWS.md exists"

# ═══════════════════════════════════════════════════════════════════
# TEST 2: Script Executability
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "${Yellow}[2/6]${Reset} Testing script executability..."

try {
    $null = Get-Command "scripts/detect-repo-config.ps1" -ErrorAction Stop
    Test-Assert $true "PowerShell script is accessible"
} catch {
    Test-Assert $false "PowerShell script is accessible" "Script not found or not executable"
}

if ($IsLinux -or $IsMacOS) {
    $hasExecutePerm = (Get-Item "scripts/detect-repo-config.sh").UnixMode -match "x"
    Test-Assert $hasExecutePerm "Bash script has execute permission"
}

# ═══════════════════════════════════════════════════════════════════
# TEST 3: Detection Script Output
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "${Yellow}[3/6]${Reset} Testing detection script output..."

try {
    # Capture all output streams including Write-Host (Information stream)
    $output = & "./scripts/detect-repo-config.ps1" *>&1 | Out-String
    # Strip ANSI escape codes
    $cleanOutput = $output -replace '\x1b\[[0-9;]*m', ''

    Test-Assert `
        ($cleanOutput -match "IS_PUBLIC=(true|false)") `
        "Script outputs IS_PUBLIC with value"

    Test-Assert `
        ($cleanOutput -match "IS_MAIN_REPO=(true|false)") `
        "Script outputs IS_MAIN_REPO with value"

    Test-Assert `
        ($cleanOutput -match "ENABLE_SCHEDULES=(true|false)") `
        "Script outputs ENABLE_SCHEDULES with value"

    Test-Assert `
        ($cleanOutput -match "SCHEDULE_MODE=(aggressive|moderate|conservative)") `
        "Script outputs SCHEDULE_MODE with value"

    if ($Verbose) {
        Write-Host "    ${Cyan}Output:${Reset}"
        Write-Host "    $cleanOutput"
    }
} catch {
    Test-Assert $false "Script runs without errors" $_.Exception.Message
}

# ═══════════════════════════════════════════════════════════════════
# TEST 4: Workflow Syntax Validation
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "${Yellow}[4/6]${Reset} Testing workflow YAML syntax..."

$workflowsToTest = @(
    ".github/workflows/_repo-config.yml",
    ".github/workflows/global-self-healing.yml",
    ".github/workflows/email-cleanup.yml",
    ".github/workflows/copilot-meta-analysis.yml"
)

foreach ($workflow in $workflowsToTest) {
    if (Test-Path $workflow) {
        $content = Get-Content $workflow -Raw
        $workflowName = Split-Path $workflow -Leaf

        # Check for basic YAML structure
        $hasName = $content -match "(?m)^name:"
        $hasOn = $content -match "(?m)^on:"
        $hasJobs = $content -match "(?m)^jobs:"

        $isValid = $hasName -and $hasOn -and $hasJobs

        Test-Assert $isValid "$workflowName has valid YAML structure"
    }
}

# ═══════════════════════════════════════════════════════════════════
# TEST 5: Timeout-Minutes Presence
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "${Yellow}[5/6]${Reset} Testing timeout-minutes in workflows..."

$criticalWorkflows = @(
    ".github/workflows/global-self-healing.yml",
    ".github/workflows/email-cleanup.yml",
    ".github/workflows/copilot-meta-analysis.yml",
    ".github/workflows/planner-agent.yml",
    ".github/workflows/guardian-agent.yml",
    ".github/workflows/agent-dispatcher.yml"
)

foreach ($workflow in $criticalWorkflows) {
    if (Test-Path $workflow) {
        $content = Get-Content $workflow -Raw
        $workflowName = Split-Path $workflow -Leaf

        $hasTimeout = $content -match "timeout-minutes:"

        Test-Assert $hasTimeout "$workflowName has timeout-minutes defined"
    }
}

# ═══════════════════════════════════════════════════════════════════
# TEST 6: Documentation Completeness
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "${Yellow}[6/6]${Reset} Testing documentation completeness..."

$docContent = Get-Content "docs/ADAPTIVE_WORKFLOWS.md" -Raw

$requiredSections = @(
    "Adaptive Workflow System",
    "AGGRESSIVE",
    "MODERATE",
    "CONSERVATIVE",
    "(Installation|Instalación)",
    "Troubleshooting"
)

foreach ($section in $requiredSections) {
    Test-Assert `
        ($docContent -match $section) `
        "Documentation contains '$section' section"
}

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "${Cyan}════════════════════════════════════════════════════════════════${Reset}"
Write-Host "  📊 Test Summary"
Write-Host "${Cyan}════════════════════════════════════════════════════════════════${Reset}"
Write-Host ""
Write-Host "  Total:  $TestsTotal"
Write-Host "  ${Green}Passed: $TestsPassed${Reset}"
Write-Host "  ${Red}Failed: $TestsFailed${Reset}"
Write-Host ""

if ($TestsFailed -eq 0) {
    Write-Host "${Green}✅ All tests passed!${Reset}" -ForegroundColor Green
    exit 0
} else {
    Write-Host "${Red}❌ Some tests failed!${Reset}" -ForegroundColor Red
    exit 1
}
