# Avaliar código (`/avaliar`)

Avalie **objetivamente** o arquivo indicado no **repositório**.

## Entrada

| Campo | Origem |
| --- | --- |
| Arquivo | Mensagem, caminho no repo, ou arquivo aberto |
| Linguagem / framework | Informado ou inferido |
| Contexto extra | Opcional |

## Memória

**Só store Supabase** (obrigatório: `SUPABASE_URL` + chave + slug).

- Exclusions / conventions vêm do store no LLM (`storeMemoryForFile`).
- **Não** versionar yaml/md de memória no git do projeto.

## Como avaliar

1. Rodar `~/.cursor/review-check.sh <arquivo>`. Incorporar achados filtrados.
2. Ler o arquivo completo.
3. Skills de stack + tier 2 (`clean-code`, `solid`, `dry`).
4. **Não** alterar o arquivo — De/Para + GitLab (en) + PT-BR.
5. Entregar relatório **no chat** (formato abaixo). Persistência de decisões é `/finalizar` → store.

**Não** incluir falhas só de ambiente (`vendor`/`node_modules` ausentes).

## Classificação

| Tipo | O que entra |
| --- | --- |
| **Impeditivo** | Segurança crítica, crash, dado corrompido |
| **Erro de código** | Bug técnico, API/sintaxe errada |
| **Erro de lógica** | Comportamento errado, edge case |
| **Melhoria essencial** | Vai gerar bug ou bloquear manutenção |

Máximo 3 itens por seção. Seção vazia → omitir.

## Formato do relatório

Responder **somente** neste formato:

````markdown
## `caminho/relativo/no/repo.php`

**Stack:** <linguagem / framework>
**Veredito:** OK | Ajustes necessários | Não recomendado

### Impeditivo

#### <arquivo:L> — <problema>

**De:**

```<lang>
<trecho atual>
```

**Para:**

```<lang>
<trecho sugerido>
```

**GitLab:**

> <1–3 frases em inglês — pronto para colar no MR>

**Em português:**

> <mesma ideia em PT-BR>

---

### Erros de código
...
````

| Veredito | Quando |
| --- | --- |
| **OK** | Zero achados ou só melhorias leves (≤1) |
| **Ajustes necessários** | Erros ou melhoria essencial relevante |
| **Não recomendado** | ≥1 impeditivo ou combinação grave |

Setup: `npm run setup:code-review`. Store: [docs/okf/review-store.md](../../docs/okf/review-store.md).
