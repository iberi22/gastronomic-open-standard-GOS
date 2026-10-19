# GitCore.Common.ps1 — shared helpers for consumer protocol scripts
# Dot-source: . "$PSScriptRoot/lib/GitCore.Common.ps1"

# Note: avoid Set-StrictMode here — consumer scripts run against heterogeneous features.json

function Get-GitCoreSource {
    <#
    .SYNOPSIS
      Resolve GitCore source-of-truth directory (local preferred).
    #>
    param(
        [string]$Override = ""
    )

    if ($Override -and (Test-Path $Override)) {
        return (Resolve-Path $Override).Path
    }
    if ($env:GITCORE_HOME -and (Test-Path $env:GITCORE_HOME)) {
        return (Resolve-Path $env:GITCORE_HOME).Path
    }

    # Walk up from CWD looking for GitCore/VERSION or monorepo/GitCore
    $dir = (Get-Location).Path
    for ($i = 0; $i -lt 8; $i++) {
        $candidate = Join-Path $dir "GitCore"
        if ((Test-Path (Join-Path $candidate "VERSION")) -or (Test-Path (Join-Path $candidate ".git-core-protocol-version"))) {
            return (Resolve-Path $candidate).Path
        }
        if ((Test-Path (Join-Path $dir "VERSION")) -and (Test-Path (Join-Path $dir "PROTOCOL_REFERENCE.md")) -and (Test-Path (Join-Path $dir "package\consumer"))) {
            return (Resolve-Path $dir).Path
        }
        $parent = Split-Path $dir -Parent
        if (-not $parent -or $parent -eq $dir) { break }
        $dir = $parent
    }

    # Common SWAL monorepo path
    $defaults = @(
        "E:\proyectosSWAL\GitCore",
        "E:\scripts-python\GitCore",
        (Join-Path $env:USERPROFILE "proyectosSWAL\GitCore")
    )
    foreach ($d in $defaults) {
        if (Test-Path (Join-Path $d "VERSION")) { return (Resolve-Path $d).Path }
    }

    return $null
}

function Get-ProtocolVersionFrom {
    param([string]$Path)
    foreach ($f in @("VERSION", ".git-core-protocol-version")) {
        $p = Join-Path $Path $f
        if (Test-Path $p) {
            return (Get-Content $p -Raw).Trim()
        }
    }
    return "0.0.0"
}

function Compare-SemVer {
    param([string]$A, [string]$B)
    $pa = ($A -replace '[^0-9.].*', '') -split '\.' | ForEach-Object { [int]($_ -replace '\D','') }
    $pb = ($B -replace '[^0-9.].*', '') -split '\.' | ForEach-Object { [int]($_ -replace '\D','') }
    while ($pa.Count -lt 3) { $pa += 0 }
    while ($pb.Count -lt 3) { $pb += 0 }
    for ($i = 0; $i -lt 3; $i++) {
        if ($pa[$i] -lt $pb[$i]) { return -1 }
        if ($pa[$i] -gt $pb[$i]) { return 1 }
    }
    return 0
}

function Get-ProjectRoot {
    param([string]$Start = "")
    $dir = if ($Start) { $Start } else { (Get-Location).Path }
    for ($i = 0; $i -lt 10; $i++) {
        if ((Test-Path (Join-Path $dir ".gitcore")) -or (Test-Path (Join-Path $dir "AGENTS.md")) -or (Test-Path (Join-Path $dir ".git-core-protocol-version"))) {
            return $dir
        }
        $parent = Split-Path $dir -Parent
        if (-not $parent -or $parent -eq $dir) { break }
        $dir = $parent
    }
    return (Get-Location).Path
}

function Write-GcLog {
    param([string]$Message, [string]$Level = "INFO")
    $color = switch ($Level) {
        "OK" { "Green" }
        "WARN" { "Yellow" }
        "ERR" { "Red" }
        "DEBUG" { "DarkGray" }
        default { "Cyan" }
    }
    Write-Host "[$Level] $Message" -ForegroundColor $color
}

