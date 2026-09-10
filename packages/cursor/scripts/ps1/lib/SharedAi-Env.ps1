# Leitura/escrita de ~/.cursor/shared-ai.env e VERSION

function Get-CursorUserDir {
    if ($env:CURSOR_USER_DIR) { return $env:CURSOR_USER_DIR }
    return Join-Path $env:USERPROFILE '.cursor'
}

function Get-SharedAiEnvFile {
    return Join-Path (Get-CursorUserDir) 'shared-ai.env'
}

function Resolve-SharedAiRoot {
    if ($env:SHARED_AI_ROOT -and (Test-Path -LiteralPath $env:SHARED_AI_ROOT)) {
        return $env:SHARED_AI_ROOT
    }

    $envFile = Get-SharedAiEnvFile
    if (-not (Test-Path $envFile)) { return $null }

    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^SHARED_AI_ROOT=(.+)$') {
            $val = $Matches[1].Trim().Trim("'").Trim('"')
            if (Test-Path -LiteralPath $val) {
                return $val
            }
        }
    }
    return $null
}

function Get-SharedAiVersion {
    param([string]$Root)

    $versionFile = Join-Path $Root 'VERSION'
    if (Test-Path $versionFile) {
        return (Get-Content $versionFile -Raw).Trim()
    }

    if (Get-Command git -ErrorAction SilentlyContinue) {
        $hash = git -C $Root rev-parse --short HEAD 2>$null
        if ($LASTEXITCODE -eq 0 -and $hash) { return $hash.Trim() }
    }

    return '?'
}

function Read-SharedAiEnv {
    $envFile = Get-SharedAiEnvFile
    $result = @{}
    if (-not (Test-Path $envFile)) { return $result }

    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([A-Z_]+)=(.*)$') {
            $result[$Matches[1]] = $Matches[2].Trim().Trim("'").Trim('"')
        }
    }
    return $result
}

function Write-SharedAiEnv {
    param([string]$Root)

    $cursorDir = Get-CursorUserDir
    $version = Get-SharedAiVersion $Root
    $now = (Get-Date).ToString('o')

    if (-not (Test-Path $cursorDir)) {
        New-Item -ItemType Directory -Path $cursorDir -Force | Out-Null
    }

    $content = @(
        "SHARED_AI_ROOT=$Root"
        "SHARED_AI_VERSION=$version"
        "SHARED_AI_INSTALLED_AT=$now"
        "SHARED_AI_LAST_SYNC=$now"
    ) -join "`n"

    Set-Content -Path (Get-SharedAiEnvFile) -Value $content -Encoding UTF8
}

function Update-SharedAiSyncTime {
    $envData = Read-SharedAiEnv
    if (-not $envData.Count) { return }

    $root = $envData['SHARED_AI_ROOT']
    if (-not $root) { return }

    $version = Get-SharedAiVersion $root
    $now = (Get-Date).ToString('o')
    $installedAt = if ($envData['SHARED_AI_INSTALLED_AT']) { $envData['SHARED_AI_INSTALLED_AT'] } else { $now }

    $content = @(
        "SHARED_AI_ROOT=$root"
        "SHARED_AI_VERSION=$version"
        "SHARED_AI_INSTALLED_AT=$installedAt"
        "SHARED_AI_LAST_SYNC=$now"
    ) -join "`n"

    Set-Content -Path (Get-SharedAiEnvFile) -Value $content -Encoding UTF8
}

function Get-SharedAiInstalledVersion {
    $envData = Read-SharedAiEnv
    if ($envData['SHARED_AI_VERSION']) {
        return $envData['SHARED_AI_VERSION']
    }
    return '?'
}
