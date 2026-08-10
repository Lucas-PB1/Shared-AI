# Lista e valida perfis de bootstrap.

function Get-ProfilesRoot {
    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path $root)) { return $null }
    Join-Path $root 'packages/cursor/profiles'
}

function Get-ProfileNames {
    $profilesDir = Get-ProfilesRoot
    if (-not $profilesDir) { return @() }
    Get-ChildItem -LiteralPath $profilesDir -Directory |
        ForEach-Object { $_.Name } |
        Sort-Object
}

function Test-ProfileName {
    param([Parameter(Mandatory)][string]$Profile)
    $path = Join-Path (Get-ProfilesRoot) $Profile
    Test-Path $path
}

function Write-ProfilesUsage {
    $names = Get-ProfileNames
    Write-Host ("Perfis disponíveis: {0}" -f ($names -join ', '))
}

function Get-HostdimeTsx {
    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root) {
        $envFile = Join-Path $env:USERPROFILE '.cursor/hostdime-ia.env'
        if (Test-Path -LiteralPath $envFile) {
            Get-Content -LiteralPath $envFile | ForEach-Object {
                if ($_ -match '^HOSTDIME_IA_ROOT=(.+)$') { $root = $Matches[1].Trim('"') }
            }
        }
    }
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

function Get-DetectedProfile {
    param([Parameter(Mandatory)][string]$Project)
    $script = Join-Path $PSScriptRoot '../../lib/detect-stack.ts'
    if (-not (Test-Path $script)) { return '' }
    $tsx = Get-HostdimeTsx
    if (-not $tsx) { return '' }
    $output = & $tsx $script $Project 2>$null
    return ($output | Out-String).Trim()
}
