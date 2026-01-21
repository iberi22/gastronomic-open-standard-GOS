#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Detect repository type and configure environment variables for workflows

.DESCRIPTION
    This script detects whether the repository is public or private and sets
    appropriate configuration for GitHub Actions workflows to optimize resource usage.

.OUTPUTS
    Sets environment variables:
    - IS_PUBLIC: true/false
    - IS_MAIN_REPO: true/false
    - ENABLE_SCHEDULES: true/false
    - SCHEDULE_MODE: aggressive/moderate/conservative
#>

param(
    [string]$Repository = $env:GITHUB_REPOSITORY
)

# Colors
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Cyan = "`e[36m"
$Reset = "`e[0m"

Write-Host "${Cyan}🔍 Repository Configuration Detection${Reset}`n"
Write-Warning "⚠️ DEPRECATION NOTICE: This script is deprecated. Use 'gc ci-detect' instead."

# Detect repository visibility
try {
    # Redirect stderr to null and suppress errors completely
    $ErrorActionPreference = 'SilentlyContinue'
    $warningPreference = 'SilentlyContinue'

    $repoInfo = gh repo view $Repository --json visibility,isPrivate,name,owner 2>&1 | Where-Object { $_ -is [string] -and $_ -notmatch "GH_TOKEN" } | ConvertFrom-Json

    if (-not $repoInfo) {
        throw "No repository information returned"
    }

    $isPublic = -not $repoInfo.isPrivate
    $visibility = if ($isPublic) { "PUBLIC" } else { "PRIVATE" }

    Write-Host "📊 Repository: ${Cyan}$Repository${Reset}"
    Write-Host "🔒 Visibility: ${Cyan}$visibility${Reset}"

} catch {
    Write-Host "${Red}❌ Error detecting repository visibility: $_${Reset}"
    Write-Host "${Yellow}⚠️  Defaulting to PRIVATE (conservative mode)${Reset}"
    $isPublic = $false
    $visibility = "PRIVATE"
}
finally {
    # Reset error preferences
    $ErrorActionPreference = 'Continue'
    $warningPreference = 'Continue'
}

# Detect if main protocol repository
$isMainRepo = $Repository -match "(Git-Core-Protocol|git-core|GitCore|ai-git-core)"
Write-Host "🏠 Is Main Repo: ${Cyan}$isMainRepo${Reset}"

# Determine schedule mode
$scheduleMode = "conservative"
$enableSchedules = $false

if ($isPublic) {
    # Public repos: Unlimited Actions minutes
    $scheduleMode = "aggressive"
    $enableSchedules = $true
    Write-Host "${Green}✅ PUBLIC repo: Aggressive scheduling enabled (unlimited minutes)${Reset}"
}
elseif ($isMainRepo) {
    # Main repo (even if private): Moderate scheduling
    $scheduleMode = "moderate"
    $enableSchedules = $true
    Write-Host "${Yellow}⚠️  MAIN PRIVATE repo: Moderate scheduling (2,000 min/month limit)${Reset}"
}
else {
    # Other private repos: Conservative (event-based only)
    $scheduleMode = "conservative"
    $enableSchedules = $false
    Write-Host "${Red}🔒 PRIVATE repo: Conservative mode (event-based triggers only)${Reset}"
}

# Output for GitHub Actions
if ($env:GITHUB_OUTPUT) {
    Add-Content -Path $env:GITHUB_OUTPUT -Value "is_public=$($isPublic.ToString().ToLower())"
    Add-Content -Path $env:GITHUB_OUTPUT -Value "is_main_repo=$($isMainRepo.ToString().ToLower())"
    Add-Content -Path $env:GITHUB_OUTPUT -Value "enable_schedules=$($enableSchedules.ToString().ToLower())"
    Add-Content -Path $env:GITHUB_OUTPUT -Value "schedule_mode=$scheduleMode"
}

# Output for local usage
Write-Host "`n📋 Configuration Summary:"
Write-Host "   IS_PUBLIC=$($isPublic.ToString().ToLower())"
Write-Host "   IS_MAIN_REPO=$($isMainRepo.ToString().ToLower())"
Write-Host "   ENABLE_SCHEDULES=$($enableSchedules.ToString().ToLower())"
Write-Host "   SCHEDULE_MODE=$scheduleMode"

Write-Host "`n${Cyan}💡 Schedule Mode Details:${Reset}"
switch ($scheduleMode) {
    "aggressive" {
        Write-Host "   ${Green}• All scheduled workflows enabled${Reset}"
        Write-Host "   ${Green}• High-frequency schedules (every 30 min)${Reset}"
        Write-Host "   ${Green}• Multi-repo monitoring enabled${Reset}"
        Write-Host "   ${Green}• Estimated: ~600 min/day (unlimited)${Reset}"
    }
    "moderate" {
        Write-Host "   ${Yellow}• Essential schedules only${Reset}"
        Write-Host "   ${Yellow}• Reduced frequency (every 6 hours)${Reset}"
        Write-Host "   ${Yellow}• Single-repo monitoring${Reset}"
        Write-Host "   ${Yellow}• Estimated: ~100 min/day (~3,000 min/month)${Reset}"
    }
    "conservative" {
        Write-Host "   ${Red}• No scheduled workflows${Reset}"
        Write-Host "   ${Red}• Event-based triggers only (push, PR, issues)${Reset}"
        Write-Host "   ${Red}• Minimal resource usage${Reset}"
        Write-Host "   ${Red}• Estimated: ~20 min/day (~600 min/month)${Reset}"
    }
}

Write-Host ""

# Ensure we exit successfully
exit 0
