# Prepara um repositório: rules, commands, pastas review, perfil opcional.
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Projects-Registry.ps1')
. (Join-Path $LibRoot 'Apply-BootstrapProfile.ps1')
. (Join-Path $LibRoot 'Profiles.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$cursorDir = Get-CursorUserDir
$linkScript = if ($env:CURSOR_LINK_PROJECT_SCRIPT) {
    $env:CURSOR_LINK_PROJECT_SCRIPT
} elseif ($env:CURSOR_LINK_RULES_SCRIPT) {
    $env:CURSOR_LINK_RULES_SCRIPT
} else {
    Join-Path $cursorDir 'Link-Project.ps1'
}

$projectPath = $null
$profileName = $null
$argList = @($args)

for ($i = 0; $i -lt $argList.Count; $i++) {
    $arg = $argList[$i]
    if ($arg -match '^--profile=(.+)$') {
        $profileName = $Matches[1]
    } elseif ($arg -eq '--profile') {
        $profileName = $argList[$i + 1]
        $i++
    } elseif ($arg -eq '-h' -or $arg -eq '--help') {
        Write-Host 'Uso: npm run bootstrap -- <repo> [--profile=nome]'
        Write-ProfilesUsage
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
        '  npm run bootstrap -- C:\caminho\do\repo [--profile=laravel]'
    ) -join "`n"
    exit 1
}

if (-not (Test-Path $linkScript)) {
    Write-Error @(
        'Pacote não instalado. Execute primeiro:',
        '  npm run setup:skills'
    ) -join "`n"
    exit 1
}

if (-not (Test-Path $projectPath)) {
    Write-Error "Diretório não encontrado: $projectPath"
    exit 1
}

$projectPath = (Resolve-Path -LiteralPath $projectPath).Path
$env:SHARED_AI_ROOT = if ($env:SHARED_AI_ROOT) { $env:SHARED_AI_ROOT } else { $MonorepoRoot }

if ($profileName) {
    if (-not (Test-ProfileName $profileName)) {
        Write-Error "Erro: perfil desconhecido: $profileName"
        Write-ProfilesUsage
        exit 1
    }
}

$skillsDir = Join-Path $projectPath '.cursor/skills'
if (-not (Test-Path $skillsDir)) {
    New-Item -ItemType Directory -Path $skillsDir -Force | Out-Null
}

& $linkScript $projectPath
Register-Project $projectPath

if ($profileName) {
    Apply-BootstrapProfile -Project $projectPath -Profile $profileName
}

Write-Host ''
Write-Host "Projeto preparado: $projectPath"
Write-Host '  .cursor/rules/    → rules do projeto (*-project.mdc); orquestrador em ~/.cursor/rules/'
Write-Host '  .cursor/commands/ → commands do projeto (opcional); shared-ai em ~/.cursor/commands/'
Write-Host '  .cursor/skills/   → overrides do projeto'
if ($profileName) { Write-Host "  perfil            → $profileName" }
Write-Host '  .gitignore        → artefatos gerenciados (se .cursor/ não estiver ignorado)'
