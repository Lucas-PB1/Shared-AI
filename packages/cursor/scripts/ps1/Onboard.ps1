# Wizard de configuração nativo (PowerShell) — sem Git Bash.
param(
    [switch]$Yes,
    [switch]$SkipExtras,
    [switch]$SkipPull,
    [string]$Project,
    [string]$Profile
)

$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Profiles.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$env:SHARED_AI_ROOT = $MonorepoRoot
$cursorDir = Get-CursorUserDir
$envFile = Get-SharedAiEnvFile

$NonInteractive = [bool]$Yes

$argList = @($args)
for ($i = 0; $i -lt $argList.Count; $i++) {
    $arg = [string]$argList[$i]
    if ($arg -match '^--project=(.+)$') { $Project = $Matches[1] }
    elseif ($arg -eq '--project') { $Project = $argList[++$i] }
    elseif ($arg -match '^--profile=(.+)$') { $Profile = $Matches[1] }
    elseif ($arg -eq '--profile') { $Profile = $argList[++$i] }
    elseif ($arg -in @('--yes', '-y', '-Yes')) { $NonInteractive = $true }
    elseif ($arg -eq '--skip-extras' -or $arg -eq '-SkipExtras') { $SkipExtras = $true }
    elseif ($arg -eq '--skip-pull' -or $arg -eq '-SkipPull') { $SkipPull = $true }
    elseif ($arg -eq 'run') { }
    elseif ($arg -in @('-h', '--help', '-Help')) {
        @'
Uso: npm run onboard [-- opções]

  --project=PATH       Caminho do repositório
  --profile=NAME       Perfil (monorepo, nestjs, next, react, …)
  --yes, -y            Aceita defaults (sem prompts)
  --skip-extras        Não oferece boot-sync / sync-inbox / cursor-cli
  --skip-pull          Não faz git pull no monorepo
'@ | Write-Host
        exit 0
    }
    else {
        Write-Error "Argumento desconhecido: $arg"
        exit 1
    }
}

function Invoke-Npm {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$NpmArgs)
    Push-Location $MonorepoRoot
    try {
        & npm @NpmArgs
        if ($LASTEXITCODE -ne 0) { throw "npm $($NpmArgs -join ' ') falhou (código $LASTEXITCODE)" }
    }
    finally { Pop-Location }
}

function Confirm-Onboard {
    param([string]$Prompt, [bool]$DefaultYes = $false)
    if ($NonInteractive) { return $DefaultYes }
    $ans = Read-Host "$Prompt [y/N]"
    return $ans -match '^[Yy]'
}

Write-Host 'Shared AI — onboarding'
Write-Host ''

Write-Host '=== 1. Atualizar monorepo ==='
Write-Host "  Clone: $MonorepoRoot"
if ($SkipPull) {
    Write-Host '  · git pull pulado (--skip-pull)'
}
elseif (Test-Path (Join-Path $MonorepoRoot '.git')) {
    Write-Host '  → git pull --ff-only'
    Push-Location $MonorepoRoot
    try {
        git pull --ff-only
        if ($LASTEXITCODE -ne 0) {
            Write-Host '  ! git pull falhou — continuando com o clone local'
        }
    }
    finally { Pop-Location }
}

Write-Host '  → npm run setup -- --env-only'
Invoke-Npm run setup -- --env-only

Write-Host ''
Write-Host '=== 2. Pacote skills + sync ==='
if (Test-Path $envFile) {
    Write-Host "  ✓ skills já instaladas ($envFile)"
    Write-Host '  → npm run sync'
    Invoke-Npm run sync
}
else {
    Write-Host '  → npm run setup:skills'
    Invoke-Npm run setup:skills
    Write-Host '  → npm run sync'
    Invoke-Npm run sync
}

Write-Host ''
Write-Host '=== 3. Projeto ==='
if (-not $Project) {
    if ($NonInteractive) { $Project = $MonorepoRoot }
    else {
        $reply = Read-Host "Caminho do repositório [$MonorepoRoot]"
        $Project = if ($reply) { $reply } else { $MonorepoRoot }
    }
}
if (-not (Test-Path -LiteralPath $Project)) {
    Write-Error "Diretório não encontrado: $Project"
    exit 1
}
$Project = (Resolve-Path -LiteralPath $Project).Path
Write-Host "  → $Project"

