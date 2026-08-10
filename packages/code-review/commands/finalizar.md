# Finalizar review (`/finalizar`)

Empacota o resultado quando o usuário **finalizou** o review (ex.: `/finalizar`, "review finalizado").

## Quando usar

- Após `/avaliar` e confirmação do usuário
- Exige relatório em `.cursor/review/reports/` para o arquivo

## O que fazer

1. Identificar o arquivo (contexto do chat, caminho informado, ou cabeçalho `## \`...\`` do relatório mais recente em `reports/`).
2. **Perguntar ao dev** o que vale da análise (se ainda não estiver claro no chat):
   - por achado: `aceito` | `rejeitado` | `adiado` | `nao-aplicavel`
   - motivo breve quando `rejeitado` ou `nao-aplicavel`
3. Persistir decisões (só v2 — ver abaixo).
4. Rodar `~/.cursor/review-finalizar.sh <caminho>`.
5. Informar pasta gerada em `.cursor/review/resultados/`.

### Memória v2 (obrigatório)

Exigir `.cursor/review/.memoria-version` = `2`. Se ausente: sugerir `npm run memoria -- init --write` antes de finalizar.

- **Append** em `.cursor/review/decisions.jsonl` (uma linha JSON por achado).
- **Não** atualizar `context.yaml` nem `convencoes.md`.
- **Não** compactar nem promover — o dev usa `/memoria compactar` e `/memoria promover`.
- Sugerir `/memoria status` se houver decisões não compactadas.
- **Store (obrigatório):** `SUPABASE_URL` + chave; dual-write no `/finalizar`  
  (`npm run review:dual-write -- --project <repo>`). Falha se store down.

## Limpeza (script)

| Origem do arquivo | O que remove |
| --- | --- |
| **Arquivo do repo** (fluxo normal) | Só o relatório em `reports/` |
| **Inbox** (fluxo via inbox) | Relatório + arquivo do inbox |

O **arquivo avaliado no projeto nunca é deletado** — apenas copiado para `resultados/codigo/`.

## Saída

```text
.cursor/review/resultados/<YYYY-MM-DD>_<slug>/
├── relatorio.md      ← cópia do que estava em reports/
├── codigo/           ← snapshot do arquivo avaliado
└── meta.txt
```

## Resposta ao usuário

Informar só: caminho do pacote em `resultados/`, veredito, o que foi persistido (`decisions.jsonl`), e que `reports/` foi limpo. Sem repetir o relatório.
