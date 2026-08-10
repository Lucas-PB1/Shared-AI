# Finalizar review (`/finalizar`)

Persiste decisões **no store Supabase** quando o usuário finaliza a análise.

## Quando usar

- Após `/avaliar` e confirmação do usuário

## O que fazer

1. Identificar o arquivo (chat, caminho, ou cabeçalho `## \`...\`` se houver rascunho).
2. Perguntar vereditos por achado: `aceito` | `rejeitado` | `nao-aplicavel` (+ motivo se rejeitado).
3. Gravar decisões (JSONL / JSON) no workdir de review (tmp) e dual-write:

   ```bash
   export HOSTDIME_REVIEW_WORKDIR="${HOSTDIME_REVIEW_WORKDIR:-$TMPDIR/hostdime-review-demo}"
   mkdir -p "$HOSTDIME_REVIEW_WORKDIR"
   # append em $HOSTDIME_REVIEW_WORKDIR/decisions.jsonl
   npm run review:dual-write -- --project <repo>
   ```

   Ou: `~/.cursor/review-finalizar.sh <caminho>` (empacota rascunho se houver + dual-write).

4. Resposta curta: vereditos no store.

## Obrigatório

- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` + `REVIEW_PROJECT_SLUG`
- Falha se store down

## Saída

Informar: vereditos gravados no store, `run_id` se retornado. Sem pasta de `resultados/` no repo.
