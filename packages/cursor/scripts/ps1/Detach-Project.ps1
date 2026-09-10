# Remove symlinks shared-ai do projeto e opcionalmente desregistra do sync.
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Projects-Registry.ps1')
. (Join-Path $LibRoot 'Detach-Project.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path

$projectPath = $null
$keepRegistry = $false

for ($i = 0; $i -lt $args.Count; $i++) {
    $arg = $args[$i]
    if ($arg -eq '--keep-registry') {
        $keepRegistry = $true
    } elseif ($arg -eq '-h' -or $arg -eq '--help') {
        Write-Host 'Uso: npm run detach -- <repo> [--keep-registry]'
        Write-Host ''
        Write-Host 'Remove symlinks gerenciados (orquestrador + commands).'
        Write-Host 'Preserva arquivos reais, SKILLS-ROUTING.md e skills/ do projeto.'
        Write-Host 'Por padrão remove o projeto do registry (npm run sync não relinka).'
        exit 0
    } elseif (-not $projectPath) {
        $projectPath = $arg
    } else {
        Write-Error "Argumento inesperado: $arg"
        exit 1
    }
}

if (-not $projectPath) {
    Write-Error @(
        'Informe o diretório raiz do projeto:',
        '  npm run detach -- C:\caminho\do\repo'
    ) -join "`n"
    exit 1
}

$envData = Read-SharedAiEnv
if ($envData['SHARED_AI_ROOT']) {
    $env:SHARED_AI_ROOT = $envData['SHARED_AI_ROOT']
} else {
    $env:SHARED_AI_ROOT = $MonorepoRoot
}

if (-not (Test-Path $projectPath)) {
    Write-Error "Diretório não encontrado: $projectPath"
    exit 1
}

$projectPath = (Resolve-Path -LiteralPath $projectPath).Path
Remove-SharedAiFromProject $projectPath

if (-not $keepRegistry) {
    if (Unregister-Project $projectPath) {
        Write-Host '→ desregistrado do sync (registry)'
    }
} else {
    Write-Host '→ registry preservado (--keep-registry)'
}

Write-Host ''
Write-Host "Detach concluído: $projectPath"
