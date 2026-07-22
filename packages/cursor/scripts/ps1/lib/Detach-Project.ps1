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

    Write-Host "→ removendo symlinks gerenciados em $Project"

    Remove-ProjectOrchestratorRuleSymlinks -RulesDir $rulesDir
    Remove-ProjectManagedCommandSymlinks -CommandsDir $commandsDir
    $removed = $script:LinkOrchestratorRemoved + $script:LinkCommandsRemoved

    if ($removed -eq 0) {
        Write-Host '  (nenhum symlink gerenciado encontrado)'
    } else {
        if ($script:LinkOrchestratorRemoved -gt 0) {
            Write-Host "  rules: $script:LinkOrchestratorRemoved"
        }
        if ($script:LinkCommandsRemoved -gt 0) {
            Write-Host "  commands: $script:LinkCommandsRemoved"
        }
        Write-Host "  total: $removed symlink(s)"
    }

    Write-Host '  preservado: rules/commands reais, SKILLS-ROUTING.md, skills/, review/'
}
