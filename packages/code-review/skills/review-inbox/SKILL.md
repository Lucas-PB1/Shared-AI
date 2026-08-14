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
| `/avaliar` | Deep dive em um arquivo → relatório **no chat** |
| `/avaliar-diff` | Triagem do diff → fila |
| `/finalizar` | Confirma vereditos + texto para comentar (**sem** gravar no banco) |
| `/memoria` | Compactar workdir tmp (preferir store pull; promote store = CI) |

## Memória e artefatos

| Onde | Uso |
| --- | --- |
| **Supabase** | Fonte de verdade — escrita no **ingest CI** pós-merge |
| `findings` / `decisions` | Ledger após merge |
| `exclusions` | Política negativa |
| `conventions` | Política positiva (promoção LLM no ingest) |
| Chat local | Resultado do `/avaliar` / `/finalizar` para quem comenta |
| Workdir tmp | Rascunhos CI apenas |

**Local nunca escreve no banco.** Só retorna o resultado no chat. Aprendizado (exclusions/conventions) entra via `avaliar-pr-memoria`.

## Fluxo

1. `/avaliar` → `review-check.sh` + relatório no chat (CI LLM também lê memória do store)
2. `/finalizar` → vereditos + texto pronto para PR (**sem** dual-write)
3. Merge → ingest CI → store (decisions + exclusions + promote conventions)

Secrets store: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` no monorepo (CI / pull de memória). `CURSOR_API_KEY` no CI LLM + promote.

## Regras

- Não alterar o arquivo do repo salvo pedido explícito
- Não colar logs inteiros de linter no relatório
- Não rodar `review:dual-write` a partir de `/finalizar` local
