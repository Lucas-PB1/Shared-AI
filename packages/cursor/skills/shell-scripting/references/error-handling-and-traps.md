# Erros e traps

## Falhar com clareza

- Função `die`: `die() { echo "erro: $*" >&2; exit 1; }`
- Mensagem de erro em `stderr`, não `stdout`
- Código de saída significativo (0 = ok; !=0 = falha específica)

## trap para limpeza

- `trap cleanup EXIT` garante limpeza mesmo em erro ou interrupção
- Remover temporários, arquivos de lock, containers de teste
- `tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT`

## Sinais

- `trap 'echo interrompido >&2; exit 130' INT TERM` para Ctrl-C limpo
- Cuidado com traps que engolem o erro original

## Erros em pipe e subshell

- `set -o pipefail` para o pipe falhar se qualquer estágio falhar
- `set -e` não pega tudo (ex.: comando em `if`, `||`, subshell) — verificar explicitamente onde importa

## Validação de pré-condição

- Checar args obrigatórios no início (`[[ $# -ge 1 ]] || die "uso: ..."`)
- Checar dependências (`command -v`) antes de começar o trabalho
- Validar caminho perigoso antes de `rm -rf`

## Idempotência

- Script de setup deve poder rodar de novo sem quebrar (checar antes de criar)
- `mkdir -p`, `ln -sf`, checagem de "já existe"

## Evitar

- `exit` sem código em caminho de erro
- Ignorar falha silenciosamente com `|| true` onde o erro importa
