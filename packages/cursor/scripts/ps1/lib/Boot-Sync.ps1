# Sync automático ao iniciar o computador (git pull + npm run sync).

function Get-BootSyncStateFile {
    return Join-Path (Get-CursorUserDir) 'shared-ai/boot-sync.env'
}

function Get-BootSyncLogFile {
    return Join-Path (Get-CursorUserDir) 'shared-ai/boot-sync.log'
}

function Get-BootSyncStartupScript {
    return Join-Path (Get-CursorUserDir) 'shared-ai-startup-sync.ps1'
}

function Read-BootSyncState {
    $file = Get-BootSyncStateFile
    $result = @{}
    if (-not (Test-Path $file)) { return $result }
    Get-Content $file | ForEach-Object {
        if ($_ -match '^([A-Z_]+)=(.*)$') {
            $result[$Matches[1]] = $Matches[2]
        }
    }
    return $result
}

function Write-BootSyncState {
    param(
        [ValidateSet('on', 'check', 'off')]
        [string]$Mode = 'off',
        [string]$Asked = '1'
    )

    $dir = Split-Path (Get-BootSyncStateFile) -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    @(
        "BOOT_SYNC=$Mode"
        "BOOT_SYNC_ASKED=$Asked"
    ) | Set-Content -Path (Get-BootSyncStateFile) -Encoding UTF8
}

function Get-BootSyncMode {
    $state = Read-BootSyncState
    if (-not $state['BOOT_SYNC_ASKED']) { return 'unset' }
    if ($state['BOOT_SYNC'] -in @('on', 'check')) { return $state['BOOT_SYNC'] }
    return 'off'
}

function Test-BootSyncAsked {
    $state = Read-BootSyncState
    return [bool]$state['BOOT_SYNC_ASKED']
}

function Write-BootSyncLog {
    param([string]$Message)
    $log = Get-BootSyncLogFile
    $dir = Split-Path $log -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
    $ts = (Get-Date).ToString('o')
    Add-Content -Path $log -Value "[$ts] $Message"
}

function Install-BootSyncStartupScript {
    $root = $env:SHARED_AI_ROOT
    if (-not $root -or -not (Test-Path $root)) {
        $root = Resolve-SharedAiRoot
    }
    if (-not $root) {
        Write-Error 'SHARED_AI_ROOT não configurado'
        return $false
    }

    $src = Join-Path $root 'packages/cursor/scripts/ps1/Startup-Sync.ps1'
    $dest = Get-BootSyncStartupScript
    if (-not (Test-Path $src)) {
        Write-Error "Startup-Sync.ps1 não encontrado: $src"
        return $false
    }
    Copy-Item -LiteralPath $src -Destination $dest -Force
    return $true
}

function Install-BootSyncScheduledTask {
    param([string]$ScriptPath)

    $taskName = 'SharedAiBootSync'
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    }

    $action = New-ScheduledTaskAction `
        -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`""

    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Description 'Shared AI — git pull e sync ao iniciar sessão' | Out-Null
}

function Uninstall-BootSyncScheduledTask {
    $taskName = 'SharedAiBootSync'
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
}

function Install-BootSyncHook {
    if (-not (Install-BootSyncStartupScript)) { return $false }
    Install-BootSyncScheduledTask (Get-BootSyncStartupScript)
    return $true
}

function Uninstall-BootSyncHook {
    Uninstall-BootSyncScheduledTask
    $script = Get-BootSyncStartupScript
    if (Test-Path $script) { Remove-Item -LiteralPath $script -Force }
}

function Enable-BootSync {
    Write-BootSyncState -Mode 'on'
    Install-BootSyncHook | Out-Null
    Write-Host 'Boot sync: ON — git pull + sync ao iniciar sessão'
    Write-Host '  Atenção: executa o código novo do clone sem revisão. Proteja a branch (PR + review obrigatório).'
    Write-Host '  Alternativa só-leitura: npm run boot-sync -- check'
    Write-Host "Log: $(Get-BootSyncLogFile)"
}

function Enable-BootSyncCheck {
    Write-BootSyncState -Mode 'check'
    Install-BootSyncHook | Out-Null
    Write-Host 'Boot sync: CHECK — só git fetch ao iniciar sessão; commits pendentes vão para o log'
    Write-Host "Log: $(Get-BootSyncLogFile)"
}

function Disable-BootSync {
    Write-BootSyncState -Mode 'off'
    Uninstall-BootSyncHook
    Write-Host 'Boot sync: OFF'
}

function Get-BootSyncHookKind {
    $task = Get-ScheduledTask -TaskName 'SharedAiBootSync' -ErrorAction SilentlyContinue
    if ($task) { return 'Task Scheduler (logon)' }
    return 'não instalado'
}

function Show-BootSyncStatus {
    $mode = Get-BootSyncMode
    $kind = Get-BootSyncHookKind

    switch ($mode) {
        'on' { Write-Host 'Boot sync: ON (git pull + sync)' }
        'check' { Write-Host 'Boot sync: CHECK (só fetch + log de pendências)' }
        'off' { Write-Host 'Boot sync: OFF' }
        default { Write-Host 'Boot sync: não configurado (pergunta na próxima sync interativa)' }
    }
    Write-Host "Agendamento: $kind"
    Write-Host "Log: $(Get-BootSyncLogFile)"
}

function Invoke-BootSyncRun {
    $script = Get-BootSyncStartupScript
    if (Test-Path $script) {
        & $script
        return
    }
    $root = Resolve-SharedAiRoot
    if ($root) {
        $repoScript = Join-Path $root 'packages/cursor/scripts/ps1/Startup-Sync.ps1'
        if (Test-Path $repoScript) {
            & $repoScript
            return
        }
    }
    Write-Error 'Script de startup não encontrado'
    exit 1
}

function Prompt-BootSyncIfNeeded {
    if ($env:SHARED_AI_BOOT_SYNC_PROMPT -eq 'skip') { return }
    if (Test-BootSyncAsked) { return }
    if ([Console]::IsInputRedirected) { return }

    Write-Host ''
    Write-Host 'Sincronizar Shared AI automaticamente ao iniciar o computador?'
    Write-Host '  s = git pull + npm run sync (executa o código novo do clone sem revisão)'
    Write-Host '  c = só verificar: git fetch + lista commits pendentes no log'
    Write-Host '  N = não (mude depois com: npm run boot-sync -- on|check|off)'
    $ans = Read-Host '[s/c/N]'
    switch ($ans.ToLowerInvariant()) {
        { $_ -in @('s', 'sim', 'y', 'yes') } { Enable-BootSync }
        { $_ -in @('c', 'check') } { Enable-BootSyncCheck }
        default { Disable-BootSync }
    }
}
