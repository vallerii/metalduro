[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$demoRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'MetalduroDemo'
$pidFile = Join-Path $demoRoot 'next.pid'

if (Test-Path -LiteralPath $pidFile) {
  $nextPid = [int](Get-Content -LiteralPath $pidFile -Raw)
  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $nextPid" -ErrorAction SilentlyContinue
  if ($process -and $process.Name -eq 'node.exe' -and $process.CommandLine -match 'next(.cmd|\\dist\\bin\\next|/dist/bin/next)') {
    Stop-Process -Id $nextPid -Force
  } elseif ($process) {
    throw "Refusing to stop unexpected process $nextPid."
  }
  Remove-Item -LiteralPath $pidFile -Force
}

Push-Location $projectRoot
try {
  & npx supabase stop
  if ($LASTEXITCODE -ne 0) { throw 'Failed to stop the Metalduro Supabase stack.' }
} finally {
  Pop-Location
}

Write-Output 'Metalduro Next.js and its local Supabase stack are stopped. Other Docker projects were not touched.'
