[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$demoRoot = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'MetalduroDemo'
$pidFile = Join-Path $demoRoot 'next.pid'
$stdoutLog = Join-Path $demoRoot 'next.stdout.log'
$stderrLog = Join-Path $demoRoot 'next.stderr.log'

New-Item -ItemType Directory -Path $demoRoot -Force | Out-Null

Push-Location $projectRoot
try {
  & npx supabase start | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Failed to start local Supabase.' }

  $status = & npx supabase status -o env 2>$null
  if ($LASTEXITCODE -ne 0) { throw 'Failed to read local Supabase status.' }
  $values = @{}
  foreach ($line in $status) {
    if ($line -match '^([A-Z0-9_]+)=(.*)$') {
      $value = $matches[2].Trim()
      if ($value.StartsWith('"')) { $value = $value | ConvertFrom-Json }
      $values[$matches[1]] = $value
    }
  }
  if ($values.API_URL -ne 'http://127.0.0.1:54621') { throw 'Refusing to use a non-demo Supabase URL.' }
  if (-not $values.PUBLISHABLE_KEY) { throw 'Local publishable key is missing.' }

  if (Test-Path -LiteralPath $pidFile) {
    $existingPid = [int](Get-Content -LiteralPath $pidFile -Raw)
    $existing = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
    if ($existing) {
      Write-Output "Metalduro demo is already running at http://localhost:3000 (PID $existingPid)."
      exit 0
    }
  }

  $env:NEXT_PUBLIC_SUPABASE_URL = $values.API_URL
  $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $values.PUBLISHABLE_KEY
  $env:NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
  $env:EMAIL_PROVIDER = 'mock'
  $env:EMAIL_EXTERNAL_DELIVERY_ENABLED = 'false'
  Remove-Item Env:BREVO_API_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue

  $node = (Get-Command node).Source
  $process = Start-Process -FilePath $node `
    -ArgumentList @('node_modules/next/dist/bin/next', 'dev', '-p', '3000') `
    -WorkingDirectory $projectRoot `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -WindowStyle Hidden `
    -PassThru
  [System.IO.File]::WriteAllText($pidFile, [string]$process.Id)

  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt += 1) {
    Start-Sleep -Seconds 1
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 3
      if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
  }
  if (-not $ready) { throw "Next.js did not become ready. See $stderrLog" }
  Write-Output "Metalduro demo started: http://localhost:3000 (PID $($process.Id))."
} finally {
  Pop-Location
}
