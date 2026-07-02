# Status do hostdime-ia: versão, projetos, symlinks, conflitos.
$ErrorActionPreference = 'Stop'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'Hostdime-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Projects-Registry.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$cursorDir = Get-CursorUserDir
$envFile = Get-HostdimeEnvFile
$issues = 0

Write-Host 'HostDime IA — status'
Write-Host ''

if (-not (Test-Path $envFile)) {
    Write-Host '✗ Não instalado — rode npm run setup:skills'
    exit 1
}

$envData = Read-HostdimeEnv
$root = $envData['HOSTDIME_IA_ROOT']

if (-not $root -or -not (Test-Path $root)) {
    Write-Host "✗ Clone não encontrado: $root"
    $issues++
} else {
    $current = Get-HostdimeVersion $root
    $installed = if ($envData['HOSTDIME_IA_VERSION']) { $envData['HOSTDIME_IA_VERSION'] } else { '?' }
    Write-Host "Clone:     $root"
    Write-Host "Versão:    clone=$current  instalada=$installed"
    if ($current -ne $installed) {
        Write-Host '⚠ Desatualizado — git pull && npm run sync'
        $issues++
    } else {
        Write-Host '✓ Versão em dia'
    }
    $lastSync = if ($envData['HOSTDIME_IA_LAST_SYNC']) { $envData['HOSTDIME_IA_LAST_SYNC'] } else { '?' }
    Write-Host "Último sync: $lastSync"
}

Write-Host ''
Write-Host '=== ~/.cursor/ (usuário) ==='
$env:HOSTDIME_IA_ROOT = $root
Reset-LinkCounters

function Test-UserLink {
    param([string]$Src, [string]$Dest)

    if ((Test-Path $Dest) -and -not (Test-HostdimeSymlink $Dest) -and -not (Test-Path $Dest -PathType Leaf)) {
        # real dir
        if (-not (Test-HostdimeSymlink $Dest)) {
            Write-Host "  pulado: $Dest (arquivo real)"
            $script:issues++
            return
        }
    }
    if ((Test-Path $Dest) -and -not (Test-HostdimeSymlink $Dest)) {
        Write-Host "  pulado: $Dest (arquivo real)"
        $script:issues++
        return
    }
    if ((Test-Path $Dest) -and (Test-HostdimeSymlink $Dest) -and -not (Test-Path $Dest)) {
        Write-Host "  quebrado: $Dest"
        $script:issues++
        return
    }
    if (Test-HostdimeSymlink $Dest) {
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
        (Get-ChildItem (Join-Path $root 'packages/cursor/skills') -Directory -ErrorAction SilentlyContinue),
        (Get-ChildItem (Join-Path $root 'packages/code-review/skills') -Directory -ErrorAction SilentlyContinue)
    )) {
        foreach ($dir in $skill) {
            Test-UserLink $dir.FullName (Join-Path $cursorDir "skills/$($dir.Name)")
        }
    }
    Test-UserLink (Join-Path $root 'packages/code-review/commands/avaliar.md') (Join-Path $cursorDir 'commands/avaliar.md')
    Test-UserLink (Join-Path $root 'packages/code-review/commands/finalizar.md') (Join-Path $cursorDir 'commands/finalizar.md')
    Test-UserLink (Join-Path $root 'packages/code-review/commands/avaliar-diff.md') (Join-Path $cursorDir 'commands/avaliar-diff.md')
    Test-UserLink (Join-Path $root 'packages/cursor/commands/skills-why.md') (Join-Path $cursorDir 'commands/skills-why.md')
    Test-UserLink (Join-Path $root 'packages/cursor/commands/hubspot-mcp.md') (Join-Path $cursorDir 'commands/hubspot-mcp.md')
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
            if ((Test-Path $f.FullName) -and -not (Test-HostdimeSymlink $f.FullName)) {
                $skipped++
            } elseif ((Test-Path $f.FullName) -and (Test-HostdimeSymlink $f.FullName) -and -not (Test-Path $f.FullName)) {
                $broken++
            }
        }
    }
    if ($broken -gt 0) {
        Write-Host "  ⚠ $project ($broken symlink(s) quebrado(s))"
        $issues++
    } elseif ($skipped -gt 0) {
        Write-Host "  ✓ $project ($skipped rule(s) própria(s) preservada(s))"
    } else {
        Write-Host "  ✓ $project"
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
