---
name: review-inbox
description: >-
  Avalia arquivo com /avaliar em qualquer projeto. Caminho no repo ou diff.
  Use para review de código antes do merge.
---

# Review — `/avaliar`, `/avaliar-diff` e `/finalizar`

Commands universais em `~/.cursor/commands/` (global; setup/sync).

| Command | Uso |
| --- | --- |
| `/avaliar` | Deep dive em um arquivo do repo (De/Para + GitLab) |
| `/avaliar-diff` | Triagem do diff do branch → fila para `/avaliar` |
| `/finalizar` | Empacota em `resultados/` + persiste decisões |
| `/memoria` | Migra, compacta e promove memória v2 |

## Pastas no projeto

| Pasta / arquivo | Uso |
| --- | --- |
| `.cursor/review/reports/` | Rascunho do `/avaliar` — removido no `/finalizar` |
| `.cursor/review/resultados/` | Pacote final após `/finalizar` |
| `.cursor/review/decisions.jsonl` | staging de decisões (gitignored) |
| `.cursor/review/context.yaml` / `context.json` | exclusões e pending (gitignored) |
| `.cursor/review/convencoes.md` | padrão promovido para geração (gitignored) |

Pasta `review/` criada pelo `link-project.sh` (hook sessionStart ou `npm run bootstrap`). Commands hostdime **não** são espelhados no projeto. Memória **só v2** — sem `memoria.md` / legacy.

## Fluxo

**Arquivo do repo**

1. `/avaliar` no caminho do arquivo (ou arquivo aberto)
2. Lê `context.yaml` + `convencoes.md`
3. `~/.cursor/review-check.sh <arquivo>` antes do relatório
4. Salva em `.cursor/review/reports/<data>_<slug>.md`
5. `/finalizar` → decisões do dev → `~/.cursor/review-finalizar.sh`
6. `/memoria compactar` / `promover` quando o dev quiser contexto explícito
7. Relatório vai para `resultados/`; **arquivo do repo permanece intacto**

**Diff do branch**

1. `/avaliar-diff` → `~/.cursor/review-diff.sh [base]` + triagem por arquivo
2. Relatório em `.cursor/review/reports/diff-<data>.md` + fila deep dive
3. `/avaliar <arquivo>` para cada item da fila
4. `/finalizar` por arquivo quando aplicável

## Regras

- Não alterar o arquivo do repo salvo pedido explícito
- Tier 2 + skill de stack
- Detalhes: `~/.cursor/commands/avaliar.md`, `avaliar-diff.md`, `finalizar.md`
