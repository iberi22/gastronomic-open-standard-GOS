# Quick installer for git-core CLI (Windows)
# Usage: irm https://raw.githubusercontent.com/iberi22/Git-Core-Protocol/main/scripts/install-cli.ps1 | iex

$ErrorActionPreference = "Stop"

$REPO = "iberi22/Git-Core-Protocol"
$BINARY_NAME = "gc"
$INSTALL_DIR = "$env:LOCALAPPDATA\git-core"
$RAW_URL = "https://raw.githubusercontent.com/$REPO/main/bin"

Write-Host "🧠 Git-Core CLI Installer" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Detect architecture
$ARCH = [System.Environment]::Is64BitOperatingSystem
if (-not $ARCH) {
    Write-Host "❌ 32-bit Windows is not supported" -ForegroundColor Red
    exit 1
}

$TARGET = "x86_64-pc-windows-msvc"
Write-Host "Platform: Windows x64" -ForegroundColor Cyan
Write-Host "Target: $TARGET" -ForegroundColor Cyan
Write-Host ""

# Create install directory
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null
$BINARY_PATH = "$INSTALL_DIR\$BINARY_NAME.exe"

# Try repo's bin/ folder first (fastest)
$REPO_BIN_URL = "$RAW_URL/${BINARY_NAME}.exe"
Write-Host "Checking for pre-built binary..."

try {
    $response = Invoke-WebRequest -Uri $REPO_BIN_URL -Method Head -UseBasicParsing -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host "Found pre-built binary in repo" -ForegroundColor Green
        Write-Host "Downloading from bin/..."
        Invoke-WebRequest -Uri $REPO_BIN_URL -OutFile $BINARY_PATH -UseBasicParsing
        Write-Host "✅ Installed from repo bin/" -ForegroundColor Green
    }
} catch {
    # Try GitHub releases
    Write-Host "Checking GitHub releases..."
    try {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest" -ErrorAction SilentlyContinue
        $LATEST_RELEASE = $release.tag_name

        if ($LATEST_RELEASE) {
            Write-Host "Latest release: $LATEST_RELEASE" -ForegroundColor Green
            $DOWNLOAD_URL = "https://github.com/$REPO/releases/download/$LATEST_RELEASE/${BINARY_NAME}.exe"

            Write-Host "Downloading from release..."
            Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile $BINARY_PATH -UseBasicParsing
            Write-Host "✅ Installed from release" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ No pre-built binary found and source installation is deprecated." -ForegroundColor Red
        Write-Host "   Please check the repository for manual installation instructions."
        exit 1
    }
}

# Add to PATH if not already there
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$INSTALL_DIR*") {
    Write-Host ""
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$INSTALL_DIR", "User")
    $env:Path = "$env:Path;$INSTALL_DIR"
    Write-Host "✅ Added $INSTALL_DIR to PATH" -ForegroundColor Green
}

# Configure gc alias (overriding Get-Content)
Write-Host ""
Write-Host "🔧 Configuring 'gc' alias..." -ForegroundColor Yellow
$PROFILE_PATH = $PROFILE.CurrentUserAllHosts
if (-not $PROFILE_PATH) {
    $PROFILE_PATH = "$HOME\Documents\PowerShell\Microsoft.PowerShell_profile.ps1"
}

$ALIAS_COMMAND = "if (Get-Alias gc -ErrorAction SilentlyContinue) { Remove-Item alias:gc -Force }; Set-Alias -Name gc -Value '$BINARY_PATH' -Scope Global"

if (-not (Test-Path $PROFILE_PATH)) {
    New-Item -ItemType File -Path $PROFILE_PATH -Force | Out-Null
}

$profileContent = Get-Content $PROFILE_PATH -Raw -ErrorAction SilentlyContinue
if ($profileContent -notmatch "Set-Alias -Name gc -Value .*gc\.exe") {
    Add-Content -Path $PROFILE_PATH -Value "`n# Git-Core CLI Alias`n$ALIAS_COMMAND"
    Write-Host "✅ Added 'gc' alias to `$PROFILE" -ForegroundColor Green
}

# Apply to current session
Invoke-Expression $ALIAS_COMMAND

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""

# Test installation
try {
    gc --version
    Write-Host ""
    Write-Host "Run 'gc --help' to get started" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Please restart your terminal to use 'gc'" -ForegroundColor Yellow
}
