# Leitura/escrita de ~/.cursor/hostdime-ia.env e VERSION

function Get-CursorUserDir {
    if ($env:CURSOR_USER_DIR) { return $env:CURSOR_USER_DIR }
    return Join-Path $env:USERPROFILE '.cursor'
}

function Get-HostdimeEnvFile {
    return Join-Path (Get-CursorUserDir) 'hostdime-ia.env'
}

function Resolve-HostdimeRoot {
    if ($env:HOSTDIME_IA_ROOT -and (Test-Path -LiteralPath $env:HOSTDIME_IA_ROOT)) {
        return $env:HOSTDIME_IA_ROOT
    }

    $envFile = Get-HostdimeEnvFile
    if (-not (Test-Path $envFile)) { return $null }

    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^HOSTDIME_IA_ROOT=(.+)$') {
            $val = $Matches[1].Trim().Trim("'").Trim('"')
            if (Test-Path -LiteralPath $val) {
                return $val
            }
        }
    }
    return $null
}

function Get-HostdimeVersion {
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

function Read-HostdimeEnv {
    $envFile = Get-HostdimeEnvFile
    $result = @{}
    if (-not (Test-Path $envFile)) { return $result }

    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^([A-Z_]+)=(.*)$') {
            $result[$Matches[1]] = $Matches[2].Trim().Trim("'").Trim('"')
        }
    }
    return $result
}

function Write-HostdimeEnv {
    param([string]$Root)

    $cursorDir = Get-CursorUserDir
    $version = Get-HostdimeVersion $Root
    $now = (Get-Date).ToString('o')

    if (-not (Test-Path $cursorDir)) {
        New-Item -ItemType Directory -Path $cursorDir -Force | Out-Null
    }

    $content = @(
        "HOSTDIME_IA_ROOT=$Root"
        "HOSTDIME_IA_VERSION=$version"
        "HOSTDIME_IA_INSTALLED_AT=$now"
        "HOSTDIME_IA_LAST_SYNC=$now"
    ) -join "`n"

    Set-Content -Path (Get-HostdimeEnvFile) -Value $content -Encoding UTF8
}

function Update-HostdimeSyncTime {
    $envData = Read-HostdimeEnv
    if (-not $envData.Count) { return }

    $root = $envData['HOSTDIME_IA_ROOT']
    if (-not $root) { return }

    $version = Get-HostdimeVersion $root
    $now = (Get-Date).ToString('o')
    $installedAt = if ($envData['HOSTDIME_IA_INSTALLED_AT']) { $envData['HOSTDIME_IA_INSTALLED_AT'] } else { $now }

    $content = @(
        "HOSTDIME_IA_ROOT=$root"
        "HOSTDIME_IA_VERSION=$version"
        "HOSTDIME_IA_INSTALLED_AT=$installedAt"
        "HOSTDIME_IA_LAST_SYNC=$now"
    ) -join "`n"

    Set-Content -Path (Get-HostdimeEnvFile) -Value $content -Encoding UTF8
}

function Get-HostdimeInstalledVersion {
    $envData = Read-HostdimeEnv
    if ($envData['HOSTDIME_IA_VERSION']) {
        return $envData['HOSTDIME_IA_VERSION']
    }
    return '?'
}
