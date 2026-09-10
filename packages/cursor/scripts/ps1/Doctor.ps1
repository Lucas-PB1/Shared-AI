# Doctor unificado: instalação, ferramentas, hooks e symlinks.
$ErrorActionPreference = 'Continue'

$LibRoot = Join-Path $PSScriptRoot 'lib'
. (Join-Path $LibRoot 'SharedAi-Env.ps1')
. (Join-Path $LibRoot 'Link-FromRepo.ps1')
. (Join-Path $LibRoot 'Projects-Registry.ps1')

$MonorepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$cursorDir = Get-CursorUserDir
$envFile = Get-SharedAiEnvFile
$issues = 0

function Write-Ok { param([string]$Msg) Write-Host "  ✓ $Msg" }
function Write-Fail {
    param([string]$Msg)
    Write-Host "  ✗ $Msg"
    $script:issues++
}
function Write-WarnItem {
    param([string]$Msg)
    Write-Host "  ⚠ $Msg"
    $script:issues++
}
function Write-Section {
    param([string]$Title)
    Write-Host ''
    Write-Host "=== $Title ==="
}

function Test-CommandExists {
    param([string]$Label, [string]$Bin)
    if (Get-Command $Bin -ErrorAction SilentlyContinue) {
        Write-Ok $Label
    } else {
        Write-Fail "$Label — comando ``$Bin`` não encontrado"
    }
}

function Test-HooksSessionStart {
    param([string]$HooksFile)

    if (-not (Test-Path $HooksFile)) { return 1 }
    try {
        $data = Get-Content $HooksFile -Raw | ConvertFrom-Json
        $session = @($data.hooks.sessionStart)
        foreach ($entry in $session) {
            $cmd = $entry.command
            if ($cmd -match 'ensure-project-cursor' -or $cmd -match 'ensure-project-rules') {
                return 0
            }
        }
        return 2
    } catch {
        return 1
    }
}

function Get-UserSymlinkIssues {
    param([string]$Root)

    $broken = 0
    $missing = 0
    $skipped = 0

    foreach ($f in Get-Item (Join-Path $Root 'packages/cursor/rules/skills-orchestrator-*.mdc') -ErrorAction SilentlyContinue) {
        $dest = Join-Path $cursorDir "rules/$($f.Name)"
        if ((Test-Path $dest) -and -not (Test-SharedAiSymlink $dest)) { $skipped++ }
        elseif ((Test-Path $dest) -and (Test-SharedAiSymlink $dest) -and -not (Test-Path $dest)) { $broken++ }
        elseif (-not (Test-Path $dest)) { $missing++ }
    }

    foreach ($skill in @(
        (Get-ChildItem (Join-Path $Root 'packages/cursor/skills') -Directory -ErrorAction SilentlyContinue)
    )) {
        foreach ($dir in $skill) {
            $dest = Join-Path $cursorDir "skills/$($dir.Name)"
            if ((Test-Path $dest) -and -not (Test-SharedAiSymlink $dest)) { $skipped++ }
            elseif ((Test-Path $dest) -and (Test-SharedAiSymlink $dest) -and -not (Test-Path $dest)) { $broken++ }
            elseif (-not (Test-Path $dest)) { $missing++ }
        }
    }

    foreach ($cmd in @('skills-why.md', 'cursor-cli.md', 'historico.md', 'sync-inbox.md', 'onboard.md')) {
        $dest = Join-Path $cursorDir "commands/$cmd"
        if ((Test-Path $dest) -and -not (Test-SharedAiSymlink $dest)) { $skipped++ }
        elseif ((Test-Path $dest) -and (Test-SharedAiSymlink $dest) -and -not (Test-Path $dest)) { $broken++ }
        elseif (-not (Test-Path $dest)) { $missing++ }
    }

    return @{ Broken = $broken; Missing = $missing; Skipped = $skipped }
}

Write-Host 'Shared AI — doctor'

Write-Section 'Instalação'
$root = ''
if (-not (Test-Path $envFile)) {
    Write-Fail 'shared-ai.env — rode: npm run setup:skills'
} else {
    Write-Ok 'shared-ai.env'
    $envData = Read-SharedAiEnv
    $root = $envData['SHARED_AI_ROOT']
    if ($root -and (Test-Path $root)) {
        Write-Ok "clone em $root"
        $current = Get-SharedAiVersion $root
        $installed = if ($envData['SHARED_AI_VERSION']) { $envData['SHARED_AI_VERSION'] } else { '?' }
        if ($current -ne $installed) {
            Write-WarnItem "versão desatualizada (clone=$current, instalada=$installed) — git pull && npm run sync"
        } else {
            Write-Ok "versão em dia ($current)"
        }
    } else {
        Write-Fail "clone não encontrado: $root"
    }
}

Write-Section 'Ferramentas'
if (Get-Command node -ErrorAction SilentlyContinue) {
    $major = [int](node -p "process.versions.node.split('.')[0]" 2>$null)
    if ($major -ge 20) {
        Write-Ok "Node.js $(node -v) (≥20)"
    } else {
        Write-Fail "Node.js 20+ necessário (atual: $(node -v))"
    }
} else {
    Write-Fail 'Node.js — comando ``node`` não encontrado'
}
Test-CommandExists 'npm' 'npm'
Test-CommandExists 'PowerShell' 'powershell'
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Ok 'tsx/Node (hooks JSON)'
} else {
    Write-Fail 'tsx/Node — rode: npm install (tsx para scripts/hooks JSON)'
}

