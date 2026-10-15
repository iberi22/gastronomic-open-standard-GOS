#Requires -Version 5.1
<#
.SYNOPSIS
  Pester-free self-test for feature-verify.ps1 evidence scoring.

.DESCRIPTION
  Builds throwaway fixture projects in a temp dir and runs the real verifier
  (as a child process, because feature-verify.ps1 ends with `exit 0`) against
  them. Each case is asserted on the JSON pack the verifier writes.

  Cases:
    EMPTY-DIR      empty evidence directory -> zero credit
    POPULATED-DIR  populated directory -> line + keyword credit, node_modules ignored
    DIR-CAP        >50 files under a directory -> capped at 50 and reported
    UNREADABLE     unreadable files -> one record per path, zero credit
    BRACKET        file literally named [entity].ts -> its own hits, no sibling leak
    COVERAGE       duplicate declared paths -> deduped, coverage <= 100

  Exits 1 if any case fails, 0 when all pass. Prints PASS/FAIL per case.

.EXAMPLE
  pwsh -NoProfile -File .gitcore/scripts/tests/feature-verify.selftest.ps1
#>
$ErrorActionPreference = "Stop"

$here = $PSScriptRoot
$script:Verify = Join-Path (Split-Path $here -Parent) "feature-verify.ps1"
if (-not (Test-Path -LiteralPath $script:Verify)) { throw "feature-verify.ps1 not found at $($script:Verify)" }

try {
    $script:PwshExe = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName
} catch {
    $script:PwshExe = Join-Path $PSHOME "pwsh"
}

$script:Root = Join-Path ([System.IO.Path]::GetTempPath()) ("fv-selftest-" + [guid]::NewGuid().ToString("N").Substring(0, 8))
New-Item -ItemType Directory -Force -Path $script:Root | Out-Null

$script:Total = 0
$script:Failed = 0

function Assert-True {
    param($Condition, [string]$Message, $Problems)
    if (-not $Condition) { $Problems.Add($Message) }
}

function Invoke-Case {
    param([string]$Name, [scriptblock]$Body)
    $script:Total++
    $problems = New-Object System.Collections.Generic.List[string]
    try {
        & $Body $problems
    } catch {
        $problems.Add("exception: $($_.Exception.Message)")
    }
    if ($problems.Count -eq 0) {
        Write-Host ("PASS  {0}" -f $Name) -ForegroundColor Green
    } else {
        $script:Failed++
        Write-Host ("FAIL  {0}" -f $Name) -ForegroundColor Red
        foreach ($p in $problems) { Write-Host ("        - {0}" -f $p) -ForegroundColor Red }
    }
}

function New-Fixture {
    param([string]$Name)
    $dir = Join-Path $script:Root $Name
    New-Item -ItemType Directory -Force -Path (Join-Path $dir ".gitcore") | Out-Null
    return $dir
}

function New-FeatureFixture {
    param([string]$Dir, [string]$Id, [string[]]$Evidence, [int]$Pct = 100, [string[]]$Acceptance = @())
    $feature = [ordered]@{
        id           = $Id
        name         = "Self test feature"
        status       = "done"
        progress_pct = $Pct
        description  = "fixture for feature-verify.selftest.ps1"
        evidence     = @($Evidence)
    }
    if ($Acceptance.Count -gt 0) { $feature["acceptance_criteria"] = @($Acceptance) }
    $json = [ordered]@{ features = @($feature) } | ConvertTo-Json -Depth 10
    Set-Content -LiteralPath (Join-Path $Dir ".gitcore/features.json") -Value $json -Encoding UTF8
}

function New-FixtureFile {
    param([string]$Dir, [string]$Rel, [string]$Content)
    $full = Join-Path $Dir ($Rel -replace '/', [System.IO.Path]::DirectorySeparatorChar)
    $parent = Split-Path $full -Parent
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    Set-Content -LiteralPath $full -Value $Content -Encoding UTF8
    return $full
}

