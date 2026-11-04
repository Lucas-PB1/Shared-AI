# Liga/desliga sync automático ao iniciar o computador.
param(
    [Parameter(Position = 0)]
    [ValidateSet('on', 'check', 'off', 'status', 'run', 'enable', 'disable', 'help')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Boot-Sync.ps1')

foreach ($arg in $args) {
    if ($arg -in @('on', 'check', 'off', 'status', 'run', 'enable', 'disable', '-h', '--help', 'help')) {
        $Action = $arg.TrimStart('-')
        if ($Action -eq 'h') { $Action = 'help' }
    }
}

switch ($Action) {
    { $_ -in @('on', 'enable') } { Enable-BootSync }
    'check' { Enable-BootSyncCheck }
    { $_ -in @('off', 'disable') } { Disable-BootSync }
    'status' { Show-BootSyncStatus }
    'run' { Invoke-BootSyncRun }
    'help' {
        @'
Uso: npm run boot-sync -- [on|check|off|status|run]

  on       Liga git pull + sync ao iniciar sessão (executa o código novo do clone)
  check    Só git fetch ao iniciar sessão; registra commits pendentes no log
  off      Desliga e remove agendamento
  status   Mostra estado atual (default)
  run      Executa manualmente (como no boot)

Na primeira npm run sync interativa, pergunta se deseja ativar.
'@ | Write-Host
    }
    default {
        Write-Error "Ação desconhecida: $Action"
        exit 1
    }
}
