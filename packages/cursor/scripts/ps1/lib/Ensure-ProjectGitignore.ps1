# Garante .gitignore do projeto limpo (hostdime-ia).
# Memória no store Supabase — sem entradas .cursor/review.

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

function Test-ReviewGitignoreLine {
    param([string]$Line)
    $bare = $Line.TrimStart()
    if ($bare.StartsWith('!')) { $bare = $bare.Substring(1) }
    return ($bare -eq '.cursor/review' -or $bare -like '.cursor/review/*')
}

function Scrub-ProjectGitignoreHostdime {
    param([Parameter(Mandatory)][string]$Project)

    $script:LinkGitignoreScrubbed = 0
    $gitignore = Join-Path $Project '.gitignore'
    if (-not (Test-Path $gitignore)) { return }

    $kept = [System.Collections.Generic.List[string]]::new()
    $scrubbed = 0
    foreach ($line in (Get-Content $gitignore)) {
        if (Test-ReviewGitignoreLine $line) {
            $scrubbed++
            continue
        }
        if ($script:HostdimeGitignoreOrphans -contains $line) {
            $scrubbed++
            continue
        }
        $kept.Add($line)
    }
    Set-Content -Path $gitignore -Value $kept
    $script:LinkGitignoreScrubbed = $scrubbed
}

function Remove-ProjectReviewDir {
    param([Parameter(Mandatory)][string]$Project)
    $rev = Join-Path $Project '.cursor/review'
    if (Test-Path -LiteralPath $rev) {
        Remove-Item -LiteralPath $rev -Recurse -Force
        return $true
    }
    return $false
}

function Ensure-ProjectGitignore {
    param([Parameter(Mandatory)][string]$Project)
    Scrub-ProjectGitignoreHostdime $Project
}
