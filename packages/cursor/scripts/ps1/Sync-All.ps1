# Sincroniza após git pull: symlinks, deps, relink de todos os projetos.
# Uso: npm run sync [-- --prune] [-- --migrate]
param(
    [switch]$Prune,
    [switch]$Migrate
)

$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Projects-Registry.ps1')
. (Join-Path $LibRoot 'Merge-HooksJson.ps1')
. (Join-Path $LibRoot 'Install-Packages.ps1')

# Compat: args soltos (--prune / --migrate) quando o caller não usa -Prune/-Migrate
foreach ($a in $args) {
    if ($a -eq '--prune' -or $a -eq '-Prune') { $Prune = $true }
    if ($a -eq '--migrate' -or $a -eq '-Migrate') { $Migrate = $true }
}

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$cursorDir = Get-CursorUserDir
$linkScript = Join-Path $cursorDir 'Link-Project.ps1'
$stateFile = Join-Path $cursorDir 'shared-ai/sync-state.env'

Write-Host 'Shared AI — sync'
Write-Host "Clone: $MonorepoRoot"
Write-Host ''

if ($Migrate) {
    Migrate-ManagedRealFiles $MonorepoRoot
}

Install-SkillsPackage $MonorepoRoot

if ($Prune) {
    Write-Host '→ prune symlinks órfãos'
    Invoke-UserSymlinkPrune $MonorepoRoot
}

$stateDir = Split-Path $stateFile -Parent
if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
}

$pkgHash = ''
$pkgLock = Join-Path $MonorepoRoot 'package-lock.json'

if (Test-Path $pkgLock) {
    $pkgHash = (Get-FileHash -Path $pkgLock -Algorithm MD5).Hash.ToLowerInvariant()
}

$prevPkg = ''
if (Test-Path $stateFile) {
    Get-Content $stateFile | ForEach-Object {
        if ($_ -match '^PACKAGE_LOCK_HASH=(.+)$') { $prevPkg = $Matches[1] }
    }
}

$needsNpm = $false

if ($pkgHash -and $pkgHash -ne $prevPkg) {
    $needsNpm = $true
    Write-Host 'package-lock.json alterado — npm install'
}

if ($needsNpm) {
    Push-Location $MonorepoRoot
    npm install
    Pop-Location
}

$stateLines = @()
if ($pkgHash) { $stateLines += "PACKAGE_LOCK_HASH=$pkgHash" }
Set-Content -Path $stateFile -Value ($stateLines -join "`n") -Encoding UTF8

Update-SharedAiSyncTime
Remove-MissingProjects

Write-Host ''
Write-Host '→ relink projetos registrados'
if (Test-Path $linkScript) {
    foreach ($project in Get-RegisteredProjects) {
        if ($project -and (Test-Path -LiteralPath $project)) {
            Write-Host "  $project"
            try {
                & $linkScript -Quiet $project
            } catch {
                # fire-and-forget like bash
            }
        }
    }
}

Write-Host ''
Write-Host 'Sync concluído.'

. (Join-Path $LibRoot 'Boot-Sync.ps1')
Prompt-BootSyncIfNeeded