Write-Section 'Dependências do clone'
if ($root -and (Test-Path $root)) {
    if (Test-Path (Join-Path $root 'node_modules')) {
        Write-Ok 'node_modules'
    } else {
        Write-Fail 'node_modules — rode: npm install'
    }
}

Write-Section '~/.cursor (artefatos)'
foreach ($script in @('Link-Project.ps1')) {
    $path = Join-Path $cursorDir $script
    if (Test-Path $path) {
        Write-Ok $script
    } else {
        Write-Fail "$script — rode: npm run setup:skills"
    }
}

foreach ($cmd in @('skills-why.md', 'cursor-cli.md', 'historico.md', 'sync-inbox.md', 'onboard.md')) {
    $path = Join-Path $cursorDir "commands/$cmd"
    $name = $cmd -replace '\.md$', ''
    if ((Test-Path $path) -and (Test-SharedAiSymlink $path)) {
        Write-Ok "command /$name"
    } elseif (Test-Path $path) {
        Write-WarnItem "command /$name — arquivo real (não symlink); rode npm run sync -- --migrate"
    } else {
        Write-Fail "command /$name — rode: npm run setup:skills"
    }
}

$routing = Join-Path $cursorDir 'SKILLS-ROUTING.md'
if ((Test-Path $routing) -and (Test-SharedAiSymlink $routing)) {
    Write-Ok 'SKILLS-ROUTING.md'
} elseif (Test-Path $routing) {
    Write-WarnItem 'SKILLS-ROUTING.md — cópia local; prefira symlink (npm run sync -- --migrate)'
} else {
    Write-Fail 'SKILLS-ROUTING.md — rode: npm run setup:skills'
}

Write-Section 'Hooks'
$hooksFile = Join-Path $cursorDir 'hooks.json'
$hookScript = Join-Path $cursorDir 'hooks/ensure-project-cursor.ps1'

if (Test-Path $hookScript) {
    Write-Ok 'ensure-project-cursor.ps1'
} else {
    Write-Fail 'ensure-project-cursor.ps1 — rode: npm run setup:skills'
}

$hookRc = Test-HooksSessionStart $hooksFile
if (-not (Test-Path $hooksFile)) {
    Write-Fail 'hooks.json ausente — rode: npm run setup:skills ou npm run sync'
} elseif ($hookRc -eq 0) {
    Write-Ok 'hooks.json com sessionStart → ensure-project-cursor'
} elseif ($hookRc -eq 2) {
    Write-WarnItem 'hooks.json sem sessionStart do shared-ai — adicione ensure-project-cursor.ps1'
} else {
    Write-Fail 'hooks.json inválido ou ilegível'
}

Write-Section 'Symlinks (~/.cursor)'
if ($root -and (Test-Path $root)) {
    $counts = Get-UserSymlinkIssues $root
    if ($counts.Broken -eq 0 -and $counts.Missing -eq 0 -and $counts.Skipped -eq 0) {
        Write-Ok 'rules, skills e commands linkados'
    } else {
        if ($counts.Broken -gt 0) { Write-WarnItem "$($counts.Broken) symlink(s) quebrado(s) — npm run sync" }
        if ($counts.Missing -gt 0) { Write-WarnItem "$($counts.Missing) symlink(s) ausente(s) — npm run sync" }
        if ($counts.Skipped -gt 0) { Write-WarnItem "$($counts.Skipped) artefato(s) real(is) no caminho do pacote — veja npm run status" }
    }
} else {
    Write-WarnItem 'symlinks não verificados (clone ausente)'
}

Write-Section 'Projetos registrados'
Ensure-Registry
Remove-MissingProjects
$projectCount = 0
$projectIssues = 0
foreach ($project in Get-RegisteredProjects) {
    if (-not $project) { continue }
    $projectCount++
    if (-not (Test-Path $project)) {
        Write-WarnItem "projeto inexistente: $project"
        $projectIssues++
        continue
    }
    $broken = 0
    $rulesDir = Join-Path $project '.cursor/rules'
    if (Test-Path $rulesDir) {
        foreach ($f in Get-ChildItem $rulesDir -Force -ErrorAction SilentlyContinue) {
            if ((Test-Path $f.FullName) -and (Test-SharedAiSymlink $f.FullName) -and -not (Test-Path $f.FullName)) {
                $broken++
            }
        }
    }
    if ($broken -gt 0) {
        Write-WarnItem "$project — $broken symlink(s) quebrado(s) em .cursor/rules/"
        $projectIssues++
    }
}

if ($projectCount -eq 0) {
    Write-Ok 'nenhum registrado (opcional — npm run bootstrap -- <repo>)'
} elseif ($projectIssues -eq 0) {
    Write-Ok "$projectCount projeto(s) registrado(s)"
}

Write-Host ''
if ($issues -eq 0) {
    Write-Host 'Resumo: OK'
    exit 0
}

Write-Host "Resumo: $issues pendência(s) — detalhes em npm run status"
exit 1
