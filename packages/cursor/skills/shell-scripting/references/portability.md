# Portabilidade

## Bash vs POSIX sh

- Se precisa de arrays, `[[ ]]`, `local` → é Bash: use `#!/usr/bin/env bash`
- Se precisa rodar em `sh`/dash puro → evitar bashismos e testar com `dash`
- Declarar a intenção no shebang; não assumir que `sh` é Bash

## Diferenças de plataforma

- GNU vs BSD (macOS): `sed -i`, `date`, `readlink -f` divergem
  - `readlink -f` não existe no macOS antigo; ter fallback
  - `sed -i` exige sufixo no BSD (`sed -i ''`)
- Preferir ferramentas e flags presentes nos dois quando o script é multiplataforma

## Localização e ambiente

- `LC_ALL=C` para ordenação/parse determinístico independente de locale
- Não depender de `PATH` implícito para binários críticos
- Não assumir cwd; resolver caminhos a partir do diretório do script

## Ferramentas externas

- Checar existência antes de usar (`command -v jq`)
- Preferir builtins do shell quando resolvem (menos dependência)

## Qualidade

- `shellcheck` no CI pega bashisms, quoting e erros comuns
- `bash -n script.sh` valida sintaxe sem executar

## Evitar

- Assumir GNU coreutils em ambiente que pode ser BSD/macOS
- Depender de versão específica de Bash sem checar (`${BASH_VERSINFO}`)
