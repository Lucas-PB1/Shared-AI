# Finalizar review (`/finalizar`)

Fecha o ciclo **local** do `/avaliar`: confirma vereditos e **devolve o resultado no chat** para quem vai comentar no PR.

**Não grava no banco.** Persistência no store (decisions / exclusions / conventions) é só no **ingest CI** pós-merge (`avaliar-pr-memoria`).

## Quando usar

- Após `/avaliar` e confirmação do usuário sobre cada achado

## O que fazer

1. Identificar o arquivo (chat, caminho, ou cabeçalho `## \`...\`` se houver rascunho).
2. Confirmar vereditos por achado: `aceito` | `rejeitado` | `nao-aplicavel` (+ motivo se rejeitado).
3. **Não** rodar `review:dual-write` nem escrever no Supabase.
4. Responder no chat com um resumo acionável para comentar no PR:

### Formato da resposta

- Lista curta: `arquivo:L — título` + veredito + 1 frase (PT)
- Para achados **aceitos** que ainda valem como comentário: bloco pronto para colar no PR (título + **Em português:**; sem De/Para no inline)
- Se houver rejeitados: dizer que o ingest CI registrará exclusion depois do merge (não precisa dual-write local)

## O que NÃO fazer no local

| Ação | Onde acontece |
| --- | --- |
| `decisions` / `exclusions` / `conventions` no Supabase | Ingest CI pós-merge |
| `npm run review:dual-write` | Só CI / ops explícito — **não** no `/finalizar` |
| Promoção LLM de convention → store | Ingest CI (`promoteConventions: true`) |

## Saída

Só chat: vereditos + texto pronto para quem comenta. Sem `run_id`, sem pasta `resultados/` no repo.
