# Garante entradas no .gitignore do projeto para artefatos de review (hostdime-ia).

$script:HostdimeGitignoreMarker = '# hostdime-ia: cursor gerenciado localmente (npm run bootstrap)'

$script:HostdimeGitignoreOrphans = @(
    '.cursor/rules/skills-orchestrator-*.mdc'
    '.cursor/commands/avaliar.md'
    '.cursor/commands/finalizar.md'
    '.cursor/commands/avaliar-diff.md'
    '.cursor/commands/memoria.md'
    '.cursor/commands/skills-why.md'
    '.cursor/commands/hubspot-mcp.md'
    '.cursor/commands/cursor-cli.md'
    '.cursor/commands/historico.md'
    '.cursor/commands/sync-inbox.md'
    '.cursor/commands/onboard.md'
    '.cursor/commands/migrar-cursor.md'
    '.cursor/review/memoria.md'
    '.cursor/review/context.json'
)

$script:LinkGitignoreScrubbed = 0

function Test-CursorDirFullyIgnored {
    param([Parameter(Mandatory)][string]$Project)

    $gitignore = Join-Path $Project '.gitignore'
    $cursorPath = Join-Path $Project '.cursor'

    if (Test-Path (Join-Path $Project '.git')) {
        git -C $Project check-ignore -q $cursorPath 2>$null
        if ($LASTEXITCODE -eq 0) { return $true }
    }

    if (-not (Test-Path $gitignore)) { return $false }

    $content = Get-Content $gitignore -Raw
    if ($content -match '(?m)^\.cursor/?$') { return $true }
    if ($content -match '(?m)^\.cursor/\*$') { return $true }
    return $false
}

function Scrub-ProjectGitignoreHostdime {
    param([Parameter(Mandatory)][string]$Project)

    $script:LinkGitignoreScrubbed = 0
    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path $root)) { return }

    $gitignore = Join-Path $Project '.gitignore'
    if (-not (Test-Path $gitignore)) { return }
    if (-not (Select-String -Path $gitignore -Pattern ([regex]::Escape($script:HostdimeGitignoreMarker)) -Quiet)) {
        return
    }

    $kept = [System.Collections.Generic.List[string]]::new()
    $scrubbed = 0
    foreach ($line in (Get-Content $gitignore)) {
        if ($script:HostdimeGitignoreOrphans -contains $line) {
            $scrubbed++
            continue
        }
        $kept.Add($line)
    }
    Set-Content -Path $gitignore -Value $kept
    $script:LinkGitignoreScrubbed = $scrubbed

    $fragment = Join-Path $root 'packages/cursor/scripts/lib/install/project-gitignore.fragment'
    if ((Test-Path $fragment) -and -not (Test-CursorDirFullyIgnored $Project)) {
        $existing = Get-Content $gitignore
        foreach ($line in (Get-Content $fragment)) {
            if (-not $line) { continue }
            if ($existing -notcontains $line) {
                Add-Content -Path $gitignore -Value $line
            }
        }
    }
}

function Ensure-ProjectGitignore {
    param([Parameter(Mandatory)][string]$Project)

    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path $root)) { return }

    $fragment = Join-Path $root 'packages/cursor/scripts/lib/install/project-gitignore.fragment'
    if (-not (Test-Path $fragment)) { return }

    Scrub-ProjectGitignoreHostdime $Project

    if (Test-CursorDirFullyIgnored $Project) { return }

    $gitignore = Join-Path $Project '.gitignore'
    $lines = Get-Content $fragment

    if ((Test-Path $gitignore) -and (Select-String -Path $gitignore -Pattern ([regex]::Escape($script:HostdimeGitignoreMarker)) -Quiet)) {
        $existing = Get-Content $gitignore
        foreach ($line in $lines) {
            if (-not $line) { continue }
            if ($existing -notcontains $line) {
                Add-Content -Path $gitignore -Value $line
            }
        }
        return
    }

    $block = @('', $script:HostdimeGitignoreMarker) + $lines
    Add-Content -Path $gitignore -Value ($block -join "`n")
}
