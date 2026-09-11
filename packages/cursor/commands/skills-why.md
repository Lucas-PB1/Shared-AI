# Debug do orquestrador (`/skills-why`)

Explique **quais skills** o orquestrador escolheria para o pedido atual — sem implementar código, salvo se o usuário pedir.

## Quando usar

- `/skills-why`, "por que essas skills?", debug de roteamento
- Calibrar `intent.mdc`, `stack.mdc` ou rules glob

## O que analisar

1. **Mensagem do usuário** — palavras-chave (intent)
2. **Manifestos** — `package.json`, `composer.json`, `tsconfig.json` na raiz ou workspaces
3. **Contexto** — arquivos abertos, editados ou no diff
4. **Tier** — tier 1 (`clean-code`) vs tier 2 (+ `dry`, `solid`, `no-magic-numbers`)
5. **Complemento** — `.cursor/SKILLS-ROUTING.md` do projeto, se existir

## Protocolo (igual ao orquestrador)

1. Coletar candidatas das 3 camadas + tier
2. Dedupe por nome
3. Cap **6–8** skills (`SKILL.md`)
4. Prioridade: específica > genérica (`next` > `react`, `typescript` > `javascript`)

Mapa: `~/.cursor/SKILLS-ROUTING.md` + `.cursor/SKILLS-ROUTING.md` do projeto.

## Formato da resposta

````markdown
## Resumo

<pedido em uma linha> → **N skills** no merge final

## Tier

| Tier | Skills |
| --- | --- |
| 1 | … |
| 2 | … |

## Camada — Intent

| Skill | Gatilho detectado |
| --- | --- |
| `react` | "componente" na mensagem |
| … | … |

## Camada — Stack

| Skill | Manifesto / sinal |
| --- | --- |
| `typescript` | `tsconfig.json` |
| … | … |

## Camada — Contexto (globs)

| Rule glob | Skills sugeridas |
| --- | --- |
| `react-ui.mdc` | `react`, `accessibility` |
| … | … |

## Merge final (≤8)

| # | Skill | Motivo principal |
| --- | --- | --- |
| 1 | `clean-code` | tier 1 |
| … | … | … |

## Excluídas do cap ou duplicatas

| Skill | Motivo |
| --- | --- |
| `javascript` | `typescript` já cobre o escopo |
| … | … |

## Observações

- Conflitos ou ambiguidades
- Skills do projeto em `.cursor/skills/` que sobrescreveriam o global
````

Não carregar todas as 31 skills — só listar as **relevantes** ao pedido e ao merge.

## Routing log

Ao final da resposta `/skills-why`, **também** append no log (calibração manual):

```bash
npx tsx packages/cursor/scripts/lib/routing/append-routing-log.ts append --source=skills-why --skills=<merge final csv> --ask="<pedido em uma linha>" --project="<cwd>" --excluded=<excluídas csv opcional>
```

Arquivo: `~/.cursor/shared-ai/routing-log.jsonl`. Em tarefas de código normais o log é automático (orquestrador + hook stop) — `/skills-why` é só debug.