function Test-SrcCompleteness {
    param([string]$ProjectRoot)
    $path = Join-Path $ProjectRoot "SRC.md"
    if (-not (Test-Path $path)) { return @{ Score = 0; Max = 100; Missing = @("SRC.md missing") } }
    $t = Get-Content $path -Raw
    $checks = @(
        @{ Name = "Overview"; Pat = '(?i)overview|descripci[oó]n|purpose' },
        @{ Name = "Tree"; Pat = '(?i)directory|estructura|tree|```' },
        @{ Name = "Components"; Pat = '(?i)component|m[oó]dulo|core' },
        @{ Name = "BuildTest"; Pat = '(?i)build|test|run|cargo|pnpm|npm' },
        @{ Name = "CrossLink"; Pat = '(?i)SRS|AGENTS|\.gitcore' }
    )
    $ok = 0
    $missing = @()
    foreach ($c in $checks) {
        if ($t -match $c.Pat) { $ok++ } else { $missing += $c.Name }
    }
    return @{ Score = [math]::Round(100.0 * $ok / $checks.Count, 1); Max = 100; Missing = $missing }
}

function Test-SrsCompleteness {
    param([string]$ProjectRoot)
    $srs = Join-Path $ProjectRoot "docs\SRS"
    $files = @("index.md", "REQUIREMENTS.md", "ARCHITECTURE.md")
    $ok = 0
    $missing = @()
    foreach ($f in $files) {
        $p = Join-Path $srs $f
        if (Test-Path $p) {
            $len = (Get-Item $p).Length
            if ($len -gt 200) { $ok++ } else { $missing += "$f (too short)" }
        } else {
            $missing += $f
        }
    }
    $reqPath = Join-Path $srs "REQUIREMENTS.md"
    $reqBonus = 0
    if (Test-Path $reqPath) {
        $req = Get-Content $reqPath -Raw
        $reqCount = ([regex]::Matches($req, '(?m)^## REQ-')).Count
        if ($reqCount -ge 7) { $reqBonus = 20 }
        elseif ($reqCount -ge 3) { $reqBonus = 10 }
    }
    $base = [math]::Round(80.0 * $ok / $files.Count, 1)
    return @{ Score = [math]::Min(100, $base + $reqBonus); Max = 100; Missing = $missing }
}

function Get-FeatureClaimedPct {
    param($Feature)
    if ($null -eq $Feature) { return @{ Pct = $null; Source = "null" } }
    if ($null -ne $Feature.progress_pct) { return @{ Pct = [double]$Feature.progress_pct; Source = "progress_pct" } }
    if ($null -ne $Feature.implementation_percentage) { return @{ Pct = [double]$Feature.implementation_percentage; Source = "implementation_percentage" } }
    if ($null -ne $Feature.implementation_pct) { return @{ Pct = [double]$Feature.implementation_pct; Source = "implementation_pct" } }
    if ($null -ne $Feature.percent) { return @{ Pct = [double]$Feature.percent; Source = "percent" } }
    if ($null -ne $Feature.score) { return @{ Pct = [double]$Feature.score; Source = "score" } }
    if ($Feature.status) {
        $st = [string]$Feature.status
        $val = switch -Regex ($st) {
            '^(stable|complete|implemented|done|production)$' { 100 }
            '^(hardened)$' { 95 }
            '^(beta|partial)$' { 70 }
            '^(alpha|wip|in_progress|in-progress)$' { 50 }
            '^(draft|planned|todo)$' { 20 }
            default { $null }
        }
        if ($null -ne $val) { return @{ Pct = [double]$val; Source = "status:$st" } }
    }
    return @{ Pct = $null; Source = "unknown" }
}

function Find-FeaturesJsonPath {
    param([string]$ProjectRoot)
    $candidates = @(
        (Join-Path $ProjectRoot ".gitcore\features.json"),
        (Join-Path $ProjectRoot "features.json"),
        (Join-Path $ProjectRoot ".gitcore\features.details\index.json")
    )
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            try {
                $j = Get-Content $c -Raw | ConvertFrom-Json
                $feats = @()
                if ($j.features) { $feats = @($j.features) }
                elseif ($j -is [System.Array]) { $feats = @($j) }
                if ($feats.Count -gt 0 -or $c -like "*features.json") {
                    return $c
                }
            } catch { }
        }
    }
    return $null
}

