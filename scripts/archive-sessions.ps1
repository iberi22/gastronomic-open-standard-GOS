<#
.SYNOPSIS
    Archive old session prompts to the sessions archive for analysis.

.DESCRIPTION
    Moves SESSION_*.md files from docs/prompts/ to docs/agent-docs/sessions/YYYY-MM/
    and updates the monthly METRICS.json file.

.PARAMETER OlderThanDays
    Archive sessions older than this many days (default: 7).

.PARAMETER DryRun
    Show what would be archived without actually moving files.

.EXAMPLE
    ./scripts/archive-sessions.ps1 -OlderThanDays 7

.EXAMPLE
    ./scripts/archive-sessions.ps1 -DryRun
#>

param(
    [int]$OlderThanDays = 7,
    [switch]$DryRun
)

$promptsDir = "docs/prompts"
$archiveBase = "docs/agent-docs/sessions"

if (-not (Test-Path $promptsDir)) {
    Write-Host "📁 No prompts directory found. Nothing to archive." -ForegroundColor Yellow
    exit 0
}

$cutoffDate = (Get-Date).AddDays(-$OlderThanDays)
$sessions = Get-ChildItem "$promptsDir/SESSION_*.md" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt $cutoffDate }

if ($sessions.Count -eq 0) {
    Write-Host "✅ No sessions older than $OlderThanDays days to archive." -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host "📦 SESSION ARCHIVER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "Found $($sessions.Count) session(s) older than $OlderThanDays days:" -ForegroundColor Yellow
Write-Host ""

$archivedCount = 0
$metrics = @{
    sessions = @()
    total_duration = 0
    models = @{}
    files_modified_total = 0
}

foreach ($session in $sessions) {
    # Extract date from filename for folder organization
    if ($session.Name -match "SESSION_(\d{4}-\d{2})-\d{2}") {
        $yearMonth = $matches[1]
    } else {
        $yearMonth = Get-Date $session.LastWriteTime -Format "yyyy-MM"
    }

    $targetDir = "$archiveBase/$yearMonth"
    $targetPath = "$targetDir/$($session.Name)"

    Write-Host "  📄 $($session.Name)" -ForegroundColor White
    Write-Host "     → $targetPath" -ForegroundColor DarkGray

    if (-not $DryRun) {
        # Create directory if needed
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }

        # Read and parse session for metrics
        try {
            $content = Get-Content $session.FullName -Raw
            if ($content -match "duration_minutes:\s*(\d+)") {
                $metrics.total_duration += [int]$matches[1]
            }
            if ($content -match "model:\s*(\S+)") {
                $model = $matches[1]
                if (-not $metrics.models.ContainsKey($model)) {
                    $metrics.models[$model] = 0
                }
                $metrics.models[$model]++
            }
            if ($content -match "files_modified:\s*(\d+)") {
                $metrics.files_modified_total += [int]$matches[1]
            }
        } catch {}

        # Move file
        Move-Item $session.FullName $targetPath -Force
        $archivedCount++
    }
}

Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN - No files were moved." -ForegroundColor Yellow
} else {
    Write-Host "✅ Archived $archivedCount session(s)." -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Aggregate Metrics:" -ForegroundColor Cyan
    Write-Host "   • Total duration: ~$($metrics.total_duration) min"
    Write-Host "   • Files touched:  $($metrics.files_modified_total)"
    Write-Host "   • Models used:    $($metrics.models.Keys -join ', ')"
}

Write-Host ""
