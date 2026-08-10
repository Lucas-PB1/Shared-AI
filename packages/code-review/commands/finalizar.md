# Finalizar review (`/finalizar`)

Persiste decisões **no store Supabase** e promove memória evolutiva.

## Quando usar

- Após `/avaliar` e confirmação do usuário

## O que fazer

1. Identificar o arquivo (chat, caminho, ou cabeçalho `## \`...\`` se houver rascunho).
2. Perguntar vereditos por achado: `aceito` | `rejeitado` | `nao-aplicavel` (+ motivo se rejeitado).
3. Gravar decisões (JSONL) no workdir de review (tmp) e dual-write:

   ```bash
   export HOSTDIME_REVIEW_WORKDIR="${HOSTDIME_REVIEW_WORKDIR:-$TMPDIR/hostdime-review-demo}"
   mkdir -p "$HOSTDIME_REVIEW_WORKDIR"
   # append em $HOSTDIME_REVIEW_WORKDIR/decisions.jsonl
   npm run review:dual-write -- --project <repo>
   ```

   Ou: `~/.cursor/review-finalizar.sh <caminho>` (empacota rascunho se houver + dual-write).

4. Resposta curta: vereditos no store + contagens de policy.

## O que o dual-write grava

| Tabela | Quando |
| --- | --- |
| `review_runs` | cada finalize |
| `findings` | comentário materializado (summary/file/line) |
| `decisions` | ledger `aceito` \| `rejeitado` \| `nao-aplicavel` |
| `exclusions` | todo `rejeitado` / `nao-aplicavel` → “nunca sugerir de novo” |
| `conventions` | mesmo `finding_key` com **≥2** `aceito` no projeto |

Próximo `/avaliar` consome **só** `exclusions` + `conventions` filtradas por path.

## Obrigatório

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` no **monorepo** (`HOSTDIME_IA_ROOT/.env` ou CI)
- Slug do projeto no store = basename do repo revisado (`dna`, `hostdime`, …) ou `--slug`
- Projetos ligados (ex. DNA) **não** têm `.env` de store — secrets só no hostdime-ia
- Falha se store down ou se o slug não existir em `projects`

## Saída

Informar: `written`, `findings`, `exclusions`, `conventions`, `run_id`. Sem pasta de `resultados/` no repo.
