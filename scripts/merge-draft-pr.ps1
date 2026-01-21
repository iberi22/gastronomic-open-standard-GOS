<#
.SYNOPSIS
    Merge un PR incluso si está en draft
.DESCRIPTION
    Convierte automáticamente un PR en draft a ready y hace merge con squash.
    Útil para PRs creados por agentes como Jules o Copilot.
.PARAMETER PrNumber
    Número del PR a mergear
.PARAMETER DeleteBranch
    Eliminar rama remota después del merge (default: true)
.PARAMETER MergeMethod
    Método de merge: squash, merge, rebase (default: squash)
.EXAMPLE
    ./scripts/merge-draft-pr.ps1 -PrNumber 69
.EXAMPLE
    ./scripts/merge-draft-pr.ps1 -PrNumber 42 -DeleteBranch:$false -MergeMethod merge
#>
param(
    [Parameter(Mandatory=$true)]
    [int]$PrNumber,

    [switch]$DeleteBranch = $true,

    [ValidateSet('squash', 'merge', 'rebase')]
    [string]$MergeMethod = 'squash'
)

$ErrorActionPreference = 'Stop'

Write-Host "🔍 Verificando estado del PR #$PrNumber..." -ForegroundColor Cyan

try {
    # Obtener info del PR
    $prInfo = gh pr view $PrNumber --json isDraft,state,id,title,author | ConvertFrom-Json

    Write-Host "📋 PR #${PrNumber}: $($prInfo.title)" -ForegroundColor White
    Write-Host "👤 Autor: $($prInfo.author.login)" -ForegroundColor Gray

    if ($prInfo.state -ne "OPEN") {
        Write-Host "❌ PR #$PrNumber no está abierto (estado: $($prInfo.state))" -ForegroundColor Red
        exit 1
    }

    # Convertir draft a ready si es necesario
    if ($prInfo.isDraft) {
        Write-Host "📝 PR está en draft. Convirtiendo a ready..." -ForegroundColor Yellow

        $query = "mutation { markPullRequestReadyForReview(input: {pullRequestId: `"$($prInfo.id)`"}) { pullRequest { id isDraft } } }"
        $result = gh api graphql -f query=$query | ConvertFrom-Json

        if ($result.data.markPullRequestReadyForReview.pullRequest.isDraft -eq $false) {
            Write-Host "✅ PR marcado como ready" -ForegroundColor Green
        } else {
            Write-Host "❌ Error al convertir PR a ready" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ PR ya está listo para merge" -ForegroundColor Green
    }

    # Hacer merge
    Write-Host "🔀 Haciendo $MergeMethod merge del PR #$PrNumber..." -ForegroundColor Cyan

    $mergeArgs = @($PrNumber, "--$MergeMethod")
    if ($DeleteBranch) {
        $mergeArgs += "--delete-branch"
    }

    & gh pr merge @mergeArgs

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ PR #$PrNumber mergeado exitosamente" -ForegroundColor Green
        Write-Host "🎉 Cambios integrados a main" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Error al mergear PR #$PrNumber" -ForegroundColor Red
        exit 1
    }

} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
