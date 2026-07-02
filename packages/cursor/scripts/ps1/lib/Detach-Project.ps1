# Remove symlinks gerenciados pelo hostdime-ia no projeto (preserva arquivos reais).

function Remove-HostdimeFromProject {
    param([Parameter(Mandatory)][string]$Project)

    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path $root)) {
        Write-Error 'HOSTDIME_IA_ROOT não configurado'
        return
    }

    if (-not (Test-Path $Project)) {
        Write-Error "Erro: projeto não encontrado: $Project"
        return
    }

    $rulesDir = Join-Path $Project '.cursor/rules'
    $commandsDir = Join-Path $Project '.cursor/commands'
    $removed = 0

    Write-Host "→ removendo symlinks gerenciados em $Project"

    if (Test-Path $rulesDir) {
        foreach ($f in Get-ChildItem -Path (Join-Path $rulesDir 'skills-orchestrator-*.mdc') -ErrorAction SilentlyContinue) {
            if (Test-HostdimeSymlink $f.FullName) {
                $name = $f.Name
                Remove-Item -LiteralPath $f.FullName -Force
                Write-Host "  removido: .cursor/rules/$name"
                $removed++
            }
        }
    }

    if (Test-Path $commandsDir) {
        foreach ($cmd in @('avaliar.md', 'finalizar.md', 'avaliar-diff.md', 'skills-why.md', 'hubspot-mcp.md')) {
            $f = Join-Path $commandsDir $cmd
            if ((Test-Path $f) -and (Test-HostdimeSymlink $f)) {
                Remove-Item -LiteralPath $f -Force
                Write-Host "  removido: .cursor/commands/$cmd"
                $removed++
            }
        }
    }

    if ($removed -eq 0) {
        Write-Host '  (nenhum symlink gerenciado encontrado)'
    } else {
        Write-Host "  total: $removed symlink(s)"
    }

    Write-Host '  preservado: rules/commands reais, SKILLS-ROUTING.md, skills/, review/'
}
