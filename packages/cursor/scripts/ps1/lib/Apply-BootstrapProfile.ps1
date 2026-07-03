# Aplica perfil de bootstrap (SKILLS-ROUTING + rule do projeto).

function Apply-BootstrapProfile {
    param(
        [Parameter(Mandatory)][string]$Project,
        [Parameter(Mandatory)][string]$Profile
    )

    if (-not $Profile) { return }

    $root = $env:HOSTDIME_IA_ROOT
    if (-not $root -or -not (Test-Path $root)) {
        Write-Error 'HOSTDIME_IA_ROOT não configurado'
        return
    }

    if (-not (Test-ProfileName $Profile)) {
        Write-Error "Erro: perfil desconhecido: $Profile"
        Write-ProfilesUsage
        exit 1
    }

    $profileDir = Join-Path $root "packages/cursor/profiles/$Profile"

    Write-Host "→ perfil: $Profile"

    foreach ($item in Get-ChildItem -LiteralPath $profileDir -Force) {
        $base = $item.Name
        switch -Wildcard ($base) {
            'SKILLS-ROUTING.md' {
                $dest = Join-Path $Project '.cursor/SKILLS-ROUTING.md'
                New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
                if (Test-Path $dest) {
                    Write-Host '  preservado: .cursor/SKILLS-ROUTING.md (já existe)'
                } else {
                    Copy-Item $item.FullName $dest
                    Write-Host '  criado: .cursor/SKILLS-ROUTING.md'
                }
            }
            '*.mdc' {
                $dest = Join-Path $Project ".cursor/rules/$base"
                New-Item -ItemType Directory -Path (Split-Path $dest) -Force | Out-Null
                if (Test-Path $dest) {
                    Write-Host "  preservado: .cursor/rules/$base (já existe)"
                } else {
                    Copy-Item $item.FullName $dest
                    Write-Host "  criado: .cursor/rules/$base"
                }
            }
            'README.md' { }
            default {
                Write-Host "  ignorado: $base (tipo não gerenciado)"
            }
        }
    }
}
