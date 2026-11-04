# ChainKYC - One-Click Launcher for Windows PowerShell
$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Starting ChainKYC (Local Blockchain + Full Stack)" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

# Check node
try {
    $nodeVer = node -v
    Write-Host "[OK] Node.js $nodeVer detected" -ForegroundColor Gray
} catch {
    Write-Error "Node.js is not installed or not in PATH."
}

# Run launcher script
node "$root\scripts\run-dev.js"