function Get-ProjectFeatures {
    param([string]$ProjectRoot)
    $path = Find-FeaturesJsonPath $ProjectRoot
    if (-not $path) {
        return @{ Path = $null; Features = @(); Metadata = $null; Error = "features.json not found" }
    }
    try {
        $j = Get-Content $path -Raw | ConvertFrom-Json
        $feats = @()
        if ($j.features) { $feats = @($j.features) }
        elseif ($j -is [System.Array]) { $feats = @($j) }
        return @{ Path = $path; Features = $feats; Metadata = $j.metadata; Error = $null }
    } catch {
        return @{ Path = $path; Features = @(); Metadata = $null; Error = "$_" }
    }
}

function Get-FeaturesProgress {
    param([string]$ProjectRoot)
    $pack = Get-ProjectFeatures $ProjectRoot
    if ($pack.Error -and -not $pack.Path) {
        return @{ Score = $null; Count = 0; Source = "missing" }
    }
    if ($pack.Error) {
        return @{ Score = $null; Count = 0; Source = "parse error: $($pack.Error)" }
    }
    if ($pack.Metadata -and $null -ne $pack.Metadata.overall_progress_pct) {
        return @{
            Score  = [double]$pack.Metadata.overall_progress_pct
            Count  = $pack.Features.Count
            Source = "metadata.overall_progress_pct"
        }
    }
    $feats = $pack.Features
    if ($feats.Count -eq 0) {
        return @{ Score = 0; Count = 0; Source = "empty features" }
    }
    $sum = 0.0
    $n = 0
    $srcHint = "mixed"
    foreach ($f in $feats) {
        $c = Get-FeatureClaimedPct $f
        if ($null -ne $c.Pct) {
            $sum += $c.Pct
            $n++
            $srcHint = $c.Source
        }
    }
    if ($n -eq 0) { return @{ Score = 0; Count = $feats.Count; Source = "no scores" } }
    return @{ Score = [math]::Round($sum / $n, 1); Count = $feats.Count; Source = "average $srcHint" }
}

function Get-FeatureEvidencePaths {
    param($Feature)
    $paths = New-Object System.Collections.Generic.List[string]
    $fields = @("evidence", "implemented_in", "files", "paths", "locations", "source_files", "test_files", "tests")
    foreach ($field in $fields) {
        $v = $Feature.$field
        if ($null -eq $v) { continue }
        if ($v -is [string]) {
            # may be comma-separated or single path
            foreach ($part in ($v -split '[,;]')) {
                $t = $part.Trim()
                if ($t) { [void]$paths.Add($t) }
            }
        } elseif ($v -is [System.Array] -or $v -is [System.Collections.IEnumerable]) {
            foreach ($item in @($v)) {
                if ($null -eq $item) { continue }
                if ($item -is [string]) {
                    $t = $item.Trim()
                    if ($t) { [void]$paths.Add($t) }
                } elseif ($item.path) {
                    [void]$paths.Add([string]$item.path)
                } elseif ($item.file) {
                    [void]$paths.Add([string]$item.file)
                }
            }
        }
    }
    return @($paths | Select-Object -Unique)
}

