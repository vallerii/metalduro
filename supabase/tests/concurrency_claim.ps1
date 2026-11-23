$ErrorActionPreference = "Stop"

$container = if ($env:SUPABASE_TEST_DB_CONTAINER) {
  $env:SUPABASE_TEST_DB_CONTAINER
} else {
  docker ps --format "{{.Names}}" | Where-Object { $_ -eq "supabase_db_metalduro" } | Select-Object -First 1
}
if (-not $container) {
  throw "Local Supabase database container is not running."
}
$runningContainer = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $container } | Select-Object -First 1
if (-not $runningContainer) {
  throw "Configured Supabase database container is not running: $container"
}

$applicationId = "50000000-0000-0000-0000-000000000001"
$clientId = "50000000-0000-0000-0000-000000000010"
$adminAId = "50000000-0000-0000-0000-000000000011"
$adminBId = "50000000-0000-0000-0000-000000000012"

function Invoke-Psql([string]$sql) {
  $processStartInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processStartInfo.FileName = "docker"
  $processStartInfo.UseShellExecute = $false
  $processStartInfo.RedirectStandardOutput = $true
  $processStartInfo.RedirectStandardError = $true
  foreach ($argument in @(
    "exec", $container, "psql", "-U", "postgres", "-d", "postgres",
    "-v", "ON_ERROR_STOP=1", "-Atc", $sql
  )) {
    $processStartInfo.ArgumentList.Add($argument)
  }
  $process = [System.Diagnostics.Process]::new()
  $process.StartInfo = $processStartInfo
  $process.Start() | Out-Null
  $output = $process.StandardOutput.ReadToEnd()
  $errorOutput = $process.StandardError.ReadToEnd()
  $process.WaitForExit()
  if ($process.ExitCode -ne 0) {
    throw ($output + $errorOutput).Trim()
  }
  return $output.Trim()
}

function New-PsqlProcess([string]$sql) {
  $processStartInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $processStartInfo.FileName = "docker"
  $processStartInfo.UseShellExecute = $false
  $processStartInfo.RedirectStandardOutput = $true
  $processStartInfo.RedirectStandardError = $true
  foreach ($argument in @(
    "exec", $container, "psql", "-U", "postgres", "-d", "postgres",
    "-v", "ON_ERROR_STOP=1", "-Atc", $sql
  )) {
    $processStartInfo.ArgumentList.Add($argument)
  }
  return [System.Diagnostics.Process]::new() | ForEach-Object {
    $_.StartInfo = $processStartInfo
    $_
  }
}

$setupSql = @"
begin;
delete from public.applications where id = '$applicationId';
delete from auth.users where id in ('$clientId', '$adminAId', '$adminBId');
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '$clientId', 'authenticated', 'authenticated', 'concurrent-client@example.test', crypt('Password-123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Concurrent Client"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '$adminAId', 'authenticated', 'authenticated', 'concurrent-admin-a@example.test', crypt('Password-123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Concurrent Admin A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '$adminBId', 'authenticated', 'authenticated', 'concurrent-admin-b@example.test', crypt('Password-123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Concurrent Admin B"}', now(), now(), '', '', '', '');
update public.profiles set role = 'admin' where user_id in ('$adminAId', '$adminBId');
select set_config('request.jwt.claims', '{"sub":"$clientId","role":"authenticated"}', true);
insert into public.applications (
  id, client_id, material_id, declared_weight_kg, rate_snapshot_eur, estimated_amount_eur
)
values ('$applicationId', '$clientId', 'solid', 1, 40, 40);
commit;
"@

$claimASql = @"
begin;
select set_config('request.jwt.claims', '{"sub":"$adminAId","role":"authenticated"}', true);
select id from public.applications where id = '$applicationId' for update;
select pg_sleep(2);
select manager_id from public.claim_application('$applicationId');
commit;
"@

$claimBSql = @"
begin;
select set_config('request.jwt.claims', '{"sub":"$adminBId","role":"authenticated"}', true);
select manager_id from public.claim_application('$applicationId');
commit;
"@

$cleanupSql = @"
begin;
delete from public.applications where id = '$applicationId';
delete from auth.users where id in ('$clientId', '$adminAId', '$adminBId');
commit;
"@

try {
  Invoke-Psql $setupSql | Out-Null

  $processA = New-PsqlProcess $claimASql
  $processB = New-PsqlProcess $claimBSql
  $processA.Start() | Out-Null
  Start-Sleep -Milliseconds 300
  $processB.Start() | Out-Null

  $processA.WaitForExit()
  $processB.WaitForExit()
  $outputA = $processA.StandardOutput.ReadToEnd()
  $errorA = $processA.StandardError.ReadToEnd()
  $outputB = $processB.StandardOutput.ReadToEnd()
  $errorB = $processB.StandardError.ReadToEnd()

  $successfulClaims = (@($processA.ExitCode, $processB.ExitCode) | Where-Object { $_ -eq 0 }).Count
  if ($successfulClaims -ne 1) {
    throw "Expected exactly one successful claim. A=$($processA.ExitCode), B=$($processB.ExitCode)`n$outputA$errorA$outputB$errorB"
  }

  $result = Invoke-Psql "select manager_id::text || '|' || status::text || '|' || (select count(*)::text from public.application_status_history where application_id = '$applicationId') from public.applications where id = '$applicationId';"
  if ($result -ne "$adminAId|in_progress|2") {
    throw "Unexpected claim result: $result"
  }

  Write-Output "PASS: exactly one concurrent claim succeeded; manager and history are consistent."
} finally {
  Invoke-Psql $cleanupSql | Out-Null
}
