param([int]$Port = 3307, [string]$MySqlHome = 'C:\Program Files\MySQL\MySQL Server 26.7')
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$dataRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.local\mysql'))
if (-not $dataRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Data path escaped the project.' }
$serverExe = Join-Path $MySqlHome 'bin\mysqld.exe'
if (-not (Test-Path -LiteralPath $serverExe)) { throw "MySQL server executable missing: $serverExe" }
New-Item -ItemType Directory -Path $dataRoot -Force | Out-Null
$dataDir = Join-Path $dataRoot 'data'
$logFile = Join-Path $dataRoot 'server.log'
if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'mysql'))) {
    if ((Test-Path -LiteralPath $dataDir) -and @(Get-ChildItem -LiteralPath $dataDir -Force).Count -gt 0) { throw 'Existing data directory was not initialized by this helper.' }
    & $serverExe --no-defaults --initialize-insecure "--basedir=$MySqlHome" "--datadir=$dataDir" "--log-error=$logFile"
    if ($LASTEXITCODE -ne 0) { throw "MySQL initialization failed; inspect $logFile" }
}
$client = [Net.Sockets.TcpClient]::new()
try { $client.Connect('127.0.0.1', $Port); Write-Output "Port $Port is already listening; no new server was started."; exit 0 } catch {} finally { $client.Dispose() }
$serverArgs = @('--no-defaults', "--basedir=`"$MySqlHome`"", "--datadir=`"$dataDir`"", "--log-error=`"$logFile`"", "--port=$Port", '--bind-address=127.0.0.1', '--mysqlx=OFF', '--skip-log-bin')
$process = Start-Process -FilePath $serverExe -ArgumentList $serverArgs -WindowStyle Hidden -PassThru
$process.Id | Set-Content -LiteralPath (Join-Path $dataRoot 'server.pid')
for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Milliseconds 500
    $client = [Net.Sockets.TcpClient]::new()
    try { $client.Connect('127.0.0.1', $Port); Write-Output "Project MySQL ready at 127.0.0.1:$Port (PID $($process.Id))."; exit 0 } catch {} finally { $client.Dispose() }
    if ($process.HasExited) { throw "Project MySQL stopped; inspect $logFile" }
}
throw "Project MySQL did not become ready; inspect $logFile"