function Resolve-ProjectPath {
    param([string]$ProjectRoot, [string]$RelOrAbs)
    if ([string]::IsNullOrWhiteSpace($RelOrAbs)) { return $null }

    # ---- normalize separators to the separator of THIS host ----
    #
    # features.json declares evidence with `/` (`site/src/lib/x.ts`), but a
    # contributor on Windows may write `\`. Both spellings name the same file,
    # so the path is rewritten to the separator of the host before it touches
    # the filesystem.
    #
    # Why this is not cosmetic: the previous code forced `\`
    # (`$RelOrAbs -replace '/', '\'`). On Linux a backslash is a legal file
    # name character, NOT a separator, so `site/src/lib/x.ts` became the single
    # (nonexistent) file `site\src\lib\x.ts`; the fuzzy fallback below then
    # filtered its candidates with that same backslash literal, which no Linux
    # path contains. Every declared path with more than one directory level was
    # reported MISS with the file sitting on disk: 170 of the 221 evidence
    # paths of this repo. `Expand-ProjectGlobPath` already normalized this way.
    $sep = [System.IO.Path]::DirectorySeparatorChar
    $norm = ($RelOrAbs -replace '[\\/]', $sep).Trim()
    while ($norm.StartsWith(".$sep")) { $norm = $norm.Substring(2) }

    if ([System.IO.Path]::IsPathRooted($RelOrAbs)) {
        if (Test-Path -LiteralPath $norm) { return (Resolve-Path -LiteralPath $norm).Path }
    }

    if ($ProjectRoot) {
        $joined = Join-Path $ProjectRoot $norm
        if (Test-Path -LiteralPath $joined) { return (Resolve-Path -LiteralPath $joined).Path }
    } elseif (Test-Path -LiteralPath $norm) {
        return (Resolve-Path -LiteralPath $norm).Path
    }

    # Fuzzy: evidence often listed as tests/foo but lives under apps/*/tests/foo
    $trimmed = $norm.TrimEnd($sep)
    $leaf = Split-Path $trimmed -Leaf
    $parentLeaf = Split-Path $trimmed -Parent
    $searchRoots = @(
        (Join-Path $ProjectRoot "apps"),
        (Join-Path $ProjectRoot "packages"),
        (Join-Path $ProjectRoot "src"),
        (Join-Path $ProjectRoot "tests"),
        $ProjectRoot
    )
    foreach ($sr in $searchRoots) {
        if (-not (Test-Path -LiteralPath $sr)) { continue }
        # glob/bracket leaves are never resolved by wildcard here: Test-Path/Get-ChildItem would
        # match a sibling file instead of the declared path (review round 2, P2).
        # A declared * / ? pattern is expanded later by Expand-ProjectGlobPath, which escapes
        # brackets so they stay literal (review round 3, P2).
        if ($leaf -match '[\*\?\[]') { break }
        # The parent filter compares against the separator of THIS host. With a
        # hardcoded `\` it matched nothing on Linux, so the whole fuzzy pass
        # returned $null for `site/src/lib/x.ts` even though the file exists.
        $parentPattern = if ($parentLeaf -and $parentLeaf -ne '.' -and $parentLeaf -ne '') {
            [regex]::Escape(($parentLeaf -replace '[\\/]', $sep))
        } else { $null }
        $keepCandidate = {
            if ($_.Name -ne $leaf) { return $false }
            if (-not $parentPattern) { return $true }
            return $_.FullName -match $parentPattern
        }
        # Files first: a declared path is a file far more often than a directory.
        $hits = @(Get-ChildItem -LiteralPath $sr -Recurse -File -Filter $leaf -ErrorAction SilentlyContinue |
            Where-Object $keepCandidate | Sort-Object -Property FullName | Select-Object -First 3)
        if ($hits.Count -eq 0) {
            # A declared directory (`site/src/pages/`) is evidence too, and the
            # file-only search above can never find one.
            $hits = @(Get-ChildItem -LiteralPath $sr -Recurse -Directory -Filter $leaf -ErrorAction SilentlyContinue |
                Where-Object $keepCandidate | Sort-Object -Property FullName | Select-Object -First 3)
        }
        if ($hits.Count -eq 1) {
            return $hits[0].FullName
        }
        if ($hits.Count -gt 1) {
            # prefer path that ends with the declared relative
            $declaredNorm = ($trimmed -replace '[\\/]', $sep).ToLowerInvariant()
            $best = $hits | Where-Object { $_.FullName.ToLowerInvariant().EndsWith($declaredNorm) } | Select-Object -First 1
            if ($best) { return $best.FullName }
            return $hits[0].FullName
        }
    }
    return $null
}

function Test-ContainsGlobWildcard {
    <#
    .SYNOPSIS
      True when a declared evidence path uses * or ?. Brackets ([ ]) are always literal.
    #>
    param([string]$PathText)
    if ([string]::IsNullOrWhiteSpace($PathText)) { return $false }
    return [bool]($PathText -match '[\*\?]')
}

