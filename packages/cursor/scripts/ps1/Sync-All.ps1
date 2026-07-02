# Sincroniza após git pull: symlinks, deps, relink de todos os projetos.
# Uso: npm run sync [-- --prune] [-- --migrate]
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'Hostdime-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Projects-Registry.ps1')
. (Join-Path $LibRoot 'Merge-HooksJson.ps1')
. (Join-Path $LibRoot 'Install-Packages.ps1')

$prune = $args -contains '--prune'
$migrate = $args -contains '--migrate'

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$cursorDir = Get-CursorUserDir
$linkScript = Join-Path $cursorDir 'Link-Project.ps1'
$stateFile = Join-Path $cursorDir 'hostdime-ia/sync-state.env'

Write-Host 'HostDime IA — sync'
Write-Host "Clone: $MonorepoRoot"
Write-Host ''

if ($migrate) {
    Migrate-ManagedRealFiles $MonorepoRoot
}

Install-SkillsPackage $MonorepoRoot
Install-CodeReviewPackage $MonorepoRoot

if ($prune) {
    Write-Host '→ prune symlinks órfãos'
    Invoke-UserSymlinkPrune $MonorepoRoot
}

$stateDir = Split-Path $stateFile -Parent
if (-not (Test-Path $stateDir)) {
    New-Item -ItemType Directory -Path $stateDir -Force | Out-Null
}

$pkgHash = ''
$composerHash = ''
$pkgLock = Join-Path $MonorepoRoot 'package-lock.json'
$composerLock = Join-Path $MonorepoRoot 'composer.lock'

if (Test-Path $pkgLock) {
    $pkgHash = (Get-FileHash -Path $pkgLock -Algorithm MD5).Hash.ToLowerInvariant()
}
if (Test-Path $composerLock) {
    $composerHash = (Get-FileHash -Path $composerLock -Algorithm MD5).Hash.ToLowerInvariant()
}

$prevPkg = ''
$prevComposer = ''
$prevPkg = ''
$prevComposer = ''
if (Test-Path $stateFile) {
    Get-Content $stateFile | ForEach-Object {
        if ($_ -match '^PACKAGE_LOCK_HASH=(.+)$') { $prevPkg = $Matches[1] }
        if ($_ -match '^COMPOSER_LOCK_HASH=(.+)$') { $prevComposer = $Matches[1] }
    }
}

$needsNpm = $false
$needsComposer = $false

if ($pkgHash -and $pkgHash -ne $prevPkg) {
    $needsNpm = $true
    Write-Host 'package-lock.json alterado — npm install'
}
if ($composerHash -and $composerHash -ne $prevComposer) {
    $needsComposer = $true
    Write-Host 'composer.lock alterado — composer install'
}

if ($needsNpm) {
    Push-Location $MonorepoRoot
    npm install
    Pop-Location
}
if ($needsComposer) {
    Push-Location $MonorepoRoot
    composer install --quiet
    Pop-Location
}

$stateLines = @()
if ($pkgHash) { $stateLines += "PACKAGE_LOCK_HASH=$pkgHash" }
if ($composerHash) { $stateLines += "COMPOSER_LOCK_HASH=$composerHash" }
Set-Content -Path $stateFile -Value ($stateLines -join "`n") -Encoding UTF8

Update-HostdimeSyncTime
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
