# Wrapper shared-ai para Cursor CLI — alinha projeto antes de rodar agent.
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$RawArgs = @()
)

$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$lib = Join-Path $scriptRoot 'lib/Cursor-Cli.ps1'
if (-not (Test-Path -LiteralPath $lib)) {
    $userLib = Join-Path $env:USERPROFILE '.cursor/shared-ai-cursor-cli.ps1'
    if (Test-Path -LiteralPath $userLib) { $lib = $userLib }
    else { throw 'Lib Cursor-Cli.ps1 não encontrada' }
}
. $lib

if ($RawArgs -contains '--help' -or $RawArgs -contains '-h') {
    @'
Uso: Agent.ps1 [--project=PATH] [--dry-run] [--] [args do agent...]
'@
    exit 0
}

$project = ''
$dryRun = $false
$agentArgs = [System.Collections.Generic.List[string]]::new()
$skipNext = $false

for ($i = 0; $i -lt $RawArgs.Count; $i++) {
    if ($skipNext) { $skipNext = $false; continue }
    $arg = $RawArgs[$i]
    switch -Regex ($arg) {
        '^--dry-run$' { $dryRun = $true; continue }
        '^--project=(.+)$' { $project = $Matches[1]; continue }
        '^--project$' {
            $project = $RawArgs[$i + 1]
            $skipNext = $true
            continue
        }
        '^--$' { continue }
        default { $agentArgs.Add($arg) }
    }
}

Invoke-CursorAgent -Project $project -DryRun:$dryRun -AgentArgs $agentArgs.ToArray()
