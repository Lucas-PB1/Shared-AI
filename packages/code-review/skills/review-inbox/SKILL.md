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
| `/finalizar` | Persist decisões + **memória evolutiva** no store |
| `/memoria` | Compactar workdir tmp (preferir store pull/push) |

## Memória e artefatos

| Onde | Uso |
| --- | --- |
| **Supabase** | Fonte de verdade |
| `findings` | Comentários emitidos |
| `decisions` | Ledger aceito/rejeitado |
| `exclusions` | Política negativa (rejeitado → nunca sugerir) |
| `conventions` | Política positiva (≥2× aceito no tema) |
| Workdir tmp | Rascunhos CI (`HOSTDIME_REVIEW_WORKDIR` / `$TMPDIR/hostdime-review/...`) |

**Memória evolutiva:** `/finalizar` dual-write grava decisions e promove exclusions/conventions; o próximo `/avaliar` injeta só exclusions + conventions no prompt.

## Fluxo

1. `/avaliar` → `review-check.sh` + relatório no chat (+ LLM no CI com memória do store)
2. `/finalizar` → dual-write + promote policy
3. GitHub: pull memory (store) → avaliar → **publish** store

Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` no monorepo; slug do repo via basename/`--slug`. `CURSOR_API_KEY` no CI LLM.

## Regras

- Não alterar o arquivo do repo salvo pedido explícito
- Não colar logs inteiros de linter no relatório
