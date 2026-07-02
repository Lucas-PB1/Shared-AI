# Liga rules, commands e pastas de review em .cursor/ do projeto (symlinks ao clone).
param(
    [switch]$Quiet,
    [Parameter(Position = 0)]
    [string]$Target
)

$ErrorActionPreference = 'Stop'

$installedDir = if ($env:CURSOR_USER_DIR) { $env:CURSOR_USER_DIR } else { Join-Path $env:USERPROFILE '.cursor' }
$repoLib = Join-Path $PSScriptRoot 'lib'

if (Test-Path (Join-Path $installedDir 'hostdime-env.ps1')) {
    . (Join-Path $installedDir 'hostdime-env.ps1')
    . (Join-Path $installedDir 'hostdime-link-from-repo.ps1')
} elseif (Test-Path (Join-Path $repoLib 'Hostdime-Env.ps1')) {
    . (Join-Path $repoLib 'Hostdime-Env.ps1')
    . (Join-Path $repoLib 'Link-FromRepo.ps1')
    . (Join-Path $repoLib 'Ensure-ProjectGitignore.ps1')
} else {
    Write-Error 'Bibliotecas hostdime não encontradas. Rode: npm run setup:skills'
    exit 1
}

if (-not $Target) {
    Write-Error 'Informe o diretório raiz do projeto'
    exit 1
}

$envData = Read-HostdimeEnv
if ($envData['HOSTDIME_IA_ROOT']) {
    $env:HOSTDIME_IA_ROOT = $envData['HOSTDIME_IA_ROOT']
}

if (-not $env:HOSTDIME_IA_ROOT -or -not (Test-Path $env:HOSTDIME_IA_ROOT)) {
    if (-not $Quiet) { Write-Error 'HOSTDIME_IA_ROOT não configurado' }
    Write-Error 'Execute: npm run setup:skills'
    exit 1
}

$root = $env:HOSTDIME_IA_ROOT
$gitignoreLib = Join-Path $root 'packages/cursor/scripts/ps1/lib/Ensure-ProjectGitignore.ps1'
if ((Test-Path $gitignoreLib) -and -not (Get-Command Ensure-ProjectGitignore -ErrorAction SilentlyContinue)) {
    . $gitignoreLib
}

$env:HOSTDIME_IA_ROOT = $root
Reset-LinkCounters

$Target = (Resolve-Path -LiteralPath $Target).Path
$rulesDir = Join-Path $Target '.cursor/rules'
$commandsDir = Join-Path $Target '.cursor/commands'
$reviewDir = Join-Path $Target '.cursor/review'

foreach ($sub in @('rules', 'commands')) {
    $path = Join-Path $Target ".cursor/$sub"
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

foreach ($sub in @('inbox', 'reports', 'resultados')) {
    $path = Join-Path $reviewDir $sub
    if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
}

foreach ($keep in @(
    (Join-Path $reviewDir 'inbox/.gitkeep'),
    (Join-Path $reviewDir 'reports/.gitkeep')
)) {
    $dir = Split-Path $keep -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    if (-not (Test-Path $keep)) { New-Item -ItemType File -Path $keep -Force | Out-Null }
}

$memoriaTemplate = Join-Path $root 'packages/code-review/templates/memoria.md'
$memoriaDest = Join-Path $reviewDir 'memoria.md'
if (-not (Test-Path $memoriaDest) -and (Test-Path $memoriaTemplate)) {
    Copy-Item $memoriaTemplate $memoriaDest
}

$ruleSrc = Join-Path $root 'packages/cursor/rules'
$commandSrc = Join-Path $root 'packages/code-review/commands'
$commandCursorSrc = Join-Path $root 'packages/cursor/commands'

Link-Glob -Pattern (Join-Path $ruleSrc 'skills-orchestrator-*.mdc') -DestDir $rulesDir
Link-File -Src (Join-Path $commandSrc 'avaliar.md') -DestDir $commandsDir
Link-File -Src (Join-Path $commandSrc 'finalizar.md') -DestDir $commandsDir
Link-File -Src (Join-Path $commandSrc 'avaliar-diff.md') -DestDir $commandsDir
Link-Glob -Pattern (Join-Path $commandCursorSrc '*.md') -DestDir $commandsDir

Ensure-ProjectGitignore $Target

if (-not $Quiet) {
    Write-Host ''
    Write-Host "Concluído: $script:LinkLinked symlink(s) em $Target/.cursor/"
    Write-Host '  review/ → reports/, resultados/, memoria.md'
    if ($script:LinkSkipped -gt 0) {
        Write-Host "Ignorados (arquivo real do projeto): $script:LinkSkipped"
    }
}

exit 0
