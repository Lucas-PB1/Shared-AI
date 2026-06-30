---
name: review-inbox
description: >-
  Avalia arquivo com /avaliar em qualquer projeto. Inbox em .cursor/review/inbox/.
  Use para snippet solto ou arquivo do repo indicado pelo usuário.
---

# Review — `/avaliar` e `/finalizar`

Commands universais (symlink em `.cursor/commands/`, como as rules).

## Pastas no projeto

| Pasta / arquivo | Uso |
| --- | --- |
| `.cursor/review/inbox/` | Snippets para avaliar |
| `.cursor/review/reports/` | Relatórios do `/avaliar` |
| `.cursor/review/resultados/` | Pacote após `/finalizar` |
| `.cursor/review/memoria.md` | Convenções do time + histórico de decisões (gitignored) |

Criadas automaticamente pelo `link-project.sh` (hook sessionStart ou `npm run bootstrap`).

## Fluxo

1. Arquivo em `.cursor/review/inbox/` (ou caminho informado)
2. `/avaliar` lê `memoria.md` (convenções) se existir
3. `~/.cursor/review-check.sh <arquivo>` antes do relatório
4. `/avaliar` → salvar em `.cursor/review/reports/`
5. `/finalizar` → decisões do dev em `memoria.md` → `~/.cursor/review-finalizar.sh`

## Regras

- Não alterar o arquivo salvo pedido explícito
- Tier 2 + skill de stack
- Detalhes do formato: `.cursor/commands/avaliar.md`
