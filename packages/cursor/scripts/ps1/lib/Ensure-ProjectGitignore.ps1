# Remove ignores órfãos de installs antigos (orquestrador/commands globais).

$script:SharedAiGitignoreOrphans = @(
    '.cursor/rules/skills-orchestrator-*.mdc'
    '.cursor/commands/skills-why.md'
    '.cursor/commands/cursor-cli.md'
    '.cursor/commands/historico.md'
    '.cursor/commands/sync-inbox.md'
    '.cursor/commands/onboard.md'
    '.cursor/commands/automations.md'
    '.cursor/commands/criar-skill.md'
    '.cursor/commands/criar-rule.md'
)

$script:LinkGitignoreScrubbed = 0

function Scrub-ProjectGitignoreSharedAi {
    param([Parameter(Mandatory)][string]$Project)

    $script:LinkGitignoreScrubbed = 0
    $gitignore = Join-Path $Project '.gitignore'
    if (-not (Test-Path $gitignore)) { return }

    $kept = [System.Collections.Generic.List[string]]::new()
    $scrubbed = 0
    foreach ($line in (Get-Content $gitignore)) {
        if ($script:SharedAiGitignoreOrphans -contains $line) {
            $scrubbed++
            continue
        }
        $kept.Add($line)
    }
    Set-Content -Path $gitignore -Value $kept
    $script:LinkGitignoreScrubbed = $scrubbed
}

function Ensure-ProjectGitignore {
    param([Parameter(Mandatory)][string]$Project)
    Scrub-ProjectGitignoreSharedAi $Project
}
