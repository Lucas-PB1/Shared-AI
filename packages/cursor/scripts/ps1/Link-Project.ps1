# Prepara pastas de review em .cursor/ do projeto.
# Rules do orquestrador e commands hostdime ficam só em ~/.cursor/ (não no projeto).
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

# Não criar rules/commands vazios — só limpar se já existirem
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

$memoriaPy = Join-Path $root 'packages/code-review/tools/review-memoria.py'
if (Test-Path $memoriaPy) {
    & python3 $memoriaPy migrar --write $Target 2>$null | Out-Null
} else {
    Set-Content -Path (Join-Path $reviewDir '.memoria-version') -Value "2`n" -NoNewline
    $decisions = Join-Path $reviewDir 'decisions.jsonl'
    if (-not (Test-Path $decisions)) { New-Item -ItemType File -Path $decisions -Force | Out-Null }
    $convTpl = Join-Path $root 'packages/code-review/templates/convencoes.md'
    $convDest = Join-Path $reviewDir 'convencoes.md'
    if (-not (Test-Path $convDest) -and (Test-Path $convTpl)) {
        Copy-Item $convTpl $convDest
    }
}
foreach ($legacy in @('memoria.md', 'memoria.legacy.md')) {
    $p = Join-Path $reviewDir $legacy
    if (Test-Path $p) { Remove-Item -LiteralPath $p -Force }
}

# Garantir ausência de espelhos: orquestrador + commands só em ~/.cursor/
if (Test-Path $rulesDir) {
    Remove-ProjectOrchestratorRuleSymlinks -RulesDir $rulesDir
}
if (Test-Path $commandsDir) {
    Remove-ProjectManagedCommandSymlinks -CommandsDir $commandsDir
}

# Pastas vazias após limpeza
foreach ($dir in @($rulesDir, $commandsDir)) {
    if ((Test-Path $dir) -and -not (Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue | Select-Object -First 1)) {
        Remove-Item -LiteralPath $dir -Force -ErrorAction SilentlyContinue
    }
}

Ensure-ProjectGitignore $Target

if (-not $Quiet) {
    Write-Host ''
    Write-Host "Concluído em $Target/.cursor/"
    Write-Host '  review/ → reports/, resultados/, memória v2 (context/decisions)'
    Write-Host '  orquestrador → ~/.cursor/rules/ (global)'
    Write-Host '  commands → ~/.cursor/commands/ (global)'
    if ($script:LinkOrchestratorRemoved -gt 0) {
        Write-Host "  removidos do projeto: $script:LinkOrchestratorRemoved skills-orchestrator-*.mdc"
    }
    if ($script:LinkCommandsRemoved -gt 0) {
        Write-Host "  removidos do projeto: $script:LinkCommandsRemoved command(s)"
    }
    if ($script:LinkSkipped -gt 0) {
        Write-Host "Ignorados (arquivo real do projeto): $script:LinkSkipped"
    }
}

exit 0
