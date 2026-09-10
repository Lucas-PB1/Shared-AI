# CLI /historico — nativo PowerShell (tsx), sem Git Bash.
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Profiles.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$env:SHARED_AI_ROOT = $MonorepoRoot
$tsx = Get-SharedAiTsx
if (-not $tsx) {
    Write-Error 'tsx não encontrado. Rode npm install na raiz.'
    exit 1
}

$watchLib = Join-Path $MonorepoRoot 'packages/cursor/scripts/lib/history/history-watch-match.ts'
$mergeLib = Join-Path $MonorepoRoot 'packages/cursor/scripts/lib/history/merge-historico-hooks.ts'

function Show-Usage {
    @'
Uso: npm run historico -- <comando> [args...]

  status [projeto]
  validate [projeto]
  merge-hooks [projeto]
  scope-match <arquivo> [proj]
  pending [projeto] [--json] [--check] [--base=HEAD]
  catch-up [projeto] [--json] [--base=HEAD]
  draft <watch-id> [projeto] [--json] [--base=HEAD]
'@ | Write-Host
}

$argList = @($args)
if ($argList.Count -eq 0 -or $argList[0] -in @('-h', '--help', 'help')) {
    Show-Usage
    exit 0
}

$cmd = [string]$argList[0]
$rest = @()
if ($argList.Count -gt 1) { $rest = $argList[1..($argList.Count - 1)] }

switch ($cmd) {
    'merge-hooks' {
        $project = if ($rest.Count) { $rest[-1] } else { '.' }
        $project = (Resolve-Path $project).Path
        $hooks = Join-Path $project '.cursor/hooks.json'
        & $tsx $mergeLib $hooks $project
        exit $LASTEXITCODE
    }
    { $_ -in @('status', 'validate', 'pending', 'catch-up', 'scope-match', 'draft') } {
        & $tsx $watchLib $cmd @rest
        exit $LASTEXITCODE
    }
    default {
        Write-Error "Comando desconhecido: $cmd"
        Show-Usage
        exit 1
    }
}