function Set-FixtureFileUnreadable {
    param([string]$Full)
    try {
        # .NET 8+: works without depending on a chmod binary on PATH
        [System.IO.File]::SetUnixFileMode($Full, [System.IO.UnixFileMode]::None)
        return
    } catch { }
    & chmod 000 $Full
}

function Invoke-Verifier {
    param(
        [string]$Dir,
        [string]$Id
    )
    $out = Join-Path $Dir "verify-out"
    $argList = @(
        "-NoProfile", "-File", $script:Verify,
        "-ProjectRoot", $Dir,
        "-Id", $Id,
        "-OutDir", $out
    )
    $raw = & $script:PwshExe @argList 2>&1 | Out-String
    $safe = ($Id -replace '[^\w\-]', '_')
    $pack = Join-Path $out "feature-$safe.json"
    if (-not (Test-Path -LiteralPath $pack)) {
        throw "verifier produced no pack ($pack); output: $raw"
    }
    return (Get-Content -LiteralPath $pack -Raw | ConvertFrom-Json)
}

# ---------------------------------------------------------------- CASE: empty dir
Invoke-Case "EMPTY_DIR gives zero credit" {
    param($Problems)
    $dir = New-Fixture "empty-dir"
    New-Item -ItemType Directory -Force -Path (Join-Path $dir "src/impl") | Out-Null
    New-FeatureFixture $dir "ST-EMPTY" @("src/impl") -Acceptance @("Implementation")
    $r = Invoke-Verifier $dir "ST-EMPTY"
    $recs = @($r.evidence_resolved)
    Assert-True ($r.evidence_score_pct -eq 0) "evidence_score_pct should be 0, got $($r.evidence_score_pct)" $Problems
    Assert-True ($r.evidence_exists -eq 0) "evidence_exists should be 0, got $($r.evidence_exists)" $Problems
    Assert-True ($recs.Count -eq 1) "expected exactly 1 evidence record, got $($recs.Count)" $Problems
    Assert-True (-not $recs[0].Exists) "empty dir record must not be Exists=true" $Problems
    Assert-True ($recs[0].Empty) "empty dir record must carry Empty=true" $Problems
    Assert-True ($r.suggested_pct -le 55) "empty-dir evidence must not confirm a 100% claim (suggested=$($r.suggested_pct))" $Problems
}

# ------------------------------------------------------------ CASE: populated dir
Invoke-Case "POPULATED_DIR gives line/keyword credit" {
    param($Problems)
    $dir = New-Fixture "populated-dir"
    $lines = @()
    for ($i = 1; $i -le 40; $i++) { $lines += "export const v$i = $i; // IMPLEMENTEDMARK" }
    New-FixtureFile $dir "src/impl/a.ps1" ($lines -join "`n") | Out-Null
    $lines2 = @()
    for ($i = 1; $i -le 30; $i++) { $lines2 += "export const w$i = $i;" }
    New-FixtureFile $dir "src/impl/b.ps1" ($lines2 -join "`n") | Out-Null
    # must be ignored by the directory expansion
    New-FixtureFile $dir "src/impl/node_modules/big.ps1" (("x" * 10 + "`n") * 300) | Out-Null
    New-FeatureFixture $dir "ST-POPULATED" @("src/impl") -Acceptance @("IMPLEMENTEDMARK")
    $r = Invoke-Verifier $dir "ST-POPULATED"
    $recs = @($r.evidence_resolved)
    Assert-True ($r.evidence_score_pct -eq 100) "evidence_score_pct should be 100, got $($r.evidence_score_pct)" $Problems
    Assert-True ($r.evidence_exists -eq 1) "evidence_exists should be 1, got $($r.evidence_exists)" $Problems
    Assert-True ($recs.Count -eq 1) "expected exactly 1 evidence record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Kind -eq "directory") "record Kind should be directory, got $($recs[0].Kind)" $Problems
    Assert-True ($recs[0].TotalLines -ge 70) "aggregate lines should be >= 70, got $($recs[0].TotalLines)" $Problems
    Assert-True ($recs[0].TotalLines -lt 1000) "node_modules must be ignored (lines=$($recs[0].TotalLines))" $Problems
    Assert-True ($recs[0].FileCount -eq 2) "FileCount should be 2 (node_modules ignored), got $($recs[0].FileCount)" $Problems
    Assert-True (-not $recs[0].FilesCapped) "should not be capped for 2 files" $Problems
    $hits = @($r.keyword_hits)
    Assert-True ($hits.Count -ge 1) "expected keyword hits inside the directory, got $($hits.Count)" $Problems
    Assert-True (@($hits | Where-Object { $_.Path -notlike "src/impl/*" }).Count -eq 0) "directory hits must report inner paths" $Problems
}

