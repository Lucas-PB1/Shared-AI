---
name: review-inbox
description: >-
  Avalia arquivo com /avaliar em qualquer projeto. Inbox em .cursor/review/inbox/.
  Use para snippet solto ou arquivo do repo indicado pelo usuário.
---

# Review — `/avaliar`, `/avaliar-diff` e `/finalizar`

Commands universais (symlink em `.cursor/commands/`, como as rules).

| Command | Uso |
| --- | --- |
| `/avaliar` | Deep dive em um arquivo (De/Para + GitLab) |
| `/avaliar-diff` | Triagem do diff do branch → fila para `/avaliar` |
| `/finalizar` | Empacota review + atualiza `memoria.md` |

## Pastas no projeto

| Pasta / arquivo | Uso |
| --- | --- |
| `.cursor/review/inbox/` | Snippets para avaliar |
| `.cursor/review/reports/` | Relatórios do `/avaliar` |
| `.cursor/review/resultados/` | Pacote após `/finalizar` |
| `.cursor/review/memoria.md` | Convenções do time + histórico de decisões (gitignored) |

Criadas automaticamente pelo `link-project.sh` (hook sessionStart ou `npm run bootstrap`).

## Fluxo

**Arquivo único**

1. Arquivo em `.cursor/review/inbox/` (ou caminho informado)
2. `/avaliar` lê `memoria.md` (convenções) se existir
3. `~/.cursor/review-check.sh <arquivo>` antes do relatório
4. `/avaliar` → salvar em `.cursor/review/reports/`
5. `/finalizar` → decisões do dev em `memoria.md` → `~/.cursor/review-finalizar.sh`

**Diff do branch**

1. `/avaliar-diff` → `~/.cursor/review-diff.sh [base]` + triagem por arquivo
2. Relatório em `.cursor/review/reports/diff-<data>.md` + fila deep dive
3. `/avaliar <arquivo>` para cada item da fila
4. `/finalizar` por arquivo quando aplicável

## Regras

- Não alterar o arquivo salvo pedido explícito
- Tier 2 + skill de stack
- Detalhes: `.cursor/commands/avaliar.md`, `avaliar-diff.md`
