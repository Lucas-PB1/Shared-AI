# Sync inbox — scan via tsx (Windows-native).
param(
    [Parameter(Position = 0)]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Profiles.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$env:SHARED_AI_ROOT = $MonorepoRoot
$cursorDir = Get-CursorUserDir
$inboxJson = Join-Path $cursorDir 'shared-ai/sync-inbox.json'
$scanTs = Join-Path $MonorepoRoot 'packages/cursor/scripts/lib/sync-inbox/ts/scan-sync-inbox.ts'
$taskName = 'SharedAiSyncInbox'

foreach ($arg in $args) {
    if ($arg -in @('on', 'off', 'status', 'run', 'scan', 'enable', 'disable', '-h', '--help', 'help')) {
        $Action = $arg.TrimStart('-')
        if ($Action -eq 'h') { $Action = 'help' }
    }
}

function Invoke-Scan {
    $tsx = Get-SharedAiTsx
    if (-not $tsx) {
        Write-Error 'tsx não encontrado. Rode npm install na raiz.'
        exit 1
    }
    & $tsx $scanTs | Out-Null
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

switch ($Action) {
    { $_ -in @('scan', 'run') } {
        Invoke-Scan
        if (Test-Path $inboxJson) {
            Write-Host "Inbox gravado em $inboxJson"
        }
    }
    { $_ -in @('on', 'enable') } {
        Invoke-Scan
        $tsx = Get-SharedAiTsx
        $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existing) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false }
        $actionTask = New-ScheduledTaskAction -Execute $tsx -Argument "`"$scanTs`""
        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
        Register-ScheduledTask -TaskName $taskName -Action $actionTask -Trigger $trigger `
            -Description 'Shared AI — sync-inbox ao iniciar sessão' | Out-Null
        Write-Host "Sync inbox: ON — scan ao logar (Task Scheduler: $taskName)"
    }
    { $_ -in @('off', 'disable') } {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
        Write-Host 'Sync inbox: OFF'
    }
    'status' {
        $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($task) { Write-Host 'Sync inbox: ON (Task Scheduler no logon)' }
        else { Write-Host 'Sync inbox: OFF' }
        if (Test-Path $inboxJson) { Write-Host "Último scan: $inboxJson" }
        else { Write-Host 'Nenhum scan ainda — npm run sync-inbox -- scan' }
    }
    'help' {
        @'
Uso: npm run sync-inbox -- [on|off|status|scan|run]

  on      Liga scan ao iniciar sessão (Task Scheduler)
  off     Desliga
  status  Estado + último JSON
  scan    Roda o scan agora (alias: run)
'@ | Write-Host
    }
    default {
        Write-Error "Ação desconhecida: $Action"
        exit 1
    }
}