# --------------------------------------------------------------- CASE: dir cap 50
Invoke-Case "DIR_CAP caps expansion at 50 files and reports it" {
    param($Problems)
    $dir = New-Fixture "dir-cap"
    for ($i = 1; $i -le 60; $i++) {
        New-FixtureFile $dir ("src/impl/f{0}.ps1" -f $i) "export const n$i = $i;" | Out-Null
    }
    New-FeatureFixture $dir "ST-CAP" @("src/impl")
    $r = Invoke-Verifier $dir "ST-CAP"
    $recs = @($r.evidence_resolved)
    Assert-True ($recs.Count -eq 1) "expected exactly 1 evidence record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].FileCount -eq 50) "expected FileCount=50 (cap), got $($recs[0].FileCount)" $Problems
    Assert-True ($recs[0].FileCountTotal -eq 60) "expected FileCountTotal=60, got $($recs[0].FileCountTotal)" $Problems
    Assert-True ($recs[0].FilesCapped) "FilesCapped must be true" $Problems
    Assert-True ($recs[0].ExcerptOf -match "capped at 50") "cap must be reported in the record ($($recs[0].ExcerptOf))" $Problems
}

# --------------------------------------------------------------- CASE: unreadable
Invoke-Case "UNREADABLE files count once with zero credit" {
    param($Problems)
    $dir = New-Fixture "unreadable"
    $f1 = New-FixtureFile $dir "src/secret.ts" "export const secret = 1;"
    $f2 = New-FixtureFile $dir "tests/secret.test.ts" "test('secret', () => {});"
    Set-FixtureFileUnreadable $f1
    Set-FixtureFileUnreadable $f2
    # the same path declared twice must not double-count
    New-FeatureFixture $dir "ST-UNREADABLE" @("src/secret.ts", "src/secret.ts", "tests/secret.test.ts") -Acceptance @("secret")
    $r = Invoke-Verifier $dir "ST-UNREADABLE"
    $recs = @($r.evidence_resolved)
    Assert-True ($recs.Count -eq 2) "expected exactly 2 records (one per unique path), got $($recs.Count)" $Problems
    Assert-True ($r.evidence_exists -eq 0) "unreadable files must give no evidence credit, got exists=$($r.evidence_exists)" $Problems
    Assert-True ($r.evidence_score_pct -eq 0) "evidence_score_pct should be 0, got $($r.evidence_score_pct)" $Problems
    Assert-True ($r.evidence_read_failed -eq 2) "evidence_read_failed should be 2, got $($r.evidence_read_failed)" $Problems
    Assert-True (@($recs | Where-Object { $_.ReadFailed }).Count -eq 2) "both records must carry ReadFailed=true" $Problems
    Assert-True ($r.suggest_breakdown.tests -match "test_files=0") "unreadable tests must not earn test credit ($($r.suggest_breakdown.tests))" $Problems
    Assert-True ($r.suggested_pct -le 55) "unreadable evidence must not confirm a 100% claim (suggested=$($r.suggested_pct))" $Problems
}

