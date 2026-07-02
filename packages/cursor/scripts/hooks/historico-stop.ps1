# Hook stop: follow-up se arquivos do escopo /historico foram alterados.
# Project hook — cwd = raiz do projeto.
$ErrorActionPreference = 'Stop'

$watches = Join-Path (Get-Location) '.cursor/history/watches.json'
if (-not (Test-Path -LiteralPath $watches)) { exit 0 }

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$matcher = Join-Path $scriptDir 'history-watch-match.py'

if (-not (Test-Path -LiteralPath $matcher)) {
    $hostdimeRoot = $env:HOSTDIME_IA_ROOT
    if (-not $hostdimeRoot) {
        $envFile = Join-Path $env:USERPROFILE '.cursor/hostdime-ia.env'
        if (Test-Path -LiteralPath $envFile) {
            Get-Content -LiteralPath $envFile | ForEach-Object {
                if ($_ -match '^HOSTDIME_IA_ROOT=(.+)$') { $hostdimeRoot = $Matches[1].Trim('"') }
            }
        }
    }
    if ($hostdimeRoot) {
        $matcher = Join-Path $hostdimeRoot 'packages/cursor/scripts/lib/history-watch-match.py'
    }
}

if (-not (Test-Path -LiteralPath $matcher)) { exit 0 }

$inputJson = [Console]::In.ReadToEnd()
if ($inputJson) {
    $inputJson | & python $matcher stop
} else {
    & python $matcher stop
}
