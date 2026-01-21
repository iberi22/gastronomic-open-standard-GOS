<#
.SYNOPSIS
    Generate monthly metrics from archived sessions for retrospective analysis.

.DESCRIPTION
    Parses all SESSION_*.md files in a month's archive folder and generates
    a METRICS.json file with aggregated statistics.

.PARAMETER Month
    Month to generate metrics for (format: YYYY-MM). Defaults to current month.

.EXAMPLE
    ./scripts/generate-session-metrics.ps1 -Month "2025-12"
#>

param(
    [string]$Month = (Get-Date -Format "yyyy-MM")
)

$archiveDir = "docs/agent-docs/sessions/$Month"

if (-not (Test-Path $archiveDir)) {
    Write-Host "📁 No archive found for $Month" -ForegroundColor Yellow
    Write-Host "   Path: $archiveDir" -ForegroundColor DarkGray
    exit 0
}

$sessions = Get-ChildItem "$archiveDir/SESSION_*.md" -ErrorAction SilentlyContinue

if ($sessions.Count -eq 0) {
    Write-Host "📁 No sessions found in $archiveDir" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host "📊 SESSION METRICS GENERATOR" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "Analyzing $($sessions.Count) sessions for $Month..." -ForegroundColor Yellow
Write-Host ""

# Initialize metrics
$metrics = @{
    month = $Month
    generated_at = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    sessions_count = $sessions.Count
    total_duration_minutes = 0
    models_used = @{}
    tokens_total = 0
    issues_touched_total = 0
    files_modified_total = 0
    commits_total = 0
    avg_session_duration_minutes = 0
    top_topics = @{}
    efficiency_metrics = @{
        files_per_session = 0
        commits_per_session = 0
        issues_per_session = 0
    }
    sessions_by_day = @{}
}

foreach ($session in $sessions) {
    $content = Get-Content $session.FullName -Raw

    # Extract duration
    if ($content -match "duration_minutes:\s*(\d+)") {
        $metrics.total_duration_minutes += [int]$matches[1]
    }

    # Extract model
    if ($content -match "model:\s*(\S+)") {
        $model = $matches[1].Trim('"')
        if (-not $metrics.models_used.ContainsKey($model)) {
            $metrics.models_used[$model] = 0
        }
        $metrics.models_used[$model]++
    }

    # Extract files modified
    if ($content -match "files_modified:\s*(\d+)") {
        $metrics.files_modified_total += [int]$matches[1]
    }

    # Extract commits
    if ($content -match "commits_made:\s*(\d+)") {
        $metrics.commits_total += [int]$matches[1]
    }

    # Extract issues touched (count array items)
    if ($content -match "issues_touched:\s*\n((?:\s+-\s*[^\n]+\n?)+)") {
        $issueLines = $matches[1] -split "`n" | Where-Object { $_ -match "^\s+-" }
        $metrics.issues_touched_total += $issueLines.Count
    }

    # Extract topic from filename
    if ($session.Name -match "SESSION_\d{4}-\d{2}-\d{2}_(.+)\.md") {
        $topic = $matches[1]
        if (-not $metrics.top_topics.ContainsKey($topic)) {
            $metrics.top_topics[$topic] = 0
        }
        $metrics.top_topics[$topic]++
    }

    # Extract date for daily distribution
    if ($session.Name -match "SESSION_(\d{4}-\d{2}-\d{2})") {
        $day = $matches[1]
        if (-not $metrics.sessions_by_day.ContainsKey($day)) {
            $metrics.sessions_by_day[$day] = 0
        }
        $metrics.sessions_by_day[$day]++
    }
}

# Calculate averages
if ($metrics.sessions_count -gt 0) {
    $metrics.avg_session_duration_minutes = [math]::Round($metrics.total_duration_minutes / $metrics.sessions_count, 1)
    $metrics.efficiency_metrics.files_per_session = [math]::Round($metrics.files_modified_total / $metrics.sessions_count, 1)
    $metrics.efficiency_metrics.commits_per_session = [math]::Round($metrics.commits_total / $metrics.sessions_count, 1)
    $metrics.efficiency_metrics.issues_per_session = [math]::Round($metrics.issues_touched_total / $metrics.sessions_count, 1)
}

# Sort top topics
$sortedTopics = @{}
$metrics.top_topics.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10 | ForEach-Object {
    $sortedTopics[$_.Key] = $_.Value
}
$metrics.top_topics = $sortedTopics

# Write METRICS.json
$metricsPath = "$archiveDir/METRICS.json"
$metrics | ConvertTo-Json -Depth 4 | Out-File $metricsPath -Encoding utf8

# Display summary
Write-Host "📈 MÉTRICAS DE $Month" -ForegroundColor Green
Write-Host ""
Write-Host "┌─────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "│ Sesiones totales:      $($metrics.sessions_count.ToString().PadLeft(15)) │" -ForegroundColor White
Write-Host "│ Duración total:        $("$($metrics.total_duration_minutes) min".PadLeft(15)) │" -ForegroundColor White
Write-Host "│ Duración promedio:     $("$($metrics.avg_session_duration_minutes) min".PadLeft(15)) │" -ForegroundColor White
Write-Host "│ Archivos modificados:  $($metrics.files_modified_total.ToString().PadLeft(15)) │" -ForegroundColor White
Write-Host "│ Commits totales:       $($metrics.commits_total.ToString().PadLeft(15)) │" -ForegroundColor White
Write-Host "│ Issues tocados:        $($metrics.issues_touched_total.ToString().PadLeft(15)) │" -ForegroundColor White
Write-Host "└─────────────────────────────────────────┘" -ForegroundColor DarkGray
Write-Host ""
Write-Host "🤖 Modelos usados:" -ForegroundColor Cyan
foreach ($m in $metrics.models_used.GetEnumerator()) {
    Write-Host "   • $($m.Key): $($m.Value) sesiones"
}
Write-Host ""
Write-Host "✅ Métricas guardadas en: $metricsPath" -ForegroundColor Green
Write-Host ""
