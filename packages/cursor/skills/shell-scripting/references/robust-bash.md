# Bash robusto

## Cabeçalho padrão

- `#!/usr/bin/env bash` (portável entre distros)
- `set -euo pipefail`
  - `-e` aborta em erro; `-u` erro em variável não definida; `-o pipefail` propaga falha no pipe
- `IFS=$'\n\t'` quando o split default por espaço atrapalha

## Quoting

- Sempre `"$var"`, `"${arr[@]}"`, `"$@"`
- `"$@"` (com aspas) preserva argumentos com espaço; `$*` junta tudo — quase sempre quer `"$@"`
- Comparação: `[[ ... ]]` (Bash) é mais seguro que `[ ... ]`

## Variáveis

- `local` dentro de funções para não vazar escopo
- `readonly`/`declare -r` para constantes
- Default seguro: `"${VAR:-valor}"`; obrigatória: `"${VAR:?mensagem}"`

## Funções

- Pequenas, com nome verbo-substantivo (`build_image`, `require_cmd`)
- `main "$@"` chamada no fim; lógica em funções, não solta no topo
- Retornar via código de saída; imprimir resultado em `stdout`, log em `stderr`

## Comandos e substituição

- `$(...)` em vez de crases
- Checar existência de dependência: `command -v docker >/dev/null || die "docker ausente"`

## Evitar

- Parsear `ls`; usar glob ou `find -print0` + `read -d ''`
- `eval` com input externo
- Caminhos relativos frágeis; resolver diretório do script com `cd "$(dirname "$0")"`
