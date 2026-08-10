---
name: review-inbox
description: >-
  Avalia arquivo com /avaliar em qualquer projeto. Caminho no repo ou diff.
  Use para review de código antes do merge.
---

# Review — `/avaliar`, `/avaliar-diff` e `/finalizar`

Commands em `~/.cursor/commands/` (global).

| Command | Uso |
| --- | --- |
| `/avaliar` | Deep dive em um arquivo |
| `/avaliar-diff` | Triagem do diff → fila |
| `/finalizar` | Persist decisões no **store** |
| `/memoria` | Compactar workdir tmp (preferir store pull/push) |

## Memória e artefatos

| Onde | Uso |
| --- | --- |
| **Supabase** | Fonte de verdade (exclusions, conventions, decisions, runs) |
| Workdir tmp | Rascunhos CI opcionais (`HOSTDIME_REVIEW_WORKDIR` / `$TMPDIR/hostdime-review/...`) |

## Fluxo

1. `/avaliar` → `review-check.sh` + relatório no chat (+ LLM no CI)
2. `/finalizar` → dual-write no store
3. GitHub: pull memory (store) → avaliar → **publish** store

Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `REVIEW_PROJECT_SLUG`, `CURSOR_API_KEY`.

## Regras

- Não alterar o arquivo do repo salvo pedido explícito
- Não colar logs inteiros de linter no relatório