# ------------------------------------------------------------------ CASE: bracket
Invoke-Case "BRACKET file gets its own keyword hits, no sibling leak" {
    param($Problems)
    $dir = New-Fixture "bracket"
    New-FixtureFile $dir "src/[entity].ts" ("export function entity() {`n  return `"ENTITYMARK`";`n}`n// end") | Out-Null
    New-FixtureFile $dir "src/e.ts" ("const leak = `"LEAKONLY`";`nconst a = 1;`nconst b = 2;`nconst c = 3;`nconst d = 4;") | Out-Null
    New-FeatureFixture $dir "ST-BRACKET" @("src/[entity].ts") -Acceptance @("ENTITYMARK LEAKONLY")
    $r = Invoke-Verifier $dir "ST-BRACKET"
    $recs = @($r.evidence_resolved)
    $hits = @($r.keyword_hits)
    Assert-True ($recs.Count -eq 1) "expected exactly 1 evidence record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Rel -eq "src/[entity].ts") "record Rel mismatch: $($recs[0].Rel)" $Problems
    Assert-True ($recs[0].TotalLines -eq 4) "must read the literal [entity].ts (4 lines), got $($recs[0].TotalLines)" $Problems
    Assert-True (@($hits | Where-Object { $_.Snippet -match "ENTITYMARK" }).Count -ge 1) "expected an ENTITYMARK hit from [entity].ts" $Problems
    Assert-True (@($hits | Where-Object { $_.Snippet -match "LEAKONLY" }).Count -eq 0) "sibling e.ts leaked its content into the hits" $Problems
    Assert-True (@($hits | Where-Object { $_.Path -ne "src/[entity].ts" }).Count -eq 0) "hits must be reported for the declared path" $Problems
}

# ----------------------------------------------------------------- CASE: coverage
Invoke-Case "COVERAGE stays <= 100 with duplicate declared paths" {
    param($Problems)
    # (a) duplicates that normalize to the same path dedupe to full coverage
    $dirA = New-Fixture "coverage-normalized"
    New-FixtureFile $dirA "src/a.ts" ("export const a = 1;`n" * 10) | Out-Null
    New-FeatureFixture $dirA "ST-COVERAGE" @("src/a.ts", "src/a.ts", "./src/a.ts")
    $rA = Invoke-Verifier $dirA "ST-COVERAGE"
    Assert-True ($rA.evidence_score_pct -le 100) "coverage must never exceed 100, got $($rA.evidence_score_pct)" $Problems
    Assert-True ($rA.evidence_score_pct -eq 100) "duplicates must dedupe to full coverage, got $($rA.evidence_score_pct)" $Problems
    Assert-True (@($rA.evidence_resolved).Count -eq 1) "expected exactly 1 record for duplicated paths, got $(@($rA.evidence_resolved).Count)" $Problems
    Assert-True (@($rA.evidence_paths).Count -eq 1) "declared paths must dedupe by normalized path, got $(@($rA.evidence_paths).Count)" $Problems
    Assert-True ($rA.evidence_missing -eq 0) "duplicates must not count as missing, got $($rA.evidence_missing)" $Problems

    # (b) two different spellings of the same file: one record, never above 100
    $dirB = New-Fixture "coverage-same-target"
    New-FixtureFile $dirB "src/a.ts" ("export const a = 1;`n" * 10) | Out-Null
    New-FeatureFixture $dirB "ST-COVERAGE2" @("src/a.ts", "src/../src/a.ts")
    $rB = Invoke-Verifier $dirB "ST-COVERAGE2"
    Assert-True ($rB.evidence_score_pct -le 100) "coverage must never exceed 100, got $($rB.evidence_score_pct)" $Problems
    Assert-True (@($rB.evidence_resolved).Count -eq 1) "expected exactly 1 record for same-target spellings, got $(@($rB.evidence_resolved).Count)" $Problems
    Assert-True ($rB.evidence_exists -eq 1) "the target must be credited exactly once, got $($rB.evidence_exists)" $Problems
}

Write-Host ""
Write-Host ("{0}/{1} cases passed" -f ($script:Total - $script:Failed), $script:Total)
Remove-Item -LiteralPath $script:Root -Recurse -Force -ErrorAction SilentlyContinue
if ($script:Failed -gt 0) { exit 1 }
exit 0
