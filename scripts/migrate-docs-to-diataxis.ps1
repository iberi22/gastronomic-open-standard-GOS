<#
.SYNOPSIS
Migra documentación existente a estructura Diátaxis

.DESCRIPTION
Analiza archivos .md en la raíz del proyecto y los clasifica automáticamente
según el framework Diátaxis (tutorials, how-to, reference, explanation).
Archivos de tracking (TODO, TASKS) se convierten en sugerencias para GitHub Issues.

.PARAMETER ProjectPath
Ruta del proyecto a migrar. Por defecto es el directorio actual.

.PARAMETER DryRun
Si se especifica, solo muestra qué haría sin ejecutar cambios.

.PARAMETER CreateIssues
Si se especifica, crea automáticamente GitHub Issues desde archivos de tracking.

.EXAMPLE
.\migrate-docs-to-diataxis.ps1 -DryRun
Muestra qué archivos se moverían sin hacer cambios

.EXAMPLE
.\migrate-docs-to-diataxis.ps1 -ProjectPath "C:\my-project"
Migra archivos en el proyecto especificado

.EXAMPLE
.\migrate-docs-to-diataxis.ps1 -CreateIssues
Migra y crea GitHub Issues desde TODO.md automáticamente
#>

param(
    [string]$ProjectPath = ".",
    [switch]$DryRun,
    [switch]$CreateIssues
)

# Colores
$colors = @{
    Tutorial = "Cyan"
    HowTo = "Green"
    Reference = "Yellow"
    Explanation = "Magenta"
    Tracking = "Red"
    Unknown = "Gray"
    Info = "White"
}

# Palabras clave para clasificación (case-insensitive)
$patterns = @{
    Tutorial = @("tutorial", "learn", "beginner", "getting[- ]started", "lesson", "walkthrough")
    HowTo = @("how[- ]?to", "guide", "recipe", "solve", "setup", "install", "configure")
    Reference = @("reference", "api", "command", "syntax", "spec", "standard")
    Explanation = @("about", "why", "philosophy", "design", "architecture", "rationale")
    Tracking = @("todo", "task", "planning", "backlog", "progress", "roadmap", "checklist")
}

function Test-ContentType {
    param(
        [string]$FileName,
        [string]$Content,
        [string]$Type
    )

    $keywords = $patterns[$Type]
    $fileName = $FileName.ToLower()
    $contentLower = $Content.ToLower()

    foreach ($keyword in $keywords) {
        if ($fileName -match $keyword -or $contentLower -match $keyword) {
            return $true
        }
    }
    return $false
}

function Get-DocumentType {
    param(
        [string]$FilePath
    )

    $fileName = Split-Path $FilePath -Leaf
    $content = Get-Content $FilePath -Raw -ErrorAction SilentlyContinue

    if (-not $content) { return "UNKNOWN" }

    # Prioridad: Tracking > Tutorial > HowTo > Reference > Explanation
    if (Test-ContentType $fileName $content "Tracking") { return "TRACKING" }
    if (Test-ContentType $fileName $content "Tutorial") { return "TUTORIAL" }
    if (Test-ContentType $fileName $content "HowTo") { return "HOWTO" }
    if (Test-ContentType $fileName $content "Reference") { return "REFERENCE" }
    if (Test-ContentType $fileName $content "Explanation") { return "EXPLANATION" }

    return "UNKNOWN"
}

function Get-Destination {
    param(
        [string]$Type,
        [string]$FileName
    )

    switch ($Type) {
        "TUTORIAL"     { return "docs/tutorials/$FileName" }
        "HOWTO"        { return "docs/how-to/$FileName" }
        "REFERENCE"    { return "docs/reference/$FileName" }
        "EXPLANATION"  { return "docs/explanation/$FileName" }
        "TRACKING"     { return "→ GitHub Issues (ver sugerencias abajo)" }
        "UNKNOWN"      { return "docs/archive/$(Get-Date -Format 'yyyy-MM')/$FileName" }
    }
}

function Extract-Tasks {
    param([string]$FilePath)

    $content = Get-Content $FilePath
    $tasks = @()

    foreach ($line in $content) {
        # Detectar: - [ ] Task, * Task, - Task, etc.
        if ($line -match '^\s*[-*]\s*(\[ \])?\s*(.+)$') {
            $task = $matches[2].Trim()
            if ($task.Length -gt 5) {  # Ignorar líneas muy cortas
                $tasks += $task
            }
        }
    }

    return $tasks
}

# ============================================================================
# MAIN
# ============================================================================

Write-Host "`n🗂️  Git-Core Protocol - Diátaxis Migration Tool`n" -ForegroundColor Cyan

# Validar que estamos en un proyecto
if (-not (Test-Path "$ProjectPath/.git")) {
    Write-Host "❌ Error: No se encontró repositorio Git en '$ProjectPath'" -ForegroundColor Red
    Write-Host "   Ejecuta este script desde la raíz de tu proyecto." -ForegroundColor Yellow
    exit 1
}

