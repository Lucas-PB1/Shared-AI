# Avaliar diff (`/avaliar-diff`)

**Triagem** do que mudou no branch — não substitui o `/avaliar` arquivo a arquivo.

Use para mapear o MR e priorizar; use `/avaliar <arquivo>` na fila para De/Para completo e texto GitLab por arquivo.

## Entrada

| Campo | Origem |
| --- | --- |
| Base do diff | Mensagem do usuário (`main`, `develop`, …) ou auto (`main` → `master` → `develop` → `HEAD~1`) |
| Contexto extra | Opcional |

## Memória do projeto

Se existir `.cursor/review/memoria.md`, ler **Convenções validadas pelo time** antes da triagem (mesmas regras do `/avaliar`).

## Como triar

1. Rodar `~/.cursor/review-diff.sh [base]` — lista arquivos revisáveis; usar a `base` impressa em stderr.
2. Se zero arquivos: informar e parar.
3. **Por arquivo** (um a um, sem pular):
   - `~/.cursor/review-check.sh <arquivo>` — incorporar achados filtrados
   - `git diff <base>...HEAD -- <arquivo>` — foco nos hunks alterados
   - Ler o arquivo inteiro quando necessário para contexto
   - Tier 2 + skill de stack
   - Veredito **por arquivo**: OK | Ajustes necessários | Não recomendado
4. **Não** gerar De/Para completo aqui — só bullets curtos. Exceção: impeditivo (1 linha + ação).
5. **Salvar** em `.cursor/review/reports/diff-<YYYY-MM-DD>.md` (sufixo `-2`, `-3` se colidir).
6. Montar **Fila `/avaliar`** com arquivos em Ajustes necessários ou Não recomendado.

## Ambiente

Mesmas exclusões do `/avaliar` (vendor, node_modules, class not found por deps ausentes).

## Formato do relatório

Responder **somente** neste formato:

````markdown
# Triagem diff — YYYY-MM-DD

**Base:** <ref git>
**Arquivos revisados:** N
**Veredito geral:** OK | Ajustes necessários | Não recomendado

| Arquivo | Veredito | Deep dive |
| --- | --- | --- |
| `caminho/arquivo.php` | OK | — |
| `outro.ts` | Ajustes necessários | sim |

## Fila `/avaliar`

1. `caminho/arquivo` — <motivo em uma linha>
2. ...

## Achados (triagem)

### `caminho/arquivo.php`

**Veredito:** OK | Ajustes necessários | Não recomendado

- <achado curto ou "Nenhum achado relevante na triagem">

### `outro.ts`
...

## GitLab (resumo do MR)

> <2–4 frases em inglês — visão geral do MR, pronto para colar>

**Em português:**

> <mesma ideia em PT-BR>
````

| Veredito geral | Quando |
| --- | --- |
| **OK** | Todos OK ou só melhorias leves |
| **Ajustes necessários** | ≥1 arquivo com ajustes, zero impeditivo |
| **Não recomendado** | ≥1 impeditivo ou ≥2 arquivos graves |

## Depois da triagem

Informar ao usuário a fila e sugerir `/avaliar <arquivo>` para cada item com deep dive. Não alterar código do projeto.
