# Prepara .cursor/ do projeto.
# Rules/commands shared-ai ficam só em ~/.cursor/.
param(
    [switch]$Quiet,
    [Parameter(Position = 0)]
    [string]$Target
)

$ErrorActionPreference = 'Stop'

$installedDir = if ($env:CURSOR_USER_DIR) { $env:CURSOR_USER_DIR } else { Join-Path $env:USERPROFILE '.cursor' }
$repoLib = Join-Path $PSScriptRoot 'lib'

if (Test-Path (Join-Path $installedDir 'shared-ai-env.ps1')) {
    . (Join-Path $installedDir 'shared-ai-env.ps1')
    . (Join-Path $installedDir 'shared-ai-link-from-repo.ps1')
} elseif (Test-Path (Join-Path $repoLib 'SharedAi-Env.ps1')) {
    . (Join-Path $repoLib 'SharedAi-Env.ps1')
    . (Join-Path $repoLib 'Link-FromRepo.ps1')
    . (Join-Path $repoLib 'Ensure-ProjectGitignore.ps1')
} else {
    Write-Error 'Bibliotecas shared-ai não encontradas. Rode: npm run setup:skills'
    exit 1
}

if (-not $Target) {
    Write-Error 'Informe o diretório raiz do projeto'
    exit 1
}

$envData = Read-SharedAiEnv
if ($envData['SHARED_AI_ROOT']) {
    $env:SHARED_AI_ROOT = $envData['SHARED_AI_ROOT']
}

if (-not $env:SHARED_AI_ROOT -or -not (Test-Path $env:SHARED_AI_ROOT)) {
    if (-not $Quiet) { Write-Error 'SHARED_AI_ROOT não configurado' }
    Write-Error 'Execute: npm run setup:skills'
    exit 1
}

$root = $env:SHARED_AI_ROOT
$gitignoreLib = Join-Path $root 'packages/cursor/scripts/ps1/lib/Ensure-ProjectGitignore.ps1'
if ((Test-Path $gitignoreLib) -and -not (Get-Command Ensure-ProjectGitignore -ErrorAction SilentlyContinue)) {
    . $gitignoreLib
}

$env:SHARED_AI_ROOT = $root
Reset-LinkCounters

$Target = (Resolve-Path -LiteralPath $Target).Path
$rulesDir = Join-Path $Target '.cursor/rules'
$commandsDir = Join-Path $Target '.cursor/commands'

if (Test-Path $rulesDir) {
    Remove-ProjectOrchestratorRuleSymlinks -RulesDir $rulesDir
}
if (Test-Path $commandsDir) {
    Remove-ProjectManagedCommandSymlinks -CommandsDir $commandsDir
}

foreach ($dir in @($rulesDir, $commandsDir)) {
    if ((Test-Path $dir) -and -not (Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue | Select-Object -First 1)) {
        Remove-Item -LiteralPath $dir -Force -ErrorAction SilentlyContinue
    }
}

Ensure-ProjectGitignore $Target

if (-not $Quiet) {
    Write-Host ''
    Write-Host "Concluído em $Target/.cursor/"
    Write-Host '  orquestrador → ~/.cursor/rules/ (global)'
    Write-Host '  commands → ~/.cursor/commands/ (global)'
    if ($script:LinkOrchestratorRemoved -gt 0) {
        Write-Host "  removidos do projeto: $script:LinkOrchestratorRemoved skills-orchestrator-*.mdc"
    }
    if ($script:LinkCommandsRemoved -gt 0) {
        Write-Host "  removidos do projeto: $script:LinkCommandsRemoved command(s)"
    }
    if ($script:LinkGitignoreScrubbed -gt 0) {
        Write-Host "  gitignore: $($script:LinkGitignoreScrubbed) linha(s) scrubadas"
    }
    if ($script:LinkSkipped -gt 0) {
        Write-Host "Ignorados (arquivo real do projeto): $script:LinkSkipped"
    }
}

exit 0
