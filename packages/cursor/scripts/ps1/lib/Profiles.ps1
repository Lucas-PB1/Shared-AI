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

function Get-DetectedProfile {
    param([Parameter(Mandatory)][string]$Project)
    $script = Join-Path $PSScriptRoot '../../lib/detect-stack.py'
    if (-not (Test-Path $script)) { return '' }
    $output = & python3 $script $Project 2>$null
    return ($output | Out-String).Trim()
}