function ConvertTo-LiteralBracketWildcard {
    <#
    .SYNOPSIS
      Escape [ ] and ` so a wildcard pattern keeps * and ? active while brackets stay literal.
      Uses [System.Management.Automation.WildcardPattern]::Escape on the bracket parts.
    #>
    param([string]$PatternText)
    if ([string]::IsNullOrEmpty($PatternText)) { return "" }
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $PatternText.ToCharArray()) {
        if ($ch -eq '[') { [void]$sb.Append([System.Management.Automation.WildcardPattern]::Escape('[')) }
        elseif ($ch -eq ']') { [void]$sb.Append([System.Management.Automation.WildcardPattern]::Escape(']')) }
        elseif ($ch -eq '`') { [void]$sb.Append('``') }
        else { [void]$sb.Append($ch) }
    }
    return $sb.ToString()
}

function Expand-ProjectGlobPath {
    <#
    .SYNOPSIS
      Expand an evidence path that declares * or ? into the files it matches.

    .DESCRIPTION
      Only called AFTER literal resolution failed (literal evidence always wins). Brackets
      are never treated as wildcards: they are escaped before expansion. The caller
      aggregates the returned files as ONE evidence entry (credit from files read,
      cap reported). No match -> Matched=false, i.e. missing evidence.
    #>
    param(
        [string]$ProjectRoot,
        [string]$RelOrAbs,
        [int]$MaxFiles = 50,
        [string]$IgnoreRegex = ""
    )
    $none = [pscustomobject]@{ IsGlob = $false; Matched = $false; Files = @(); Total = 0; Capped = $false; Pattern = "" }
    if ([string]::IsNullOrWhiteSpace($RelOrAbs)) { return $none }
    if (-not (Test-ContainsGlobWildcard $RelOrAbs)) { return $none }

    $sep = [System.IO.Path]::DirectorySeparatorChar
    $absPattern = if ([System.IO.Path]::IsPathRooted($RelOrAbs)) {
        ($RelOrAbs -replace '[\\/]', $sep)
    } elseif ($ProjectRoot) {
        Join-Path $ProjectRoot ($RelOrAbs -replace '[\\/]', $sep)
    } else {
        ($RelOrAbs -replace '[\\/]', $sep)
    }

    $wildcard = ConvertTo-LiteralBracketWildcard $absPattern
    $hits = @()
    try { $hits = @(Get-ChildItem -Path $wildcard -File -ErrorAction SilentlyContinue) } catch { $hits = @() }
    if ($IgnoreRegex) { $hits = @($hits | Where-Object { $_.FullName -notmatch $IgnoreRegex }) }
    $hits = @($hits | Sort-Object -Property FullName -Unique)

    if ($MaxFiles -gt 0 -and $hits.Count -gt $MaxFiles) {
        return [pscustomobject]@{
            IsGlob  = $true
            Matched = $true
            Files   = @($hits | Select-Object -First $MaxFiles)
            Total   = $hits.Count
            Capped  = $true
            Pattern = $absPattern
        }
    }
    return [pscustomobject]@{
        IsGlob  = $true
        Matched = ($hits.Count -gt 0)
        Files   = @($hits)
        Total   = $hits.Count
        Capped  = $false
        Pattern = $absPattern
    }
}

function Get-FileExcerpt {
    <#
    .SYNOPSIS
      Read a file slice with line numbers for agent context (cat/tail/head/range).
    #>
    param(
        [string]$Path,
        [ValidateSet("head", "tail", "range", "full")]
        [string]$Mode = "head",
        [int]$Lines = 40,
        [int]$StartLine = 1,
        [int]$EndLine = 0,
        [int]$MaxChars = 12000
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        return @{ Ok = $false; Error = "missing"; Lines = @(); Text = "" }
    }
    $all = Get-Content -LiteralPath $Path -ErrorAction Stop
    $total = $all.Count
    if ($total -eq 0) {
        return @{ Ok = $true; TotalLines = 0; Start = 0; End = 0; Lines = @(); Text = "(empty file)" }
    }

    $from = 1
    $to = $total
    switch ($Mode) {
        "head" {
            $from = 1
            $to = [Math]::Min($Lines, $total)
        }
        "tail" {
            $from = [Math]::Max(1, $total - $Lines + 1)
            $to = $total
        }
        "range" {
            $from = [Math]::Max(1, $StartLine)
            if ($EndLine -gt 0) { $to = [Math]::Min($EndLine, $total) }
            else { $to = [Math]::Min($from + $Lines - 1, $total) }
        }
        "full" {
            $from = 1
            $to = $total
        }
    }

    $slice = @()
    for ($i = $from; $i -le $to; $i++) {
        $slice += ("L{0,5}|{1}" -f $i, $all[$i - 1])
    }
    $text = $slice -join "`n"
    if ($text.Length -gt $MaxChars) {
        $text = $text.Substring(0, $MaxChars) + "`n… [truncated MaxChars=$MaxChars]"
    }
    return @{
        Ok         = $true
        TotalLines = $total
        Start      = $from
        End        = $to
        Lines      = $slice
        Text       = $text
        Mode       = $Mode
    }
}

