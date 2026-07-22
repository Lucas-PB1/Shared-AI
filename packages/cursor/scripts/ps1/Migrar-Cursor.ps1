# Delega ao script bash (Git Bash no Windows).
$ErrorActionPreference = 'Stop'

$bashScript = Join-Path $PSScriptRoot '../migrar-cursor.sh'
$bash = Get-Command bash -ErrorAction SilentlyContinue

if (-not $bash) {
    Write-Error 'migrar-cursor no Windows requer Git Bash (bash no PATH).'
    exit 1
}

& bash $bashScript @args
exit $LASTEXITCODE
