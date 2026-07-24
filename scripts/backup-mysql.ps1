# Backup MySQL do Aten AI (Windows / PowerShell).
# Uso (na raiz do monorepo):
#   .\scripts\backup-mysql.ps1
# Variáveis opcionais: BACKUP_DIR, RETENTION_DAYS

$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $PSScriptRoot
$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { Join-Path $RootDir "backups" }
$RetentionDays = if ($env:RETENTION_DAYS) { [int]$env:RETENTION_DAYS } else { 7 }
$ComposeService = if ($env:COMPOSE_SERVICE) { $env:COMPOSE_SERVICE } else { "mysql" }

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$EnvFile = Join-Path $RootDir ".env"
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $parts = $_.Split('=', 2)
    if ($parts.Length -eq 2) {
      $name = $parts[0].Trim()
      $value = $parts[1].Trim().Trim('"').Trim("'")
      Set-Item -Path "Env:$name" -Value $value
    }
  }
}

if (-not $env:DB_PASS) { throw "Defina DB_PASS no .env ou no ambiente." }
$DbName = if ($env:DB_NAME) { $env:DB_NAME } else { "aten_ai_db" }
$DbUser = if ($env:DB_USER) { $env:DB_USER } else { "aten_ai" }

$Stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$OutFile = Join-Path $BackupDir "aten_ai_$Stamp.sql.gz"
$TmpSql = Join-Path $env:TEMP "aten_ai_$Stamp.sql"

Write-Host "[backup] Gerando $OutFile ..."

$composeFile = Join-Path $RootDir "docker-compose.yml"
$useDocker = $false
try {
  $ps = docker compose -f $composeFile ps --status running $ComposeService 2>$null
  if ($ps -and ($ps -join "`n") -match $ComposeService) { $useDocker = $true }
} catch { $useDocker = $false }

if ($useDocker) {
  docker compose -f $composeFile exec -T $ComposeService `
    mysqldump "-u$DbUser" "-p$($env:DB_PASS)" --single-transaction --routines --triggers $DbName `
    | Set-Content -Path $TmpSql -Encoding utf8
} else {
  $hostName = if ($env:DB_HOST) { $env:DB_HOST } else { "127.0.0.1" }
  $port = if ($env:DB_PORT) { $env:DB_PORT } else { "3306" }
  & mysqldump "-h$hostName" "-P$port" "-u$DbUser" "-p$($env:DB_PASS)" `
    --single-transaction --routines --triggers $DbName `
    | Set-Content -Path $TmpSql -Encoding utf8
}

# Compacta com .NET (gzip)
Add-Type -AssemblyName System.IO.Compression
$inStream = [System.IO.File]::OpenRead($TmpSql)
$outStream = [System.IO.File]::Create($OutFile)
$gzip = New-Object System.IO.Compression.GZipStream($outStream, [System.IO.Compression.CompressionMode]::Compress)
$inStream.CopyTo($gzip)
$gzip.Dispose()
$outStream.Dispose()
$inStream.Dispose()
Remove-Item $TmpSql -Force

Write-Host "[backup] OK"

Get-ChildItem $BackupDir -Filter "aten_ai_*.sql.gz" |
  Where-Object { $_.LastWriteTimeUtc -lt (Get-Date).ToUniversalTime().AddDays(-$RetentionDays) } |
  ForEach-Object {
    Write-Host "[backup] Removendo antigo: $($_.Name)"
    Remove-Item $_.FullName -Force
  }
