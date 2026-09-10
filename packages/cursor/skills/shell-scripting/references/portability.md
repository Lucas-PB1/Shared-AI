# Portabilidade

Shared AI cobre **Linux** (Bash) e **Windows** (PowerShell). Não orientar scripts para macOS/BSD.

## Bash em Linux

- Preferir Bash: `#!/usr/bin/env bash` (arrays, `[[ ]]`, `local`)
- Assumir GNU coreutils no Linux alvo (`sed -i`, `date -Iseconds`, `readlink -f`)
- Não misturar com power-shellisms no mesmo script

## Windows

- Orquestração nativa em `packages/cursor/scripts/ps1/`
- Não exigir WSL/Git Bash para install/sync/bootstrap
- Paths e hooks no lado Windows usam convenções PowerShell

## Localização e ambiente

- `LC_ALL=C` para ordenação/parse determinístico independente de locale
- Não depender de `PATH` implícito para binários críticos
- Não assumir cwd; resolver caminhos a partir do diretório do script

## Ferramentas externas

- Checar existência antes de usar (`command -v jq`)
- Preferir builtins do shell quando resolvem (menos dependência)

## Qualidade

- `shellcheck` no CI (scripts `*.sh` Linux)
- `bash -n script.sh` valida sintaxe sem executar

## Evitar

- Fallbacks LaunchAgent / Darwin / BSD
- Assumir `sh` é Bash; se o shebang for `bash`, use `bash` no CI e local
