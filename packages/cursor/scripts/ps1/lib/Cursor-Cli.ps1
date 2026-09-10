# Cursor CLI — instalação e config auto (approvalMode unrestricted)

function Get-CursorCliStateFile {
    Join-Path $env:USERPROFILE '.cursor/shared-ai-cursor-cli.state'
}

function Get-CursorCliConfigFile {
    Join-Path $env:USERPROFILE '.cursor/cli-config.json'
}

function Get-SharedAiRoot {
    if ($env:SHARED_AI_ROOT) { return $env:SHARED_AI_ROOT }
    $envFile = Join-Path $env:USERPROFILE '.cursor/shared-ai.env'
    if (Test-Path -LiteralPath $envFile) {
        foreach ($line in Get-Content -LiteralPath $envFile) {
            if ($line -match '^SHARED_AI_ROOT=(.+)$') { return $Matches[1].Trim('"') }
        }
    }
    return $null
}

function Find-CursorAgent {
    $cmd = Get-Command agent -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    foreach ($candidate in @(
            (Join-Path $env:USERPROFILE '.local/bin/agent.exe'),
            (Join-Path $env:USERPROFILE '.local/bin/agent'),
            (Join-Path $env:USERPROFILE '.cursor/bin/agent.exe'),
            (Join-Path $env:USERPROFILE '.cursor/bin/agent')
        )) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }
    return $null
}

function Get-CursorCliTemplateFile {
    $root = Get-SharedAiRoot
    if (-not $root) { return $null }
    $path = Join-Path $root 'packages/cursor/templates/cli-config.auto.json'
    if (Test-Path -LiteralPath $path) { return $path }
    return $null
}

function Get-CursorCliMergeTs {
    $root = Get-SharedAiRoot
    if (-not $root) { return $null }
    $path = Join-Path $root 'packages/cursor/scripts/lib/install/ts/merge-cursor-cli-config.ts'
    if (Test-Path -LiteralPath $path) { return $path }
    return $null
}

