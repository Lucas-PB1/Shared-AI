# Garante symlinks e registra projeto no sessionStart.
$ErrorActionPreference = 'SilentlyContinue'

$cursorDir = if ($env:CURSOR_USER_DIR) { $env:CURSOR_USER_DIR } else { Join-Path $env:USERPROFILE '.cursor' }
$linkScript = if ($env:CURSOR_LINK_PROJECT_SCRIPT) {
    $env:CURSOR_LINK_PROJECT_SCRIPT
} elseif ($env:CURSOR_LINK_RULES_SCRIPT) {
    $env:CURSOR_LINK_RULES_SCRIPT
} else {
    Join-Path $cursorDir 'Link-Project.ps1'
}

$inputText = [Console]::In.ReadToEnd()
$root = $env:CURSOR_PROJECT_DIR

if (-not $root -and $inputText) {
    try {
        $data = $inputText | ConvertFrom-Json
        if ($data.workspace_roots -and $data.workspace_roots.Count -gt 0) {
            $root = $data.workspace_roots[0]
        }
    } catch {
        # fire-and-forget
    }
}

if ($root) {
    $root = $root -replace '/', '\'
    if ($root -match '^\\[^\\]+\\[^\\]+\\(.+)$' -and $root -like '\\*') {
        # UNC paths — keep as-is
    }
}

if (-not $root -or -not (Test-Path -LiteralPath $root)) {
    exit 0
}

if (Test-Path $linkScript) {
    try {
        & $linkScript -Quiet $root
    } catch { }
}

$registryScript = Join-Path $cursorDir 'hostdime-projects-registry.ps1'
if (Test-Path $registryScript) {
    . (Join-Path $cursorDir 'hostdime-link-from-repo.ps1')
    . (Join-Path $cursorDir 'hostdime-env.ps1')
    . $registryScript
    try {
        Register-Project $root
    } catch { }
}

$envFile = Join-Path $cursorDir 'hostdime-ia.env'
$envLib = Join-Path $cursorDir 'hostdime-env.ps1'
if ((Test-Path $envFile) -and (Test-Path $envLib)) {
    . $envLib
    $envData = Read-HostdimeEnv
    $hostRoot = $envData['HOSTDIME_IA_ROOT']
    if ($hostRoot -and (Test-Path $hostRoot)) {
        $current = Get-HostdimeVersion $hostRoot
        $installed = if ($envData['HOSTDIME_IA_VERSION']) { $envData['HOSTDIME_IA_VERSION'] } else { '?' }
        if ($current -ne $installed -and $current -ne '?') {
            [Console]::Error.WriteLine(
                "HostDime IA: versão do clone ($current) difere da instalada ($installed). Rode: npm run sync"
            )
        }
    }
}

exit 0