function Search-FileKeywordHits {
    param(
        [string]$Path,
        [string[]]$Keywords,
        [int]$Context = 2,
        [int]$MaxHits = 8
    )
    if (-not (Test-Path -LiteralPath $Path) -or -not $Keywords -or $Keywords.Count -eq 0) {
        return @()
    }
    $all = Get-Content -LiteralPath $Path -ErrorAction SilentlyContinue
    if (-not $all) { return @() }
    $hits = @()
    for ($i = 0; $i -lt $all.Count -and $hits.Count -lt $MaxHits; $i++) {
        $line = $all[$i]
        foreach ($kw in $Keywords) {
            if ([string]::IsNullOrWhiteSpace($kw)) { continue }
            if ($line -match [regex]::Escape($kw)) {
                $from = [Math]::Max(0, $i - $Context)
                $to = [Math]::Min($all.Count - 1, $i + $Context)
                $block = @()
                for ($j = $from; $j -le $to; $j++) {
                    $mark = if ($j -eq $i) { ">" } else { " " }
                    $block += ("{0}L{1,5}|{2}" -f $mark, ($j + 1), $all[$j])
                }
                $hits += [pscustomobject]@{
                    Keyword = $kw
                    Line    = $i + 1
                    Snippet = ($block -join "`n")
                }
                break
            }
        }
    }
    return $hits
}

function Get-SrsRequirements {
    <#
    .SYNOPSIS
      Parse docs/SRS/REQUIREMENTS.md into structured REQ objects.
    #>
    param([string]$ProjectRoot)
    $path = Join-Path $ProjectRoot "docs\SRS\REQUIREMENTS.md"
    if (-not (Test-Path $path)) {
        return @{ Path = $null; Requirements = @(); Error = "REQUIREMENTS.md missing" }
    }
    $raw = Get-Content $path -Raw
    $parts = [regex]::Split($raw, '(?m)(?=^##\s+REQ-)')
    $reqs = @()
    foreach ($part in $parts) {
        if ($part -notmatch '(?m)^##\s+(REQ-\d+[A-Za-z0-9_-]*)\s*:?\s*(.*)$') { continue }
        $id = $Matches[1]
        $title = $Matches[2].Trim()
        $files = @()
        if ($part -match '(?im)\*\*Files:\*\*\s*(.+)') {
            $fileLine = $Matches[1]
            $files = [regex]::Matches($fileLine, '`([^`]+)`') | ForEach-Object { $_.Groups[1].Value.Trim() }
            if ($files.Count -eq 0) {
                # plain paths after Files:
                $files = $fileLine -split '[,;]' | ForEach-Object {
                    ($_ -replace '[\*\(\)]', '').Trim()
                } | Where-Object { $_ -and $_ -notmatch '^\*' -and $_.Length -gt 2 -and $_ -notmatch 'app-specific|optional' }
            }
        }
        # also bullet file links [ver x](path)
        $linkFiles = [regex]::Matches($part, '\[[^\]]*\]\(([^)]+)\)') | ForEach-Object { $_.Groups[1].Value }
        foreach ($lf in $linkFiles) {
            if ($lf -match '\.(md|ts|tsx|rs|py|json|ps1)$' -or $lf -match '^(src|apps|docs|\.gitcore)/') {
                $files += $lf
            }
        }
        $files = @($files | Select-Object -Unique)
        $estado = "unknown"
        if ($part -match '(?im)SRS Estado:\*\*\s*`?(\w+)`?') { $estado = $Matches[1] }
        elseif ($part -match '(?im)\*\*Estado:\*\*\s*`?(\w+)`?') { $estado = $Matches[1] }
        $bodyPreview = ($part -replace '(?s)\s+', ' ').Trim()
        if ($bodyPreview.Length -gt 400) { $bodyPreview = $bodyPreview.Substring(0, 400) + "…" }
        $reqs += [pscustomobject]@{
            Id          = $id
            Title       = $title
            Files       = $files
            Estado      = $estado
            BodyPreview = $bodyPreview
            RawLength   = $part.Length
        }
    }
    return @{ Path = $path; Requirements = $reqs; Error = $null }
}

