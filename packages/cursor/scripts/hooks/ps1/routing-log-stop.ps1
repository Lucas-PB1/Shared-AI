# Hook stop (usuário): follow-up de routing-log se o turno editou código.
$ErrorActionPreference = 'Stop'

function Get-SharedAiRoot {
    if ($env:SHARED_AI_ROOT -and (Test-Path -LiteralPath $env:SHARED_AI_ROOT)) {
        return $env:SHARED_AI_ROOT
    }
    $envFile = Join-Path $env:USERPROFILE '.cursor/shared-ai.env'
    if (Test-Path -LiteralPath $envFile) {
        Get-Content -LiteralPath $envFile | ForEach-Object {
            if ($_ -match '^SHARED_AI_ROOT=(.+)$') {
                $p = $Matches[1].Trim('"')
                if (Test-Path -LiteralPath $p) { return $p }
            }
        }
    }
    return $null
}

function Get-SharedAiTsx {
    param([string]$Root)
    if ($Root) {
        foreach ($rel in @('node_modules/.bin/tsx.cmd', 'node_modules/.bin/tsx')) {
            $tsx = Join-Path $Root $rel
            if (Test-Path -LiteralPath $tsx) { return $tsx }
        }
    }
    $cmd = Get-Command tsx -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

$root = Get-SharedAiRoot
$script = if ($root) {
    Join-Path $root 'packages/cursor/scripts/lib/routing/routing-log-stop.ts'
} else { $null }

if (-not $script -or -not (Test-Path -LiteralPath $script)) {
    Write-Output '{"followup_message":""}'
    exit 0
}

$tsx = Get-SharedAiTsx -Root $root
if (-not $tsx) {
    Write-Output '{"followup_message":""}'
    exit 0
}

$inputJson = [Console]::In.ReadToEnd()
if ($inputJson) {
    $inputJson | & $tsx $script
} else {
    & $tsx $script
}
