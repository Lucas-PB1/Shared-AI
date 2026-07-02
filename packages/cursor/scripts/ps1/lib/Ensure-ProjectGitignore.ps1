# Garante entradas no .gitignore do projeto para artefatos gerenciados pelo hostdime-ia.

$script:HostdimeGitignoreMarker = '# hostdime-ia: cursor gerenciado localmente (npm run bootstrap)'

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

function Ensure-ProjectGitignore {
    param([Parameter(Mandatory)][string]$Project)

    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path $root)) { return }

    $fragment = Join-Path $root 'packages/cursor/scripts/lib/project-gitignore.fragment'
    if (-not (Test-Path $fragment)) { return }

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
