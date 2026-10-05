param([int]$Port = 5000)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$projectPython = Join-Path $projectRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $projectPython)) { $projectPython = Join-Path $projectRoot '.venv\bin\python.exe' }
if (-not (Test-Path -LiteralPath $projectPython)) { throw 'Create .venv and install backend/requirements-lock.txt first.' }
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'backend\.env'))) { throw 'Configure backend/.env or run bootstrap_local.py first.' }
$env:APP_PORT = "$Port"
& $projectPython (Join-Path $projectRoot 'backend\run.py')
