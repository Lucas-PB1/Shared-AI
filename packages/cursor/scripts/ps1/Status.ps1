# Status do shared-ai: versão, projetos, symlinks, conflitos.
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Projects-Registry.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
$cursorDir = Get-CursorUserDir
$envFile = Get-SharedAiEnvFile
$issues = 0

Write-Host 'Shared AI — status'
Write-Host ''

if (-not (Test-Path $envFile)) {
    Write-Host '✗ Não instalado — rode npm run setup:skills'
    exit 1
}

$envData = Read-SharedAiEnv
$root = $envData['SHARED_AI_ROOT']

if (-not $root -or -not (Test-Path $root)) {
    Write-Host "✗ Clone não encontrado: $root"
    $issues++
} else {
    $current = Get-SharedAiVersion $root
    $installed = if ($envData['SHARED_AI_VERSION']) { $envData['SHARED_AI_VERSION'] } else { '?' }
    Write-Host "Clone:     $root"
    Write-Host "Versão:    clone=$current  instalada=$installed"
    if ($current -ne $installed) {
        Write-Host '⚠ Desatualizado — git pull && npm run sync'
        $issues++
    } else {
        Write-Host '✓ Versão em dia'
    }
    $lastSync = if ($envData['SHARED_AI_LAST_SYNC']) { $envData['SHARED_AI_LAST_SYNC'] } else { '?' }
    Write-Host "Último sync: $lastSync"
}

Write-Host ''
Write-Host '=== ~/.cursor/ (usuário) ==='
$env:SHARED_AI_ROOT = $root
Reset-LinkCounters

function Test-UserLink {
    param([string]$Src, [string]$Dest)

    if ((Test-Path $Dest) -and -not (Test-SharedAiSymlink $Dest) -and -not (Test-Path $Dest -PathType Leaf)) {
        # real dir
        if (-not (Test-SharedAiSymlink $Dest)) {
            Write-Host "  pulado: $Dest (arquivo real)"
            $script:issues++
            return
        }
    }
    if ((Test-Path $Dest) -and -not (Test-SharedAiSymlink $Dest)) {
        Write-Host "  pulado: $Dest (arquivo real)"
        $script:issues++
        return
    }
    if ((Test-Path $Dest) -and (Test-SharedAiSymlink $Dest) -and -not (Test-Path $Dest)) {
        Write-Host "  quebrado: $Dest"
        $script:issues++
        return
    }
    if (Test-SharedAiSymlink $Dest) {
        Write-Host "  ok: $(Split-Path -Leaf $Dest)"
        return
    }
    if ((Test-Path $Src) -and -not (Test-Path $Dest)) {
        Write-Host "  ausente: $Dest"
        $script:issues++
    }
}

if ($root -and (Test-Path $root)) {
    foreach ($f in Get-Item (Join-Path $root 'packages/cursor/rules/skills-orchestrator-*.mdc') -ErrorAction SilentlyContinue) {
        Test-UserLink $f.FullName (Join-Path $cursorDir "rules/$($f.Name)")
    }
    foreach ($skill in @(
        (Get-ChildItem (Join-Path $root 'packages/cursor/skills') -Directory -ErrorAction SilentlyContinue)
    )) {
        foreach ($dir in $skill) {
            Test-UserLink $dir.FullName (Join-Path $cursorDir "skills/$($dir.Name)")
        }
    }
    Test-UserLink (Join-Path $root 'packages/cursor/commands/skills-why.md') (Join-Path $cursorDir 'commands/skills-why.md')
}

Write-Host ''
Write-Host '=== Projetos registrados ==='
Ensure-Registry
Remove-MissingProjects
$projectCount = 0
foreach ($project in Get-RegisteredProjects) {
    if (-not $project) { continue }
    $projectCount++
    if (-not (Test-Path $project)) {
        Write-Host "  ✗ $project (não existe)"
        $issues++
        continue
    }
    $broken = 0
    $skipped = 0
    $rulesDir = Join-Path $project '.cursor/rules'
    if (Test-Path $rulesDir) {
        foreach ($f in Get-ChildItem $rulesDir -Force -ErrorAction SilentlyContinue) {
            if ((Test-Path $f.FullName) -and -not (Test-SharedAiSymlink $f.FullName)) {
                $skipped++
            } elseif ((Test-Path $f.FullName) -and (Test-SharedAiSymlink $f.FullName) -and -not (Test-Path $f.FullName)) {
                $broken++
            }
        }
    }
    if ($broken -gt 0) {
        Write-Host "  ⚠ $project ($broken symlink(s) quebrado(s))"
        $issues++
    } elseif ($skipped -gt 0) {
        Write-Host "  ✓ $project ($skipped rule(s) própria(s); orquestrador em ~/.cursor/rules/)"
    } else {
        Write-Host "  ✓ $project (orquestrador global)"
    }
}

if ($projectCount -eq 0) {
    Write-Host '  (nenhum — use npm run bootstrap -- <repo>)'
}

Write-Host ''
if ($issues -eq 0) {
    Write-Host 'Resumo: OK'
} else {
    Write-Host "Resumo: $issues item(ns) pendente(s)"
}
exit 0