function Get-FeatureLinkedReqs {
    param(
        $Feature,
        [string]$FeatureId,
        [array]$Requirements
    )
    if (-not $Requirements -or $Requirements.Count -eq 0) { return @() }
    $linked = @()
    $ev = @(Get-FeatureEvidencePaths $Feature)
    $evNorm = $ev | ForEach-Object { ($_ -replace '\\', '/').ToLowerInvariant() }
    $name = [string]$Feature.name
    $desc = [string]$Feature.description
    $blob = "$FeatureId $name $desc".ToLowerInvariant()

    # explicit fields on feature
    $explicit = @()
    foreach ($field in @("req_id", "req_ids", "srs", "srs_ids", "requirements")) {
        $v = $Feature.$field
        if ($null -eq $v) { continue }
        if ($v -is [string]) { $explicit += ($v -split '[,;]') }
        else { foreach ($x in @($v)) { $explicit += [string]$x } }
    }
    $explicit = @($explicit | ForEach-Object { $_.Trim() } | Where-Object { $_ })

    foreach ($req in $Requirements) {
        $score = 0
        $reasons = @()
        if ($explicit | Where-Object { $_ -eq $req.Id -or $_ -like "*$($req.Id)*" }) {
            $score += 100
            $reasons += "explicit"
        }
        # file overlap
        foreach ($rf in @($req.Files)) {
            $rn = ($rf -replace '\\', '/').ToLowerInvariant()
            foreach ($e in $evNorm) {
                if ($e -and ($e.EndsWith($rn) -or $rn.EndsWith($e) -or $e.Contains($rn) -or $rn.Contains($e))) {
                    $score += 40
                    $reasons += "file:$rf"
                }
            }
            # feature id token in path (e.g. mesh)
            $idTok = ($FeatureId -split '[-_]' | Where-Object { $_.Length -ge 4 } | Select-Object -First 3)
            foreach ($t in $idTok) {
                if ($rn -match [regex]::Escape($t.ToLowerInvariant())) {
                    $score += 10
                    $reasons += "path-token:$t"
                }
            }
        }
        # textual mention of feature id in REQ body
        if ($req.BodyPreview -and $FeatureId -and $req.BodyPreview.ToLowerInvariant().Contains($FeatureId.ToLowerInvariant())) {
            $score += 50
            $reasons += "body-id"
        }
        # title/name token overlap
        $reqBlob = "$($req.Title) $($req.BodyPreview)".ToLowerInvariant()
        $tokens = ($name -split '\W+' | Where-Object { $_.Length -ge 5 } | Select-Object -First 6)
        foreach ($t in $tokens) {
            if ($reqBlob.Contains($t.ToLowerInvariant())) {
                $score += 8
                $reasons += "title-token:$t"
            }
        }
        # SWAL baseline mapping heuristics
        if ($FeatureId -match 'PWA|OFFLINE' -and $req.Id -eq 'REQ-007') { $score += 5 }
        if ($FeatureId -match 'MESH|P2P|CRDT|EDGE' -and $req.Id -eq 'REQ-004') { $score += 15; $reasons += "heuristic-mesh" }
        if ($FeatureId -match 'AI|XAVIER|AGENT|MEMORY' -and $req.Id -eq 'REQ-005') { $score += 15; $reasons += "heuristic-memory" }
        if ($FeatureId -match 'MONET|STRIPE|PRO|SUBSCRIP' -and $req.Id -eq 'REQ-003') { $score += 15; $reasons += "heuristic-pro" }
        if ($FeatureId -match 'AUTH|SECURITY|PQC' -and $req.Id -eq 'REQ-006') { $score += 12; $reasons += "heuristic-sec" }

        if ($score -ge 15) {
            $linked += [pscustomobject]@{
                ReqId    = $req.Id
                Title   = $req.Title
                Score   = $score
                Reasons = @($reasons | Select-Object -Unique)
                Files   = $req.Files
                Estado  = $req.Estado
            }
        }
    }
    return @($linked | Sort-Object Score -Descending)
}

