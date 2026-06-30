---
name: review-inbox
description: >-
  Avalia arquivo com /avaliar em qualquer projeto. Inbox em .cursor/review/inbox/.
  Use para snippet solto ou arquivo do repo indicado pelo usuário.
---

# Review — `/avaliar` e `/finalizar`

Commands universais (symlink em `.cursor/commands/`, como as rules).

## Pastas no projeto

| Pasta | Uso |
| --- | --- |
| `.cursor/review/inbox/` | Snippets para avaliar |
| `.cursor/review/reports/` | Relatórios do `/avaliar` |
| `.cursor/review/resultados/` | Pacote após `/finalizar` |

Criadas automaticamente pelo `link-project.sh` (hook sessionStart ou `npm run bootstrap`).

## Fluxo

1. Arquivo em `.cursor/review/inbox/` (ou caminho informado)
2. `~/.cursor/review-check.sh <arquivo>` antes do relatório
3. `/avaliar` → salvar em `.cursor/review/reports/`
4. `/finalizar` → `~/.cursor/review-finalizar.sh`

## Regras

- Não alterar o arquivo salvo pedido explícito
- Tier 2 + skill de stack
- Detalhes do formato: `.cursor/commands/avaliar.md`