function Get-SharedAiTsx {
    $root = Get-SharedAiRoot
    if ($root) {
        $tsx = Join-Path $root 'node_modules/.bin/tsx.cmd'
        if (Test-Path -LiteralPath $tsx) { return $tsx }
        $tsx = Join-Path $root 'node_modules/.bin/tsx'
        if (Test-Path -LiteralPath $tsx) { return $tsx }
    }
    $cmd = Get-Command tsx -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Set-CursorCliAutoConfig {
    $config = Get-CursorCliConfigFile
    $template = Get-CursorCliTemplateFile
    $mergeTs = Get-CursorCliMergeTs
    $tsx = Get-SharedAiTsx
    if (-not $template) { throw 'Template cli-config.auto.json não encontrado (SHARED_AI_ROOT?)' }
    if (-not $mergeTs) { throw 'merge-cursor-cli-config.ts não encontrado' }
    if (-not $tsx) { throw 'tsx não encontrado (npm install na raiz do monorepo)' }
    $result = & $tsx $mergeTs $config $template
    $stateDir = Split-Path -Parent (Get-CursorCliStateFile)
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    Set-Content -LiteralPath (Get-CursorCliStateFile) -Value "STATUS=configured`nCONFIGURED=auto`n"
    return $result
}

function Install-CursorCliBinary {
    param([switch]$DryRun)
    $existing = Find-CursorAgent
    if ($existing) {
        Write-Host "agent já instalado: $existing"
        return
    }
    if ($DryRun) {
        Write-Host "dry-run: irm 'https://cursor.com/install?win32=true' | iex"
        return
    }
    Write-Host '→ Instalando Cursor CLI (agent)...'
    irm 'https://cursor.com/install?win32=true' | iex
}

function Install-CursorCli {
    param([switch]$DryRun, [switch]$SkipLogin)
    Install-CursorCliBinary -DryRun:$DryRun
    if ($DryRun) {
        Write-Host 'dry-run: merge cli-config auto (approvalMode=unrestricted)'
        Write-Host 'dry-run: ensure PATH + login'
        return
    }
    Set-CursorCliAutoConfig | Out-Null
    Ensure-CursorCliPathProfile
    if (-not $SkipLogin) { Ensure-CursorCliLogin | Out-Null }
    $stateDir = Split-Path -Parent (Get-CursorCliStateFile)
    New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
    Set-Content -LiteralPath (Get-CursorCliStateFile) -Value "STATUS=installed`nCONFIGURED=auto`n"
    Write-Host ''
    Write-Host 'Pronto: modo auto (Run Everything) = approvalMode unrestricted'
    Write-Host 'Uso:     agent'
    Write-Host '         npm run agent -- "prompt"'
}

function Test-CursorCliLoggedIn {
    if ($env:CURSOR_API_KEY) { return $true }
    $agent = Find-CursorAgent
    if (-not $agent) { return $false }
    try {
        $status = & $agent status 2>&1 | Out-String
        return $status -match 'Logged in'
    } catch { return $false }
}

function Ensure-CursorCliLogin {
    if (Test-CursorCliLoggedIn) {
        $agent = Find-CursorAgent
        $msg = & $agent status 2>&1 | Select-Object -First 1
        Write-Host "→ Login: $msg"
        return
    }
    if ($env:CURSOR_API_KEY) {
        Write-Host '→ Login: CURSOR_API_KEY definida (headless/CI)'
        return
    }
    $agent = Find-CursorAgent
    if (-not $agent) { throw 'agent não encontrado para login' }
    Write-Host '→ Login: autentique no browser (uma vez por máquina)...'
    & $agent login
}

function Ensure-CursorCliPathProfile {
    $marker = '# shared-ai cursor-cli PATH'
    $line = '$env:Path = "$env:USERPROFILE\.local\bin;$env:USERPROFILE\.cursor\bin;" + $env:Path'
    $profile = $PROFILE.CurrentUserAllHosts
    if (-not (Test-Path -LiteralPath $profile)) { return }
    $content = Get-Content -LiteralPath $profile -Raw -ErrorAction SilentlyContinue
    if ($content -and $content.Contains($marker)) { return }
    Add-Content -LiteralPath $profile -Value "`n$marker`n$line`n"
    Write-Host "→ PATH adicionado em $profile"
}

function Show-CursorCliStatus {
    $agent = Find-CursorAgent
    $config = Get-CursorCliConfigFile
    Write-Host 'Cursor CLI — status'
    Write-Host "  agent: $(if ($agent) { $agent } else { 'não encontrado' })"
    if ($agent) {
        try { & $agent --version 2>$null | ForEach-Object { Write-Host "  version: $_" } } catch {}
        try {
            & $agent status 2>$null | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" }
        } catch {}
    }
    if (Test-Path -LiteralPath $config) {
        $json = Get-Content -LiteralPath $config -Raw | ConvertFrom-Json
        Write-Host "  cli-config: $config"
        Write-Host "  approvalMode: $($json.approvalMode)"
    } else {
        Write-Host "  cli-config: ausente ($config)"
    }
}

function Invoke-CursorCliLogin {
    $agent = Find-CursorAgent
    if (-not $agent) { throw 'agent não encontrado. Rode install primeiro.' }
    & $agent login
}

function Find-CursorProjectRoot {
    param([string]$StartDir = (Get-Location).Path)
    $dir = (Resolve-Path -LiteralPath $StartDir).Path
    while ($true) {
        if (Test-Path -LiteralPath (Join-Path $dir '.cursor')) { return $dir }
        $parent = Split-Path -Parent $dir
        if (-not $parent -or $parent -eq $dir) { return (Resolve-Path -LiteralPath $StartDir).Path }
        $dir = $parent
    }
}

function Initialize-CursorProject {
    param([string]$Root)
    $cursorDir = Join-Path $env:USERPROFILE '.cursor'
    $linkPs1 = Join-Path $cursorDir 'Link-Project.ps1'
    $linkSh = if ($env:CURSOR_LINK_PROJECT_SCRIPT) { $env:CURSOR_LINK_PROJECT_SCRIPT }
    elseif ($env:CURSOR_LINK_RULES_SCRIPT) { $env:CURSOR_LINK_RULES_SCRIPT }
    else { Join-Path $cursorDir 'link-project.sh' }

    if (Test-Path -LiteralPath $linkPs1) {
        try { & $linkPs1 -Quiet $Root 2>$null } catch {}
    } elseif (Test-Path -LiteralPath $linkSh) {
        try { bash $linkSh --quiet $Root 2>$null } catch {}
    }

    $registryPs1 = Join-Path $cursorDir 'shared-ai-projects-registry.ps1'
    if (Test-Path -LiteralPath $registryPs1) {
        try {
            . $registryPs1
            Register-Project $Root 2>$null
        } catch {}
        return
    }
    $registrySh = Join-Path $cursorDir 'shared-ai-projects-registry.sh'
    if (Test-Path -LiteralPath $registrySh) {
        try { bash -c "source '$registrySh' && register_project '$Root'" 2>$null } catch {}
    }
}

function Invoke-CursorAgent {
    param(
        [string]$Project = '',
        [switch]$DryRun,
        [switch]$NoAuto,
        [string[]]$AgentArgs = @()
    )
    $agent = Find-CursorAgent
    if (-not $agent -and -not $DryRun) {
        throw 'agent não encontrado. Rode: npm run cursor-cli -- install'
    }
    $defaults = @()
    if (-not $NoAuto) {
        $defaults += '--approve-mcps'
        $hasPrint = $AgentArgs -contains '-p' -or $AgentArgs -contains '--print'
        $hasForce = $AgentArgs -contains '-f' -or $AgentArgs -contains '--force' -or $AgentArgs -contains '--yolo'
        if ($hasPrint -and -not $hasForce) { $defaults += '--force' }
    }
    $start = if ($Project) { $Project } else { (Get-Location).Path }
    $root = Find-CursorProjectRoot -StartDir $start
    if ($DryRun) {
        Write-Host "project: $root"
        Write-Host "agent: $(if ($agent) { $agent } else { 'não instalado' })"
        Write-Host "defaults: $($defaults -join ' ')"
        Write-Host "args: $(if ($AgentArgs.Count) { $AgentArgs -join ' ' } else { '(interativo)' })"
        return
    }
    if (-not (Test-CursorCliLoggedIn)) {
        throw 'Não autenticado. Rode: npm run cursor-cli -- login'
    }
    Initialize-CursorProject -Root $root
    Push-Location -LiteralPath $root
    try {
        if ($defaults.Count -gt 0 -and $AgentArgs.Count -gt 0) { & $agent @defaults @AgentArgs }
        elseif ($defaults.Count -gt 0) { & $agent @defaults }
        elseif ($AgentArgs.Count -gt 0) { & $agent @AgentArgs }
        else { & $agent }
    } finally {
        Pop-Location
    }
}
