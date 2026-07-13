# Pro FundX PostgreSQL Database Backup Script (PowerShell)
# Usage: .\scripts\backup.ps1 [[-OutputDir] <string>]

param(
  [string]$OutputDir = ""
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$EnvFile = Join-Path $ProjectRoot ".env"

# ── Load .env ─────────────────────────────────────────────────
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match "^\s*([^#=]+)=(.+)$") {
      $name = $matches[1].Trim()
      $value = $matches[2].Trim()
      Set-Item -Path "env:$name" -Value $value -ErrorAction SilentlyContinue
    }
  }
}

# ── Config ────────────────────────────────────────────────────
$DbHost   = $env:DB_HOST ?? "localhost"
$DbPort   = $env:DB_PORT ?? "5432"
$DbName   = $env:DB_NAME ?? "pro-fundx"
$DbUser   = $env:DB_USER ?? "pro-fundx"
$DbPass   = $env:DB_PASSWORD ?? "pro-fundx123"
$RetDays  = [int]($env:BACKUP_RETENTION_DAYS ?? "30")
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

if (-not $OutputDir) { $OutputDir = Join-Path $ProjectRoot "backups" }
if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null }

$BackupFile = Join-Path $OutputDir "pro-fundx_$Timestamp.sql.gz"
$BackupInfo = Join-Path $OutputDir "pro-fundx_$Timestamp.info"

# ── Pre-flight checks ─────────────────────────────────────────
$pgDump = Get-Command "pg_dump" -ErrorAction SilentlyContinue
if (-not $pgDump) {
  Write-Host "ERROR: pg_dump not found. Install PostgreSQL client tools." -ForegroundColor Red
  exit 1
}

# ── Run backup ────────────────────────────────────────────────
Write-Host "=========================================="
Write-Host " Pro FundX Database Backup"
Write-Host " Timestamp: $Timestamp"
Write-Host " Database:  ${DbName}@${DbHost}:${DbPort}"
Write-Host " Output:    $BackupFile"
Write-Host "=========================================="

$env:PGPASSWORD = $DbPass

$dumpArgs = @(
  "--host=$DbHost"
  "--port=$DbPort"
  "--username=$DbUser"
  "--dbname=$DbName"
  "--format=custom"
  "--verbose"
  "--no-owner"
  "--no-acl"
)

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "pg_dump"
$psi.Arguments = $dumpArgs
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.Environment["PGPASSWORD"] = $DbPass

$proc = [System.Diagnostics.Process]::Start($psi)
$stderr = $proc.StandardError.ReadToEnd()
$stdout = $proc.StandardOutput.ReadToEnd()
$proc.WaitForExit()

$stdout | Out-File -FilePath $BackupInfo -Encoding utf8
$stderr | Out-File -FilePath $BackupInfo -Append -Encoding utf8

if ($proc.ExitCode -eq 0) {
  # gzip the output
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($stdout)
  $stream = [System.IO.File]::OpenWrite($BackupFile)
  $gzip = New-Object System.IO.Compression.GZipStream($stream, [System.IO.Compression.CompressionMode]::Compress)
  $gzip.Write($bytes, 0, $bytes.Length)
  $gzip.Close()
  $stream.Close()
  Write-Host " Backup complete: $(Get-Item $BackupFile).Length.ToString('N0') bytes"
} else {
  Write-Host "ERROR: Backup failed with exit code $($proc.ExitCode)" -ForegroundColor Red
  Write-Host $stderr -ForegroundColor Red
  exit $proc.ExitCode
}

# ── Cleanup old backups ───────────────────────────────────────
if ($RetDays -gt 0) {
  $cutoff = (Get-Date).AddDays(-$RetDays)
  Get-ChildItem -Path $OutputDir -Filter "pro-fundx_*.sql.gz" | Where-Object { $_.LastWriteTime -lt $cutoff } | Remove-Item -Force
  Get-ChildItem -Path $OutputDir -Filter "pro-fundx_*.info"  | Where-Object { $_.LastWriteTime -lt $cutoff } | Remove-Item -Force
  Write-Host " Cleaned up backups older than $RetDays days"
}

Write-Host "=========================================="
