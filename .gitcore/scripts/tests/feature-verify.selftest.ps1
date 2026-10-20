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
    UNREADABLE-DIR directory with only unreadable files -> zero credit, counted as failed
    BRACKET        file literally named [entity].ts -> its own hits, no sibling leak
    GLOB           dir/*.test.ts matching 2 files -> credited as one aggregated entry
    GLOB-MISS      glob matching nothing -> missing
    BRACKET-GLOB   pages/[entity]/*.ts -> brackets literal, no char-class expansion
    COVERAGE       duplicate declared paths -> deduped, coverage <= 100
    EXISTING       nested relative path that exists -> OK, never MISS (regression
                   guard for separator handling; passes against origin/main)
    ABSENT         a path that exists nowhere under the root -> MISS
    CAP_ABSENT_BEYOND  absent paths past the 6-file cap -> MISS (never OK); existing
                   ones past the cap -> UNANALYZED (never MISS)
    GLOB_BEYOND_CAP    glob past the cap: matching -> UNANALYZED and not read; no match -> MISS
    SEPARATORS     ./ and mixed \ and / spellings of existing files -> OK

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
$script:Skipped = 0

function Skip-Case {
    param([string]$Reason)
    $script:CaseSkipped = $true
    Write-Host ("        (note: {0})" -f $Reason) -ForegroundColor Yellow
}

function Assert-True {
    param($Condition, [string]$Message, $Problems)
    if (-not $Condition) { $Problems.Add($Message) }
}

function Invoke-Case {
    param([string]$Name, [scriptblock]$Body)
    $script:Total++
    $problems = New-Object System.Collections.Generic.List[string]
    try {
        $script:CaseSkipped = $false
        & $Body $problems
    } catch {
        $problems.Add("exception: $($_.Exception.Message)")
    }
    if ($script:CaseSkipped) {
        $script:Skipped++
        Write-Host ("SKIP  {0}" -f $Name) -ForegroundColor Yellow
    } elseif ($problems.Count -eq 0) {
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

function Test-IsRootUser {
    if ($env:FV_SELFTEST_FORCE_ROOT -eq "1") { return $true } # test seam
    try {
        if ([System.Environment]::UserName -eq "root") { return $true }
        if ($null -ne (Get-Command "id" -ErrorAction SilentlyContinue)) {
            return ((& id -u 2>$null) -eq "0")
        }
    } catch { }
    return $false
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
    $script:LastVerifierExit = $LASTEXITCODE
    $safe = ($Id -replace '[^\w\-]', '_')
    $pack = Join-Path $out "feature-$safe.json"
    if (-not (Test-Path -LiteralPath $pack)) {
        throw "verifier produced no pack ($pack), exit=$($script:LastVerifierExit); output: $raw"
    }
    return (Get-Content -LiteralPath $pack -Raw | ConvertFrom-Json)
}

# ------------------------------------------------------------- CASE: cap missing
Invoke-Case "CAP_MISSING reports absent evidence beyond the 6-file analysis cap" {
    param($Problems)
    $dir = New-Fixture "cap-missing"
    for ($i = 1; $i -le 6; $i++) {
        New-FixtureFile $dir ("src/f{0}.ps1" -f $i) "export const n$i = $i;" | Out-Null
    }
    New-FixtureFile $dir "src/f8.ps1" "export const n8 = 8;" | Out-Null

    $declared = @()
    for ($i = 1; $i -le 6; $i++) { $declared += "src/f$i.ps1" }
    $declared += "src/f7_absent.ps1"
    $declared += "src/f8.ps1"

    New-FeatureFixture $dir "ST-CAP-MISSING" $declared
    $r = Invoke-Verifier $dir "ST-CAP-MISSING"
    $recs = @($r.evidence_resolved)

    Assert-True ($r.evidence_paths.Count -eq 8) "expected 8 declared paths, got $($r.evidence_paths.Count)" $Problems
    Assert-True ($r.evidence_missing -eq 1) "the absent 7th path must count as missing, got $($r.evidence_missing)" $Problems
    Assert-True ($recs.Count -eq 8) "expected exactly 8 evidence records, got $($recs.Count)" $Problems
    Assert-True ($recs[6].Kind -eq "missing") "7th record Kind should be missing, got $($recs[6].Kind)" $Problems
    Assert-True ($recs[7].Kind -eq "unanalyzed") "8th record Kind should be unanalyzed, got $($recs[7].Kind)" $Problems
    Assert-True ($r.evidence_exists -eq 6) "evidence_exists should be 6, got $($r.evidence_exists)" $Problems
    Assert-True ($r.evidence_score_pct -eq 75) "evidence_score_pct should be 75, got $($r.evidence_score_pct)" $Problems

    $mdFile = Join-Path $dir "verify-out/feature-ST-CAP-MISSING.md"
    if (Test-Path $mdFile) {
        $mdText = Get-Content $mdFile -Raw
        Assert-True ($mdText -match "- MISS src/f7_absent.ps1") "7th file should be reported as MISS in markdown" $Problems
        Assert-True ($mdText -match "- UNANALYZED src/f8.ps1 \(beyond analysis cap, exists, zero credit\)") "8th file should be reported as UNANALYZED in markdown" $Problems
        Assert-True ($mdText -notmatch "- MISS src/f8.ps1") "8th file must not be reported as MISS in markdown" $Problems
    } else {
        Assert-True $false "markdown report file missing" $Problems
    }
}

# ------------------------------------------- CASE: existing nested rel path
# Regression guard: an existing nested file and an absent file, side by side.
# Against origin/main's resolver on pwsh 7.5 Linux this passes; it guards the
# separator handling in Resolve-ProjectPath (the PR commit history reports the
# earlier `/`-to-`\` rewrite as the cause of MISS on existing files).
Invoke-Case "EXISTING nested relative evidence is OK and the absent one is MISS" {
    param($Problems)
    $dir = New-Fixture "existing-nested"
    New-FixtureFile $dir "site/src/lib/thing.ts" (((1..12 | ForEach-Object { "export const thing = $_;" }) -join "`n")) | Out-Null
    New-FeatureFixture $dir "ST-EXISTING-NESTED" @("site/src/lib/thing.ts", "site/src/lib/absent.ts")
    $r = Invoke-Verifier $dir "ST-EXISTING-NESTED"
    $recs = @($r.evidence_resolved)

    Assert-True ($recs.Count -eq 2) "expected 2 evidence records, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Exists) "the existing nested file must be Exists=true, got $($recs[0].Exists)" $Problems
    Assert-True ($recs[0].Kind -eq "file") "existing nested file Kind should be file, got $($recs[0].Kind)" $Problems
    Assert-True ($recs[0].TotalLines -eq 12) "existing nested file must be read (12 lines), got $($recs[0].TotalLines)" $Problems
    Assert-True ($recs[1].Kind -eq "missing") "the absent file must be Kind=missing, got $($recs[1].Kind)" $Problems
    Assert-True ($r.evidence_exists -eq 1) "evidence_exists should be 1, got $($r.evidence_exists)" $Problems
    Assert-True ($r.evidence_missing -eq 1) "evidence_missing should be 1, got $($r.evidence_missing)" $Problems
    Assert-True ($r.evidence_score_pct -eq 50) "evidence_score_pct should be 50 (1 of 2), got $($r.evidence_score_pct)" $Problems

    $mdFile = Join-Path $dir "verify-out/feature-ST-EXISTING-NESTED.md"
    if (Test-Path $mdFile) {
        $mdText = Get-Content $mdFile -Raw
        Assert-True ($mdText -match "- OK  \[CODE\] site/src/lib/thing.ts") "the existing file must be reported OK" $Problems
        Assert-True ($mdText -notmatch "- MISS site/src/lib/thing.ts") "an existing file must never be reported MISS" $Problems
        Assert-True ($mdText -match "- MISS site/src/lib/absent.ts \(no literal or fuzzy match under project root\)") "the absent file must be reported MISS" $Problems
    } else {
        Assert-True $false "markdown report file missing" $Problems
    }
}

# ------------------------------------- CASE: separator spelling is normalized
Invoke-Case "EXISTING evidence spelled with backslashes resolves on any host" {
    param($Problems)
    $dir = New-Fixture "existing-backslash"
    New-FixtureFile $dir "site/src/lib/thing.ts" (((1..12 | ForEach-Object { "export const thing = $_;" }) -join "`n")) | Out-Null
    New-FeatureFixture $dir "ST-EXISTING-BSLASH" @("site\src\lib\thing.ts")
    $r = Invoke-Verifier $dir "ST-EXISTING-BSLASH"
    $recs = @($r.evidence_resolved)

    Assert-True ($recs.Count -eq 1) "expected 1 evidence record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Exists) "backslash-spelled evidence must resolve, got Exists=$($recs[0].Exists)" $Problems
    Assert-True ($recs[0].TotalLines -eq 12) "must read the file behind the backslash spelling, got $($recs[0].TotalLines) lines" $Problems
    Assert-True ($r.evidence_missing -eq 0) "backslash spelling must not count as missing, got $($r.evidence_missing)" $Problems
}

# ------------------------------------------- CASE: directory evidence is found
Invoke-Case "EXISTING directory evidence is OK, not MISS" {
    param($Problems)
    $dir = New-Fixture "existing-dir"
    New-FixtureFile $dir "site/src/pages/index.ts" "export const page = 1;" | Out-Null
    New-FeatureFixture $dir "ST-EXISTING-DIR" @("site/src/pages/")
    $r = Invoke-Verifier $dir "ST-EXISTING-DIR"
    $recs = @($r.evidence_resolved)

    Assert-True ($recs.Count -eq 1) "expected 1 evidence record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Kind -eq "directory") "declared directory must be a directory record, got $($recs[0].Kind)" $Problems
    Assert-True ($recs[0].Exists) "an existing directory must not be MISS, got Exists=$($recs[0].Exists)" $Problems
    Assert-True ($r.evidence_missing -eq 0) "an existing directory must not count as missing, got $($r.evidence_missing)" $Problems
}

# ------------------------------ CASE: MISS stays MISS when only the leaf matches
Invoke-Case "MISS stays MISS when the leaf exists under another parent" {
    param($Problems)
    $dir = New-Fixture "wrong-parent"
    New-FixtureFile $dir "site/src/lib/thing.ts" "export const thing = 1;" | Out-Null
    New-FeatureFixture $dir "ST-WRONG-PARENT" @("worker/src/thing.ts")
    $r = Invoke-Verifier $dir "ST-WRONG-PARENT"
    $recs = @($r.evidence_resolved)

    Assert-True ($recs.Count -eq 1) "expected 1 evidence record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Kind -eq "missing") "a path whose parent does not exist must stay missing, got $($recs[0].Kind)" $Problems
    Assert-True ($r.evidence_missing -eq 1) "it must count as missing, got $($r.evidence_missing)" $Problems
    Assert-True ($r.evidence_exists -eq 0) "a same-named file elsewhere must not be credited, got $($r.evidence_exists)" $Problems
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
    if (Test-IsRootUser) {
        Skip-Case "running as root; chmod 000 does not block root"
        return
    }
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

# -------------------------------------------------------- CASE: unreadable dir
Invoke-Case "UNREADABLE_DIR earns zero credit and counts as failed" {
    param($Problems)
    if (Test-IsRootUser) {
        Skip-Case "running as root; chmod 000 does not block root"
        return
    }
    $dir = New-Fixture "unreadable-dir"
    $f1 = New-FixtureFile $dir "src/impl/a.ps1" "export const a = 1;"
    $f2 = New-FixtureFile $dir "src/impl/b.ps1" "export const b = 2;"
    Set-FixtureFileUnreadable $f1
    Set-FixtureFileUnreadable $f2
    New-FeatureFixture $dir "ST-UNREADABLE-DIR" @("src/impl")
    $r = Invoke-Verifier $dir "ST-UNREADABLE-DIR"
    $recs = @($r.evidence_resolved)
    Assert-True ($recs.Count -eq 1) "expected exactly 1 evidence record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Kind -eq "directory") "record Kind should be directory, got $($recs[0].Kind)" $Problems
    Assert-True ($recs[0].ReadFailed) "a directory whose files cannot be read must carry ReadFailed=true" $Problems
    Assert-True ($recs[0].TotalLines -eq 0) "unreadable dir must credit no lines, got $($recs[0].TotalLines)" $Problems
    Assert-True ($r.evidence_exists -eq 0) "unreadable dir must give no evidence credit, got exists=$($r.evidence_exists)" $Problems
    Assert-True ($r.evidence_score_pct -eq 0) "evidence_score_pct should be 0, got $($r.evidence_score_pct)" $Problems
    Assert-True ($r.evidence_read_failed -eq 1) "the directory must be counted as failed, got $($r.evidence_read_failed)" $Problems
    Assert-True ($r.suggest_breakdown.tests -match "test_files=0") "unreadable dir must not earn test credit ($($r.suggest_breakdown.tests))" $Problems
    Assert-True ($r.suggested_pct -le 55) "unreadable dir must not confirm a 100% claim (suggested=$($r.suggested_pct))" $Problems
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
Invoke-Case "GLOB dir/*.test.ts matching 2 files is credited" {
    param($Problems)
    $dir = New-Fixture "glob-match"
    $a = @(1..20 | ForEach-Object { "expect($_).toBe($_);" }) -join "`n"
    $b = @(1..12 | ForEach-Object { "expect($_).not.toBe(0);" }) -join "`n"
    New-FixtureFile $dir "src/lib/a.test.ts" $a | Out-Null
    New-FixtureFile $dir "src/lib/b.test.ts" $b | Out-Null
    # must NOT match the declared pattern
    New-FixtureFile $dir "src/lib/c.ts" "export const c = 1;" | Out-Null
    New-FeatureFixture $dir "ST-GLOB" @("src/lib/*.test.ts")
    $r = Invoke-Verifier $dir "ST-GLOB"
    $recs = @($r.evidence_resolved)
    Assert-True ($recs.Count -eq 1) "expected exactly 1 aggregated record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Kind -eq "glob") "record Kind should be glob, got $($recs[0].Kind)" $Problems
    Assert-True ($recs[0].Rel -eq "src/lib/*.test.ts") "record Rel mismatch: $($recs[0].Rel)" $Problems
    Assert-True ($recs[0].Exists) "glob match must be Exists=true" $Problems
    Assert-True (-not $recs[0].ReadFailed) "readable glob match must not be ReadFailed" $Problems
    Assert-True ($recs[0].FileCount -eq 2) "expected 2 matched files, got $($recs[0].FileCount)" $Problems
    Assert-True ($recs[0].FileCountTotal -eq 2) "expected FileCountTotal=2, got $($recs[0].FileCountTotal)" $Problems
    Assert-True ($recs[0].TotalLines -eq 32) "lines must come from the 2 matched files only (20+12), got $($recs[0].TotalLines)" $Problems
    Assert-True ($r.evidence_score_pct -eq 100) "glob match must earn credit, got $($r.evidence_score_pct)" $Problems
    Assert-True ($r.evidence_exists -eq 1) "glob match must count as existing evidence, got $($r.evidence_exists)" $Problems
    Assert-True ($r.evidence_missing -eq 0) "glob match must not be missing, got $($r.evidence_missing)" $Problems
    Assert-True ($r.suggest_breakdown.tests -match "test_files=2") "glob tests must earn test credit ($($r.suggest_breakdown.tests))" $Problems
}

Invoke-Case "GLOB with no match stays missing" {
    param($Problems)
    $dir = New-Fixture "glob-miss"
    New-FeatureFixture $dir "ST-GLOB-MISS" @("src/lib/*.test.ts")
    $r = Invoke-Verifier $dir "ST-GLOB-MISS"
    $recs = @($r.evidence_resolved)
    Assert-True ($recs.Count -eq 1) "expected exactly 1 evidence record, got $($recs.Count)" $Problems
    Assert-True (-not $recs[0].Exists) "unmatched glob must not be Exists" $Problems
    Assert-True (-not $recs[0].Empty) "unmatched glob must not be an empty-dir record" $Problems
    Assert-True (-not $recs[0].ReadFailed) "unmatched glob must not be read-failed" $Problems
    Assert-True ($r.evidence_missing -eq 1) "unmatched glob must count as missing, got $($r.evidence_missing)" $Problems
    Assert-True ($r.evidence_score_pct -eq 0) "unmatched glob gives no credit, got $($r.evidence_score_pct)" $Problems
    Assert-True ($r.evidence_read_failed -eq 0) "unmatched glob must not count as read-failed, got $($r.evidence_read_failed)" $Problems
}

Invoke-Case "GLOB keeps brackets literal (pages/[entity]/*.ts)" {
    param($Problems)
    $dir = New-Fixture "bracket-glob"
    $literal = @(1..5 | ForEach-Object { "export const literal$_ = $_;" }) -join "`n"
    $charclass = @(1..7 | ForEach-Object { "export const sibling$_ = $_;" }) -join "`n"
    New-FixtureFile $dir "pages/[entity]/index.ts" $literal | Out-Null
    # would match if [entity] were read as a wildcard character class
    New-FixtureFile $dir "pages/e/index.ts" $charclass | Out-Null
    New-FeatureFixture $dir "ST-BRACKET-GLOB" @("pages/[entity]/*.ts")
    $r = Invoke-Verifier $dir "ST-BRACKET-GLOB"
    $recs = @($r.evidence_resolved)
    Assert-True ($recs.Count -eq 1) "expected exactly 1 aggregated record, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Kind -eq "glob") "record Kind should be glob, got $($recs[0].Kind)" $Problems
    Assert-True ($recs[0].Exists) "bracket glob must be Exists=true" $Problems
    Assert-True ($recs[0].FileCount -eq 1) "brackets are literal: expected exactly 1 match, got $($recs[0].FileCount)" $Problems
    Assert-True ($recs[0].TotalLines -eq 5) "must read pages/[entity]/index.ts (5 lines), got $($recs[0].TotalLines)" $Problems
    Assert-True ($r.evidence_missing -eq 0) "bracket glob must not be missing, got $($r.evidence_missing)" $Problems
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

# ------------------------------------- CASE: absent paths beyond the cap stay MISS
# Guards against a false OK: past the 6-file analysis cap, a path that does not
# exist must still be reported missing (no credit, never Exists/OK), while a path
# that exists but was not opened is UNANALYZED (never MISS).
Invoke-Case "CAP_ABSENT_BEYOND absent paths past the cap are MISS, never OK" {
    param($Problems)
    $dir = New-Fixture "cap-absent-beyond"
    for ($i = 1; $i -le 6; $i++) {
        New-FixtureFile $dir ("src/g{0}.ps1" -f $i) "export const g$i = $i;" | Out-Null
    }
    New-FixtureFile $dir "src/g9.ps1" "export const g9 = 9;" | Out-Null

    $declared = @()
    for ($i = 1; $i -le 6; $i++) { $declared += "src/g$i.ps1" }
    $declared += "src/absent-b.ps1"
    $declared += "src/absent-c.ps1"
    $declared += "src/g9.ps1"

    New-FeatureFixture $dir "ST-CAP-ABSENT" $declared
    $r = Invoke-Verifier $dir "ST-CAP-ABSENT"
    $recs = @($r.evidence_resolved)

    Assert-True ($recs.Count -eq 9) "expected 9 evidence records, got $($recs.Count)" $Problems
    Assert-True ($recs[6].Kind -eq "missing" -and -not $recs[6].Exists) "absent path beyond cap must be Kind=missing and not Exists, got Kind=$($recs[6].Kind) Exists=$($recs[6].Exists)" $Problems
    Assert-True ($recs[7].Kind -eq "missing" -and -not $recs[7].Exists) "second absent path beyond cap must be Kind=missing and not Exists, got Kind=$($recs[7].Kind) Exists=$($recs[7].Exists)" $Problems
    Assert-True ($recs[8].Kind -eq "unanalyzed" -and -not $recs[8].Exists) "existing path beyond cap must be Kind=unanalyzed, got $($recs[8].Kind)" $Problems
    Assert-True ($r.evidence_missing -eq 2) "evidence_missing should be 2 (the two absent paths), got $($r.evidence_missing)" $Problems
    Assert-True ($r.evidence_exists -eq 6) "evidence_exists should be 6 (no credit beyond cap), got $($r.evidence_exists)" $Problems

    $mdFile = Join-Path $dir "verify-out/feature-ST-CAP-ABSENT.md"
    if (Test-Path $mdFile) {
        $mdText = Get-Content $mdFile -Raw
        Assert-True ($mdText -match "- MISS src/absent-b.ps1 \(no literal or fuzzy match under project root\)") "absent-b must be MISS in markdown" $Problems
        Assert-True ($mdText -match "- MISS src/absent-c.ps1 \(no literal or fuzzy match under project root\)") "absent-c must be MISS in markdown" $Problems
        Assert-True ($mdText -notmatch "- OK  \[[A-Z]+\] src/absent") "an absent path must never be OK in markdown" $Problems
        Assert-True ($mdText -match "- UNANALYZED src/g9.ps1 \(beyond analysis cap, exists, zero credit\)") "existing g9 must be UNANALYZED in markdown" $Problems
        Assert-True ($mdText -notmatch "- MISS src/g9.ps1") "existing g9 must never be MISS in markdown" $Problems
    } else {
        Assert-True $false "markdown report file missing" $Problems
    }
}

# ------------------------- CASE: glob past the cap is unanalyzed, not expanded or credited
Invoke-Case "GLOB_BEYOND_CAP a matching glob past the cap is UNANALYZED, a non-matching one MISS" {
    param($Problems)
    $dir = New-Fixture "glob-beyond-cap"
    for ($i = 1; $i -le 6; $i++) {
        New-FixtureFile $dir ("src/h{0}.ps1" -f $i) "export const h$i = $i;" | Out-Null
    }
    New-FixtureFile $dir "src/lib/a.test.ts" ("expect(1).toBe(1);`n" * 20) | Out-Null
    New-FixtureFile $dir "src/lib/b.test.ts" ("expect(2).toBe(2);`n" * 12) | Out-Null

    $declared = @()
    for ($i = 1; $i -le 6; $i++) { $declared += "src/h$i.ps1" }
    $declared += "src/lib/*.test.ts"
    $declared += "src/none/*.ts"

    New-FeatureFixture $dir "ST-GLOB-BEYOND" $declared
    $r = Invoke-Verifier $dir "ST-GLOB-BEYOND"
    $recs = @($r.evidence_resolved)

    Assert-True ($recs.Count -eq 8) "expected 8 evidence records, got $($recs.Count)" $Problems
    Assert-True ($recs[6].Kind -eq "unanalyzed" -and -not $recs[6].Exists) "matching glob past the cap must be Kind=unanalyzed and not Exists, got Kind=$($recs[6].Kind)" $Problems
    Assert-True ($recs[6].FileCount -eq 0 -and $recs[6].TotalLines -eq 0) "matching glob past the cap must not be read (FileCount=$($recs[6].FileCount), TotalLines=$($recs[6].TotalLines))" $Problems
    Assert-True ($recs[7].Kind -eq "missing" -and -not $recs[7].Exists) "non-matching glob past the cap must be Kind=missing, got $($recs[7].Kind)" $Problems
    Assert-True ($r.evidence_exists -eq 6) "evidence_exists should be 6 (no credit beyond cap), got $($r.evidence_exists)" $Problems
    Assert-True ($r.evidence_missing -eq 1) "evidence_missing should be 1 (only the non-matching glob), got $($r.evidence_missing)" $Problems

    $mdFile = Join-Path $dir "verify-out/feature-ST-GLOB-BEYOND.md"
    if (Test-Path $mdFile) {
        $mdText = Get-Content $mdFile -Raw
        Assert-True ($mdText -match "- UNANALYZED src/lib/\*.test.ts \(beyond analysis cap, exists, zero credit\)") "matching glob past the cap must be UNANALYZED in markdown" $Problems
        Assert-True ($mdText -match "- MISS src/none/\*.ts") "non-matching glob past the cap must be MISS in markdown" $Problems
        Assert-True ($mdText -notmatch "- MISS src/lib/\*.test.ts") "matching glob must never be MISS in markdown" $Problems
    } else {
        Assert-True $false "markdown report file missing" $Problems
    }
}

# ------------------------- CASE: mixed and ./ separator spellings resolve, never MISS
Invoke-Case "SEPARATORS mixed and ./ spellings of existing nested files resolve OK" {
    param($Problems)
    $dir = New-Fixture "separators-mixed"
    New-FixtureFile $dir "site/src/lib/thing.ts" (((1..12 | ForEach-Object { "export const thing = $_;" }) -join "`n")) | Out-Null
    New-FixtureFile $dir "site/src/lib/other.ts" (((1..9 | ForEach-Object { "export const other = $_;" }) -join "`n")) | Out-Null
    New-FeatureFixture $dir "ST-SEPARATORS" @("./site/src/lib/thing.ts", "site\src/lib/other.ts")
    $r = Invoke-Verifier $dir "ST-SEPARATORS"
    $recs = @($r.evidence_resolved)

    Assert-True ($recs.Count -eq 2) "expected 2 evidence records, got $($recs.Count)" $Problems
    Assert-True ($recs[0].Exists -and $recs[0].TotalLines -eq 12) "./-prefixed path must resolve and be read (12 lines), got Exists=$($recs[0].Exists) lines=$($recs[0].TotalLines)" $Problems
    Assert-True ($recs[1].Exists -and $recs[1].TotalLines -eq 9) "mixed-separator path must resolve and be read (9 lines), got Exists=$($recs[1].Exists) lines=$($recs[1].TotalLines)" $Problems
    Assert-True ($r.evidence_missing -eq 0) "neither spelling may count as missing, got $($r.evidence_missing)" $Problems
    Assert-True ($r.evidence_exists -eq 2) "evidence_exists should be 2, got $($r.evidence_exists)" $Problems

    $mdFile = Join-Path $dir "verify-out/feature-ST-SEPARATORS.md"
    if (Test-Path $mdFile) {
        $mdText = Get-Content $mdFile -Raw
        Assert-True ($mdText -notmatch "- MISS ") "no evidence line may be MISS for existing files" $Problems
        Assert-True ($mdText -match "(?m)^      rel=site/src/lib/thing\.ts\r?$") "./-spelled path must print the normalized rel= line (site/src/lib/thing.ts)" $Problems
    } else {
        Assert-True $false "markdown report file missing" $Problems
    }
}

# ------------------------- CASE: traversal above the root must not abort the verifier
# A declared path past the 6-file cap that climbs above the project root used to
# make the resolver throw ("outside the base"), which exited 1 before any report
# was written. The verifier must finish (exit 0) and report it as missing.
Invoke-Case "TRAVERSAL_ABOVE_ROOT a path past the cap that climbs above the root exits 0 and is missing" {
    param($Problems)
    $dir = New-Fixture "traversal-above-root"
    for ($i = 1; $i -le 6; $i++) {
        New-FixtureFile $dir ("src/t{0}.ps1" -f $i) "export const t$i = $i;" | Out-Null
    }
    $declared = @()
    for ($i = 1; $i -le 6; $i++) { $declared += "src/t$i.ps1" }
    $declared += "../../../../../../etc/hostname"

    New-FeatureFixture $dir "ST-TRAVERSAL" $declared
    $r = Invoke-Verifier $dir "ST-TRAVERSAL"
    Assert-True ($script:LastVerifierExit -eq 0) "verifier must exit 0, got $($script:LastVerifierExit)" $Problems
    $recs = @($r.evidence_resolved)
    Assert-True ($recs.Count -eq 7) "expected 7 evidence records, got $($recs.Count)" $Problems
    Assert-True ($recs[6].Kind -eq "missing" -and -not $recs[6].Exists) "path above the root must be Kind=missing and not Exists, got Kind=$($recs[6].Kind) Exists=$($recs[6].Exists)" $Problems
    Assert-True ($r.evidence_missing -eq 1) "evidence_missing should be 1, got $($r.evidence_missing)" $Problems
    Assert-True ($r.evidence_exists -eq 6) "evidence_exists should be 6, got $($r.evidence_exists)" $Problems

    $mdFile = Join-Path $dir "verify-out/feature-ST-TRAVERSAL.md"
    if (Test-Path $mdFile) {
        $mdText = Get-Content $mdFile -Raw
        Assert-True ($mdText -match "- MISS \.\./\.\./\.\./\.\./\.\./\.\./etc/hostname") "traversal path must be MISS in markdown" $Problems
        Assert-True ($mdText -notmatch "rel=/") "no absolute path may be printed as rel= for paths outside the root" $Problems
    } else {
        Assert-True $false "markdown report file missing" $Problems
    }
}

# ------------------------- CASE: a relative path that resolves outside the root is not echoed as rel=
Invoke-Case "OUTSIDE_ROOT a ../ path that resolves outside the root gets no rel= line" {
    param($Problems)
    $dir = New-Fixture "outside-root"
    $outside = Join-Path $script:Root "outside-root-file.ts"
    Set-Content -LiteralPath $outside -Value (((1..5 | ForEach-Object { "export const o = $_;" }) -join "`n")) -Encoding UTF8
    New-FeatureFixture $dir "ST-OUTSIDE" @("../outside-root-file.ts")
    $r = Invoke-Verifier $dir "ST-OUTSIDE"
    Assert-True ($script:LastVerifierExit -eq 0) "verifier must exit 0, got $($script:LastVerifierExit)" $Problems
    $mdFile = Join-Path $dir "verify-out/feature-ST-OUTSIDE.md"
    if (Test-Path $mdFile) {
        $mdText = Get-Content $mdFile -Raw
        Assert-True ($mdText -match "(?m)^- OK  \[CODE\] \.\./outside-root-file\.ts") "the ../ path must still be read and reported OK" $Problems
        Assert-True ($mdText -notmatch "(?m)^      rel=") "an outside-root path must not print a rel= line" $Problems
    } else {
        Assert-True $false "markdown report file missing" $Problems
    }
}

Write-Host ""
Write-Host ("{0}/{1} cases passed, {2} skipped" -f ($script:Total - $script:Failed - $script:Skipped), $script:Total, $script:Skipped)
Remove-Item -LiteralPath $script:Root -Recurse -Force -ErrorAction SilentlyContinue
if ($script:Failed -gt 0) { exit 1 }
exit 0
