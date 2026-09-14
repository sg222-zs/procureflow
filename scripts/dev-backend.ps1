$ErrorActionPreference = "Stop"
$BackendDir = Join-Path $PSScriptRoot "..\backend"
Set-Location $BackendDir

$VenvPython = Join-Path $BackendDir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Error "Python virtual environment not found at $VenvPython. Please run 'python -m venv .venv' and install dependencies first."
}

if (-not (Test-Path (Join-Path $BackendDir ".env"))) {
    Copy-Item (Join-Path $BackendDir ".env.example") (Join-Path $BackendDir ".env")
    Write-Host "Created backend/.env from .env.example" -ForegroundColor Yellow
}

Write-Host "Starting ProcureFlow Flask backend on http://127.0.0.1:5000 ..." -ForegroundColor Cyan
& $VenvPython -m flask --app procureflow:create_app run --debug --host 127.0.0.1 --port 5000
