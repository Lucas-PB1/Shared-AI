# Instala symlinks do shared-ai em ~/.cursor/

function Copy-SharedAiScript {
    param(
        [Parameter(Mandatory)][string]$Source,
        [Parameter(Mandatory)][string]$Dest
    )

    $destDir = Split-Path -Parent $Dest
    if ($destDir -and -not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Copy-Item -LiteralPath $Source -Destination $Dest -Force
}

function Install-SkillsPackage {
    param([Parameter(Mandatory)][string]$MonorepoRoot)

    $cursorDir = Get-CursorUserDir
    $cursorPkg = Join-Path $MonorepoRoot 'packages/cursor'
    $libDir = Join-Path $cursorPkg 'scripts/lib'
    $ps1Dir = Join-Path $cursorPkg 'scripts/ps1'

    $env:SHARED_AI_ROOT = $MonorepoRoot
    Reset-LinkCounters

    foreach ($sub in @('rules', 'skills', 'hooks', 'commands')) {
        $path = Join-Path $cursorDir $sub
        if (-not (Test-Path $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }

    Write-Host '→ rules (orquestrador)'
    foreach ($ruleFile in Get-Item (Join-Path $cursorPkg 'rules/skills-orchestrator-*.mdc') -ErrorAction SilentlyContinue) {
        $ruleDest = Join-Path $cursorDir "rules/$($ruleFile.Name)"
        if ((Test-Path $ruleDest) -and -not (Test-SharedAiSymlink $ruleDest)) {
            Remove-Item -LiteralPath $ruleDest -Force
        }
    }
    Link-Glob -Pattern (Join-Path $cursorPkg 'rules/skills-orchestrator-*.mdc') -DestDir (Join-Path $cursorDir 'rules')

    $commandsDir = Join-Path $cursorPkg 'commands'
    if (Test-Path $commandsDir) {
        Write-Host '→ commands (cursor)'
        Link-Glob -Pattern (Join-Path $commandsDir '*.md') -DestDir (Join-Path $cursorDir 'commands')
    }

    Write-Host '→ skills (cursor)'
    foreach ($skillDir in Get-ChildItem (Join-Path $cursorPkg 'skills') -Directory -ErrorAction SilentlyContinue) {
        Link-Dir -Src $skillDir.FullName -DestDir (Join-Path $cursorDir 'skills')
    }

    Write-Host '→ SKILLS-ROUTING.md'
    Link-File -Src (Join-Path $cursorPkg 'docs/SKILLS-ROUTING.md') -DestDir $cursorDir

    Write-Host '→ scripts de automação'
    Copy-SharedAiScript (Join-Path $ps1Dir 'Link-Project.ps1') (Join-Path $cursorDir 'Link-Project.ps1')
    Copy-SharedAiScript (Join-Path $ps1Dir 'Link-Project.ps1') (Join-Path $cursorDir 'Link-Project-Rules.ps1')
    Copy-SharedAiScript (Join-Path $cursorPkg 'scripts/hooks/ps1/ensure-project-cursor.ps1') (Join-Path $cursorDir 'hooks/ensure-project-cursor.ps1')
    Copy-SharedAiScript (Join-Path $cursorDir 'hooks/ensure-project-cursor.ps1') (Join-Path $cursorDir 'hooks/ensure-project-rules.ps1')
    Copy-SharedAiScript (Join-Path $ps1Dir 'lib/Projects-Registry.ps1') (Join-Path $cursorDir 'shared-ai-projects-registry.ps1')
    Copy-SharedAiScript (Join-Path $ps1Dir 'lib/SharedAi-Env.ps1') (Join-Path $cursorDir 'shared-ai-env.ps1')
    Copy-SharedAiScript (Join-Path $ps1Dir 'lib/Link-FromRepo.ps1') (Join-Path $cursorDir 'shared-ai-link-from-repo.ps1')

    Write-SharedAiEnv $MonorepoRoot

    Write-Host "  symlinks: $script:LinkLinked ok, $script:LinkSkipped pulados"

    Merge-SharedAiHooksJson $cursorPkg | Out-Null
}

function Migrate-ManagedRealFiles {
    param([Parameter(Mandatory)][string]$MonorepoRoot)

    $cursorDir = Get-CursorUserDir
    $cursorPkg = Join-Path $MonorepoRoot 'packages/cursor'

    Write-Host '→ migrate (substituir cópias antigas por symlinks)'

    foreach ($f in Get-Item (Join-Path $cursorPkg 'rules/skills-orchestrator-*.mdc') -ErrorAction SilentlyContinue) {
        $dest = Join-Path $cursorDir "rules/$($f.Name)"
        if ((Test-Path $dest) -and -not (Test-SharedAiSymlink $dest)) {
            Remove-Item -LiteralPath $dest -Force
        }
    }

    foreach ($cmd in @('skills-why.md', 'cursor-cli.md', 'historico.md', 'sync-inbox.md', 'onboard.md', 'automations.md', 'criar-skill.md', 'criar-rule.md')) {
        $dest = Join-Path $cursorDir "commands/$cmd"
        if ((Test-Path $dest) -and -not (Test-SharedAiSymlink $dest)) {
            Remove-Item -LiteralPath $dest -Force
        }
    }

    foreach ($dir in Get-ChildItem (Join-Path $cursorPkg 'skills') -Directory -ErrorAction SilentlyContinue) {
        $dest = Join-Path $cursorDir "skills/$($dir.Name)"
        if ((Test-Path $dest) -and -not (Test-SharedAiSymlink $dest)) {
            Remove-Item -LiteralPath $dest -Force -Recurse
        }
    }

    $routing = Join-Path $cursorDir 'SKILLS-ROUTING.md'
    if ((Test-Path $routing) -and -not (Test-SharedAiSymlink $routing)) {
        Remove-Item -LiteralPath $routing -Force
    }
}

function Invoke-UserSymlinkPrune {
    param([Parameter(Mandatory)][string]$MonorepoRoot)

    $cursorDir = Get-CursorUserDir
    $cursorPkg = Join-Path $MonorepoRoot 'packages/cursor'

    $env:SHARED_AI_ROOT = $MonorepoRoot

    $names = @()
    foreach ($f in Get-Item (Join-Path $cursorPkg 'rules/skills-orchestrator-*.mdc') -ErrorAction SilentlyContinue) {
        $names += $f.Name
    }
    Prune-ManagedSymlinks -Dir (Join-Path $cursorDir 'rules') -ManagedNames $names

    $names = @()
    foreach ($dir in Get-ChildItem (Join-Path $cursorPkg 'skills') -Directory -ErrorAction SilentlyContinue) {
        $names += $dir.Name
    }
    Prune-ManagedSymlinks -Dir (Join-Path $cursorDir 'skills') -ManagedNames $names

    Prune-ManagedSymlinks -Dir (Join-Path $cursorDir 'commands') -ManagedNames @(
        'skills-why.md', 'cursor-cli.md', 'historico.md', 'sync-inbox.md', 'onboard.md', 'automations.md', 'criar-skill.md', 'criar-rule.md'
    )
}
