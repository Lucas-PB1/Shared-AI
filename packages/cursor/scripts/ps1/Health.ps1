# Saúde multi-projeto — nativo PowerShell (tsx health-json.ts).
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Profiles.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$env:SHARED_AI_ROOT = $MonorepoRoot
$cursorDir = Get-CursorUserDir
$envFile = Get-SharedAiEnvFile
$registry = Join-Path $cursorDir 'shared-ai/projects.json'
$asJson = $false

foreach ($arg in $args) {
    if ($arg -eq '--json') { $asJson = $true }
    elseif ($arg -in @('-h', '--help')) {
        Write-Host 'Uso: npm run health [-- --json]'
        exit 0
    }
}

$tsx = Get-SharedAiTsx
$script = Join-Path $MonorepoRoot 'packages/cursor/scripts/lib/install/ts/health-json.ts'
if (-not $tsx -or -not (Test-Path $script)) {
    Write-Error 'tsx / health-json.ts não encontrado. Rode npm install na raiz.'
    exit 1
}

$raw = & $tsx $script $envFile $registry
if ($LASTEXITCODE -ne 0) {
    Write-Host $raw
    exit $LASTEXITCODE
}

if ($asJson) {
    Write-Host $raw.TrimEnd()
    exit 0
}

$data = $raw | ConvertFrom-Json
Write-Host 'Shared AI — health (projetos registrados)'
Write-Host ''
Write-Host '=== Máquina ==='
if ($data.machine.ok) {
    Write-Host ("  ✓ versão em dia ({0})" -f $data.machine.version_clone)
}
else {
    foreach ($issue in $data.machine.issues) {
        switch ($issue) {
            'not_installed' { Write-Host '  ✗ shared-ai não instalado — npm run setup:skills' }
            'version_mismatch' { Write-Host '  ⚠ versão desatualizada — git pull && npm run sync' }
            default { Write-Host "  ✗ $issue" }
        }
    }
}

Write-Host ''
Write-Host '=== Projetos ==='
if ($data.projects.Count -eq 0) {
    Write-Host '  (nenhum projeto no registry — npm run bootstrap -- <repo>)'
}
else {
    foreach ($p in $data.projects) {
        $mark = if ($p.ok) { '✓' } else { '✗' }
        Write-Host ("  {0} {1}  perfil={2}  dirty={3}" -f $mark, $p.path, $p.profile, $p.git_dirty)
        foreach ($issue in $p.issues) { Write-Host "      · $issue" }
    }
}

Write-Host ''
Write-Host ("Resumo: {0} projeto(s), {1} issue(s)" -f $data.summary.project_count, $data.summary.issues)
if ($data.summary.issues -gt 0) { exit 1 }
exit 0
