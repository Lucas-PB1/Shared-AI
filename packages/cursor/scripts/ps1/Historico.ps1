# CLI auxiliar do /historico — validate, status, merge-hooks, scope-match.
param(
    [Parameter(Position = 0)]
    [string]$Command = 'help',
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @()
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$lib = Join-Path (Split-Path -Parent $scriptRoot) 'lib/history-watch-match.py'
$merge = Join-Path (Split-Path -Parent $scriptRoot) 'lib/merge-historico-hooks.py'

function Show-Usage {
    @'
Uso: Historico.ps1 <comando> [args...]

Comandos:
  status [projeto]              Lista watches
  validate [projeto]            Valida watches.json
  merge-hooks [projeto]         Merge hook stop em .cursor/hooks.json
  scope-match <arquivo> [proj]  Testa match de escopo
'@
}

switch ($Command) {
    'scope-match' {
        if (-not $Rest -or $Rest.Count -lt 1) {
            throw 'Informe o arquivo para scope-match'
        }
        $file = $Rest[0]
        $project = if ($Rest.Count -gt 1) { $Rest[1] } else { '.' }
        $project = (Resolve-Path -LiteralPath $project).Path
        & python $lib scope-match $project $file
        exit $LASTEXITCODE
    }
    'status' {
        $project = if ($Rest) { $Rest[0] } else { '.' }
        $project = (Resolve-Path -LiteralPath $project).Path
        & python $lib status $project
        exit $LASTEXITCODE
    }
    'validate' {
        $project = if ($Rest) { $Rest[0] } else { '.' }
        $project = (Resolve-Path -LiteralPath $project).Path
        & python $lib validate $project
        exit $LASTEXITCODE
    }
    'merge-hooks' {
        $project = if ($Rest) { $Rest[0] } else { '.' }
        $project = (Resolve-Path -LiteralPath $project).Path
        & python $merge (Join-Path $project '.cursor/hooks.json') $project
        exit $LASTEXITCODE
    }
    default {
        Show-Usage
        if ($Command -and $Command -notin @('help', '-h', '--help', '')) {
            exit 1
        }
    }
}
