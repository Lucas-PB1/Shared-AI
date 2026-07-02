# Sync automático ao iniciar o computador (git pull + npm run sync).

function Get-BootSyncStateFile {
    return Join-Path (Get-CursorUserDir) 'hostdime-ia/boot-sync.env'
}

function Get-BootSyncLogFile {
    return Join-Path (Get-CursorUserDir) 'hostdime-ia/boot-sync.log'
}

function Get-BootSyncStartupScript {
    return Join-Path (Get-CursorUserDir) 'hostdime-ia-startup-sync.ps1'
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
        [ValidateSet('on', 'off')]
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
    if ($state['BOOT_SYNC'] -eq 'on') { return 'on' }
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
    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path $root)) {
        $root = Resolve-HostdimeRoot
    }
    if (-not $root) {
        Write-Error 'HOSTDIME_IA_ROOT não configurado'
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

    $taskName = 'HostDimeIaBootSync'
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
        -Description 'HostDime IA — git pull e sync ao iniciar sessão' | Out-Null
}

function Uninstall-BootSyncScheduledTask {
    $taskName = 'HostDimeIaBootSync'
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
    Write-Host "Log: $(Get-BootSyncLogFile)"
}

function Disable-BootSync {
    Write-BootSyncState -Mode 'off'
    Uninstall-BootSyncHook
    Write-Host 'Boot sync: OFF'
}

function Get-BootSyncHookKind {
    $task = Get-ScheduledTask -TaskName 'HostDimeIaBootSync' -ErrorAction SilentlyContinue
    if ($task) { return 'Task Scheduler (logon)' }
    return 'não instalado'
}

function Show-BootSyncStatus {
    $mode = Get-BootSyncMode
    $kind = Get-BootSyncHookKind

    switch ($mode) {
        'on' { Write-Host 'Boot sync: ON' }
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
    $root = Resolve-HostdimeRoot
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
    if ($env:HOSTDIME_BOOT_SYNC_PROMPT -eq 'skip') { return }
    if (Test-BootSyncAsked) { return }
    if ([Console]::IsInputRedirected) { return }

    Write-Host ''
    Write-Host 'Sincronizar HostDime IA automaticamente ao iniciar o computador?'
    Write-Host '  (git pull + npm run sync no clone — desligar: npm run boot-sync -- off)'
    $ans = Read-Host '[s/N]'
    switch ($ans.ToLowerInvariant()) {
        { $_ -in @('s', 'sim', 'y', 'yes') } { Enable-BootSync }
        default { Disable-BootSync }
    }
}
