---
name: shell-scripting
description: >-
  Orienta Bash robusto: modo estrito, quoting, funções, traps e portabilidade. Use ao escrever ou revisar scripts .sh de automação, tooling ou glue de deploy, ou quando o usuário pedir script shell confiável.
---

# Shell scripting

## Quando usar

- Escrever ou revisar scripts de automação/tooling em Bash
- Glue de build, deploy, setup ou tarefas de CI
- Endurecer um script frágil que falha silenciosamente

## Princípios

- Modo estrito por padrão: `set -euo pipefail`
- Sempre quotar variáveis: `"$var"`, `"$@"` — evita word splitting e globbing
- Funções pequenas com responsabilidade única; `main` no fim
- Falhar alto e cedo, com mensagem clara em `stderr` e código de saída útil

## Referências

| Tópico | Arquivo |
| --- | --- |
| Bash robusto | [references/robust-bash.md](references/robust-bash.md) |
| Erros e traps | [references/error-handling-and-traps.md](references/error-handling-and-traps.md) |
| Portabilidade | [references/portability.md](references/portability.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com `bash -n`, `shellcheck` e um dry-run seguro
4. Documentar exceções apenas quando o trade-off não for óbvio no script

## Anti-padrões comuns

- Variável sem aspas quebrando com espaços/globs
- `rm -rf $DIR` sem checar se `$DIR` está vazio (perigo real)
- Ignorar código de saída de comandos em pipe (sem `pipefail`)
- Parsear saída de `ls`; usar glob/`find` corretamente

## Relacionado

- `ci-cd` para scripts usados em pipeline
- `linux-server` para cron, systemd e tarefas de servidor
- `git` para hooks e automação de repositório