function Get-SuggestedImplementationPct {
    <#
    .SYNOPSIS
      Heuristic suggested % from evidence existence, tests, size, keywords, gaps.
    #>
    param(
        [double]$ClaimedPct = -1,
        [double]$EvidenceScorePct = 0,
        [int]$EvidenceExists = 0,
        [int]$EvidenceMissing = 0,
        [int]$EvidenceDeclared = 0,
        [int]$TotalCodeLines = 0,
        [int]$TestFileCount = 0,
        [int]$KeywordHitCount = 0,
        [bool]$HasGaps = $false,
        [string]$Status = ""
    )

    $breakdown = [ordered]@{}
    $score = 0.0

    # Evidence presence (0-45)
    $evPart = [math]::Round($EvidenceScorePct * 0.45, 1)
    if ($EvidenceDeclared -eq 0) {
        $evPart = 5  # unknown evidence map
        $breakdown.evidence = "5 (no paths declared)"
    } else {
        $breakdown.evidence = "$evPart (exists=$EvidenceExists/$EvidenceDeclared)"
    }
    $score += $evPart

    # Tests (0-25)
    $testPart = [math]::Min(25, $TestFileCount * 12)
    $breakdown.tests = "$testPart (test_files=$TestFileCount)"
    $score += $testPart

    # Code bulk (0-15)
    $codePart = 0
    if ($TotalCodeLines -ge 1000) { $codePart = 15 }
    elseif ($TotalCodeLines -ge 200) { $codePart = 12 }
    elseif ($TotalCodeLines -ge 50) { $codePart = 8 }
    elseif ($TotalCodeLines -ge 10) { $codePart = 4 }
    $breakdown.code_size = "$codePart (lines=$TotalCodeLines)"
    $score += $codePart

    # Keyword hits (0-10)
    $kwPart = [math]::Min(10, $KeywordHitCount * 2)
    $breakdown.keywords = "$kwPart (hits=$KeywordHitCount)"
    $score += $kwPart

    # Status prior (0-10)
    $stPart = switch -Regex ($Status) {
        '^(stable|complete|implemented|done|production|hardened)$' { 8 }
        '^(beta|partial)$' { 5 }
        '^(alpha|wip|in_progress)$' { 3 }
        '^(draft|planned)$' { 1 }
        default { 2 }
    }
    $breakdown.status_prior = "$stPart ($Status)"
    $score += $stPart

    if ($HasGaps) {
        $score -= 8
        $breakdown.gaps_penalty = -8
    } else {
        $breakdown.gaps_penalty = 0
    }

    # If claimed very high but evidence missing heavily, floor
    if ($ClaimedPct -ge 90 -and $EvidenceScorePct -lt 40 -and $EvidenceDeclared -gt 0) {
        $score = [math]::Min($score, 55)
        $breakdown.overclaim_floor = "capped at 55"
    }

    $score = [math]::Max(0, [math]::Min(100, [math]::Round($score, 1)))

    $delta = $null
    if ($ClaimedPct -ge 0) { $delta = [math]::Round($score - $ClaimedPct, 1) }

    $verdict = "partial"
    if ($EvidenceDeclared -gt 0 -and $EvidenceExists -eq 0) {
        $verdict = "missing"
    } elseif ($ClaimedPct -ge 0 -and $delta -le -15) {
        $verdict = "overstated"
    } elseif ($ClaimedPct -ge 0 -and $delta -ge 15 -and $score -lt 85) {
        $verdict = "understated"
    } elseif ($ClaimedPct -ge 0 -and [math]::Abs($delta) -le 8 -and $EvidenceScorePct -ge 70) {
        $verdict = "confirmed"
    } elseif ($score -ge 85 -and $EvidenceScorePct -ge 80) {
        $verdict = "confirmed"
    }

    return @{
        SuggestedPct = $score
        Delta        = $delta
        Verdict      = $verdict
        Breakdown    = $breakdown
    }
}