Write-Host ''
Write-Host '=== 5. Perfil ==='
if (-not $Profile) {
    $detected = Get-DetectedProfile $Project
    if ($detected) { Write-Host "  Detectado: $detected" }
    else { Write-Host '  Nenhum perfil detectado automaticamente.' }
    if ($NonInteractive) { $Profile = $detected }
    else {
        $names = @(Get-ProfileNames)
        Write-Host 'Escolha o perfil do projeto:'
        if ($detected) { Write-Host "  [Enter] $detected (detectado)" }
        for ($n = 0; $n -lt $names.Count; $n++) {
            Write-Host "  $($n + 1)) $($names[$n])"
        }
        Write-Host '  s) Sem perfil (bootstrap genérico)'
        $choice = Read-Host 'Opção'
        if (-not $choice -and $detected) { $Profile = $detected }
        elseif ($choice -in @('s', 'S')) { $Profile = $null }
        elseif ($choice -match '^\d+$' -and [int]$choice -ge 1 -and [int]$choice -le $names.Count) {
            $Profile = $names[[int]$choice - 1]
        }
        elseif ($choice -and (Test-ProfileName $choice)) { $Profile = $choice }
        else { $Profile = $detected }
    }
}
elseif (-not (Test-ProfileName $Profile)) {
    Write-Error "Erro: perfil desconhecido: $Profile"
    Write-ProfilesUsage
    exit 1
}

if ($Project -eq $MonorepoRoot -and -not $Profile) {
    $Profile = 'next'
    Write-Host '  → next (default do monorepo / dashboard)'
}

Write-Host ''
Write-Host '=== 6. Bootstrap ==='
Push-Location $MonorepoRoot
try {
    if ($Profile) {
        Write-Host "  → bootstrap --profile=$Profile $Project"
        & node (Join-Path $MonorepoRoot 'packages/cursor/scripts/mjs/run.mjs') bootstrap "--profile=$Profile" $Project
    }
    else {
        Write-Host "  → bootstrap $Project"
        & node (Join-Path $MonorepoRoot 'packages/cursor/scripts/mjs/run.mjs') bootstrap $Project
    }
    if ($LASTEXITCODE -ne 0) { throw "bootstrap falhou (código $LASTEXITCODE)" }
}
finally { Pop-Location }

$configureNext = ($Project -eq $MonorepoRoot) -or ($Profile -eq 'next')
if ($configureNext) {
    Write-Host ''
    Write-Host '=== 7. Dashboard Next.js ==='
    Write-Host '  → npm install'
    Invoke-Npm install
    Write-Host '  · App: npm run dev  →  http://localhost:3000'
    Write-Host '    Preencha o .env com as keys de npm run supabase:status (stack local).'
}

if (-not $SkipExtras -and -not $NonInteractive) {
    Write-Host ''
    Write-Host '=== 8. Extras (opcional) ==='
    if (Confirm-Onboard 'Ativar boot-sync (git pull + sync ao logar)?') {
        Invoke-Npm run boot-sync -- on
    }
    if (Confirm-Onboard 'Ativar sync-inbox (projetos dirty ao logar)?') {
        Invoke-Npm run sync-inbox -- on
    }
    if (Confirm-Onboard 'Instalar Cursor CLI (agent)?') {
        Invoke-Npm run cursor-cli -- install --skip-login
    }
}

Write-Host ''
Write-Host '=== Concluído ==='
Write-Host "  Monorepo: $MonorepoRoot"
Write-Host "  Projeto:  $Project"
if ($Profile) { Write-Host "  Perfil:   $Profile" }
Write-Host ''
Write-Host '  · npm run health — saúde dos projetos registrados'
Write-Host '  · npm run test   — unit tests (Node, sem bash)'
Write-Host '  · npm run lint:ts'
Write-Host ''
