$ErrorActionPreference = "Stop"
$FrontendDir = Join-Path $PSScriptRoot "..\frontend"
Set-Location $FrontendDir

Write-Host "Starting ProcureFlow Frontend on http://127.0.0.1:5173 ..." -ForegroundColor Cyan
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm dev
} else {
    corepack pnpm dev
}
