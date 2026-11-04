# Instala e configura Cursor CLI (agent). Padrão: approvalMode allowlist.
param(
    [Parameter(Position = 0)]
    [ValidateSet('install', 'configure', 'status', 'login', 'help')]
    [string]$Action = 'install',
    [switch]$DryRun,
    [switch]$SkipLogin,
    [switch]$Unrestricted
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$lib = Join-Path $scriptRoot 'lib/Cursor-Cli.ps1'
if (-not (Test-Path -LiteralPath $lib)) {
    $userLib = Join-Path $env:USERPROFILE '.cursor/shared-ai-cursor-cli.ps1'
    if (Test-Path -LiteralPath $userLib) { $lib = $userLib }
    else { throw "Lib Cursor-Cli.ps1 não encontrada" }
}
. $lib

switch ($Action) {
    'install' {
        Install-CursorCli -DryRun:$DryRun.IsPresent -SkipLogin:$SkipLogin.IsPresent -Unrestricted:$Unrestricted.IsPresent
    }
    'configure' {
        if ($DryRun) { Write-Host "dry-run: configure (unrestricted=$($Unrestricted.IsPresent))"; return }
        Set-CursorCliAutoConfig -Unrestricted:$Unrestricted | Out-Null
        Ensure-CursorCliPathProfile
    }
    'status' { Show-CursorCliStatus }
    'login' { Invoke-CursorCliLogin }
    default {
        @'
Uso: Install-CursorCli.ps1 [install|configure|status|login] [-DryRun] [-SkipLogin] [-Unrestricted]

  Padrão: approvalMode=allowlist se ainda não definido (nunca sobrescreve o seu).
  -Unrestricted  Opt-in: approvalMode=unrestricted (Run Everything, sem prompt)
'@
    }
}