# Crear estructura Diátaxis si no existe
$dirs = @("docs/tutorials", "docs/how-to", "docs/reference", "docs/explanation", "docs/archive/$(Get-Date -Format 'yyyy-MM')")
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir) -and -not $DryRun) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Buscar archivos .md en la raíz (excluir README.md, CHANGELOG.md, LICENSE.md)
$excludeFiles = @("README.md", "CHANGELOG.md", "LICENSE.md", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md")
$files = Get-ChildItem -Path $ProjectPath -Filter "*.md" -File |
    Where-Object { $excludeFiles -notcontains $_.Name -and $_.DirectoryName -eq (Resolve-Path $ProjectPath).Path }

if ($files.Count -eq 0) {
    Write-Host "✅ No se encontraron archivos .md para migrar en la raíz.`n" -ForegroundColor Green
    exit 0
}

Write-Host "📄 Archivos encontrados: $($files.Count)`n" -ForegroundColor White

# Analizar y clasificar
$results = @()
$trackingFiles = @()

foreach ($file in $files) {
    $type = Get-DocumentType $file.FullName
    $destination = Get-Destination $type $file.Name

    $results += [PSCustomObject]@{
        FileName = $file.Name
        Type = $type
        Destination = $destination
        FullPath = $file.FullName
    }

    if ($type -eq "TRACKING") {
        $trackingFiles += $file
    }

    $color = $colors[$type]
    Write-Host "  $($file.Name)" -NoNewline
    Write-Host " → " -NoNewline -ForegroundColor Gray
    Write-Host "$type" -NoNewline -ForegroundColor $color
    Write-Host " → $destination" -ForegroundColor Gray
}

# Resumen
Write-Host "`n📊 Resumen de clasificación:" -ForegroundColor Cyan
$summary = $results | Group-Object Type | Select-Object Name, Count
foreach ($item in $summary) {
    $color = $colors[$item.Name]
    Write-Host "  $($item.Name): " -NoNewline -ForegroundColor $color
    Write-Host "$($item.Count) archivo(s)"
}

# Mostrar tareas encontradas
if ($trackingFiles.Count -gt 0) {
    Write-Host "`n📋 Tareas encontradas en archivos de tracking:" -ForegroundColor Yellow

    foreach ($file in $trackingFiles) {
        $tasks = Extract-Tasks $file.FullName
        if ($tasks.Count -gt 0) {
            Write-Host "`n  📄 $($file.Name): $($tasks.Count) tarea(s)" -ForegroundColor Cyan

            if ($CreateIssues -and -not $DryRun) {
                Write-Host "     Creando issues..." -ForegroundColor Green
                foreach ($task in $tasks) {
                    try {
                        $issueTitle = $task.Substring(0, [Math]::Min(100, $task.Length))
                        gh issue create --title $issueTitle --body "Migrado desde $($file.Name)" --label "migrated" 2>$null
                        Write-Host "     ✅ Issue creado: $issueTitle" -ForegroundColor Green
                    } catch {
                        Write-Host "     ⚠️ Error creando issue: $task" -ForegroundColor Red
                    }
                }
            } else {
                # Solo mostrar primeras 5 tareas
                $preview = $tasks | Select-Object -First 5
                foreach ($task in $preview) {
                    Write-Host "     - $task" -ForegroundColor Gray
                }
                if ($tasks.Count -gt 5) {
                    Write-Host "     ... y $($tasks.Count - 5) más" -ForegroundColor Gray
                }
            }
        }
    }

    if (-not $CreateIssues) {
        Write-Host "`n💡 Sugerencia: Usa -CreateIssues para crear issues automáticamente" -ForegroundColor Yellow
    }
}

# Ejecutar migración o dry-run
Write-Host ""
if ($DryRun) {
    Write-Host "🔍 Modo DRY RUN - No se realizaron cambios`n" -ForegroundColor Yellow
    Write-Host "Para ejecutar la migración real, ejecuta sin -DryRun`n" -ForegroundColor Cyan
} else {
    Write-Host "⚠️  ¿Continuar con la migración? (S/N): " -NoNewline -ForegroundColor Yellow
    $confirm = Read-Host

    if ($confirm -eq "S" -or $confirm -eq "s") {
        Write-Host "`n🚀 Ejecutando migración...`n" -ForegroundColor Green

        foreach ($result in $results) {
            if ($result.Type -ne "TRACKING") {
                try {
                    $destDir = Split-Path $result.Destination -Parent
                    if (-not (Test-Path $destDir)) {
                        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                    }

                    Move-Item $result.FullPath $result.Destination -Force
                    Write-Host "  ✅ $($result.FileName) → $($result.Destination)" -ForegroundColor Green
                } catch {
                    Write-Host "  ❌ Error moviendo $($result.FileName): $_" -ForegroundColor Red
                }
            } else {
                if ($CreateIssues) {
                    # Archivar archivo de tracking
                    $archivePath = "docs/archive/$(Get-Date -Format 'yyyy-MM')/$($result.FileName)"
                    Move-Item $result.FullPath $archivePath -Force
                    Write-Host "  📦 $($result.FileName) → $archivePath (archivado)" -ForegroundColor Cyan
                } else {
                    Write-Host "  ℹ️  $($result.FileName) - No migrado (usa -CreateIssues)" -ForegroundColor Yellow
                }
            }
        }

        Write-Host "`n✅ Migración completada!`n" -ForegroundColor Green
        Write-Host "📝 Próximos pasos:" -ForegroundColor Cyan
        Write-Host "  1. Verifica los archivos migrados"
        Write-Host "  2. Actualiza links internos si es necesario"
        Write-Host "  3. Commit los cambios:"
        Write-Host "     git add -A"
        Write-Host "     git commit -m 'docs: migrate to Diátaxis framework'"
        Write-Host ""
    } else {
        Write-Host "`n❌ Migración cancelada`n" -ForegroundColor Red
    }
}
