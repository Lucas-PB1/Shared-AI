# Avaliar código (`/avaliar`)

Avalie **objetivamente** o arquivo indicado no **repositório** (caminho informado, arquivo aberto ou no diff).

Funciona em **qualquer projeto** — o command é symlink universal (como as rules).

## Entrada

| Campo | Origem |
| --- | --- |
| Arquivo | Mensagem do usuário, caminho no repo, ou arquivo aberto no editor |
| Linguagem / framework | Informado pelo usuário; se omitido, inferir pelo código |
| Contexto extra | Opcional (ex.: "é um controller Laravel") |

## Fluxo de pastas

| Pasta | Papel |
| --- | --- |
| `.cursor/review/reports/` | Rascunho do `/avaliar` — **removido** no `/finalizar` |
| `.cursor/review/resultados/` | Pacote final (relatório + snapshot do código) |
| `.cursor/review/context.yaml` | Exclusões e pending (gitignored) |
| `.cursor/review/convencoes.md` | Padrão local promovido (gitignored) |

O **arquivo avaliado no repo não é alterado nem deletado** — só copiado para `resultados/` no `/finalizar`.

## Memória do projeto (só v2)

Exigir `.cursor/review/.memoria-version` = `2`. Se ausente: sugerir `npm run memoria -- migrar --write` e **não** ler `memoria.md` (legado removido).

1. Se existir `context.yaml`, aplicar `exclusions` (não sugerir o que foi `rejeitado` / `nao-aplicavel` no escopo) e priorizar `pending` com `revisit: next-touch`.
2. Se existir `convencoes.md`, alinhar sugestões e geração aos bullets cujo escopo casa com o arquivo (`## Escopo:`).
3. **Não** ler `decisions.jsonl` (staging bruto).
4. **Não** criar nem atualizar arquivos de memória — isso é `/memoria` e `/finalizar`.

## Como avaliar

1. Rodar `~/.cursor/review-check.sh <arquivo>`. Incorporar achados **filtrados** — **não** colar o log inteiro.
2. Ler o arquivo completo.
3. Tier 2: `clean-code`, `solid`, `dry` + skill de stack.
4. **Não** alterar o arquivo — só diagnosticar. De/Para + GitLab (inglês) + português.
5. **Salvar** em `.cursor/review/reports/<YYYY-MM-DD>_<slug>.md`
   - `<slug>` = caminho relativo ao repo, sem extensão, `/` → `-` (ex.: `app-Http-Controllers-Foo`)
   - Sufixo `-2`, `-3` se colidir no mesmo dia.

**Não** incluir achados causados só pelo ambiente:

- PHPStan/ESLint/tsc por dependências ausentes (`vendor/`, `node_modules/`)
- "Class not found" quando o import é padrão do stack
- Config do projeto alvo ausente neste workspace

**Incluir** sintaxe, Semgrep, bugs visíveis na leitura.

## Ferramentas

| Camada | Escopo |
| --- | --- |
| Semgrep | PHP, JS/TS (e demais linguagens com rules auto) |
| PHP | `php -l` + PHPStan 6 |
| JS | `node --check` + ESLint 9 |
| TS | ESLint 9 + `tsc --strict` |

Setup: `npm run setup:code-review` no clone do hostdime-ia.

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
