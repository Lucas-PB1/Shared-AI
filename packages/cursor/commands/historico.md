# Histórico de escopo (`/historico`)

Registra um **escopo** (pasta ou arquivo) e um **arquivo de histórico versionado**. Quando o **Agent** edita arquivos no escopo, uma entrada com timestamp, o quê, refs e por quê deve ser appendada no histórico — enforcement via **rule glob** + **hook `stop`**.

Ler skill **`history-watch`** antes de setup ou append.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/historico setup` ou `/historico` (primeira vez) | Setup interativo |
| `/historico status` | Lista watches em `.cursor/history/watches.json` |
| `/historico off <id>` | Desabilita watch e remove rule/hook associados |
| `/historico` (watch já existe) | Mostra status |

## Setup interativo

1. **Escopo** — pasta ou arquivo (ex.: `src/domain/`, `docs/okf/apis/`).
2. **Formato** — perguntar:
   - **OKF `log.md`** — skill `okf`; entradas com `* **Update** (HH:MM UTC):`
   - **MD comum** — seções `## ISO8601` com bullets O quê / Refs / Por quê
3. **Nome do arquivo** — sugerir:
   - OKF → `log.md` no escopo ou `<escopo>/log.md`
   - MD → `history.md` ou `memory.md` (usuário pode customizar)
4. **Versionado** — default **sim** (git); **não** adicionar ao `project-gitignore.fragment`.
5. **Gerar artefatos** (passos abaixo).
6. Resumo: escopo, path do histórico, id do watch, hook ativo.

### Id do watch

Slug kebab-case a partir do escopo (ex.: `src/domain/` → `domain-layer`). Deve bater com `^[a-z0-9][a-z0-9-]*$`.

---

## Artefatos gerados no projeto

```
projeto/
├── .cursor/
│   ├── history/
│   │   └── watches.json
│   ├── rules/
│   │   └── history-watch-<id>.mdc
│   ├── hooks/
│   │   ├── historico-stop.sh      # Unix (copiar do pacote)
│   │   ├── historico-stop.ps1       # Windows (copiar do pacote)
│   │   ├── history-watch-match.py # helper (copiar do pacote)
│   │   └── hooks.json             # merge hook stop (projeto)
│   └── commands/
│       └── historico.md             # symlink via link-project
└── <historyFile>                    # ex. docs/domain/log.md
```

Templates do pacote hostdime-ia (`$HOSTDIME_IA_ROOT` ou clone):

| Artefato | Origem |
| --- | --- |
| Histórico OKF | `packages/cursor/templates/history-log.okf.md` |
| Histórico MD | `packages/cursor/templates/history-log.md` |
| Rule | `packages/cursor/templates/history-watch-rule.mdc` |
| Hook stop sh | `packages/cursor/scripts/hooks/historico-stop.sh` |
| Hook stop ps1 | `packages/cursor/scripts/hooks/historico-stop.ps1` |
| Matcher | `packages/cursor/scripts/lib/history-watch-match.py` |

### 1. `watches.json`

Criar `.cursor/history/watches.json` se não existir. Schema v1:

```json
{
  "version": 1,
  "watches": [
    {
      "id": "domain-layer",
      "scope": "src/domain/**",
      "scopeKind": "glob",
      "historyFile": "docs/domain/log.md",
      "format": "okf-log",
      "enabled": true,
      "ruleFile": ".cursor/rules/history-watch-domain-layer.mdc"
    }
  ]
}
```

- `scopeKind`: `glob` | `file` | `dir` (`dir` → tratar como `<dir>/**`)
- `format`: `okf-log` | `markdown`
- Vários watches permitidos; setup adiciona um por vez.

Validar: `npm run historico -- validate` ou `bash packages/cursor/scripts/historico-cli.sh validate`.

### 2. Arquivo de histórico

Copiar template conforme `format`. Se já existir, não sobrescrever.

### 3. Rule `history-watch-<id>.mdc`

A partir de `packages/cursor/templates/history-watch-rule.mdc`, substituir:

| Placeholder | Valor |
| --- | --- |
| `{{WATCH_ID}}` | id do watch |
| `{{SCOPE}}` | scope literal |
| `{{GLOB_PATTERN}}` | glob para `globs:` (file → path exato; dir → `<dir>/**`; glob → scope) |
| `{{HISTORY_FILE}}` | path relativo ao repo |
| `{{FORMAT}}` | `okf-log` ou `markdown` |
| `{{FORMAT_INSTRUCTIONS}}` | ver skill `history-watch` |

`alwaysApply: false`. Se `format=okf-log`, composição com rule `skills-orchestrator-okf.mdc`.

### 4. Hooks (projeto)

1. Copiar para `.cursor/hooks/`:
   - `historico-stop.sh` + `chmod +x`
   - `historico-stop.ps1`
   - `history-watch-match.py`
2. Merge idempotente em `.cursor/hooks.json`:

```bash
python3 "$HOSTDIME_IA_ROOT/packages/cursor/scripts/lib/merge-historico-hooks.py" \
  "$PROJECT/.cursor/hooks.json"
```

Ou `npm run historico -- merge-hooks` no root do projeto.

---

## Protocolo do Agent (escopo observado)

1. Ao **editar** arquivo no glob da rule, preparar entrada (o quê, refs, por quê).
2. **Não encerre o turno** após edits no escopo sem append no `historyFile`.
3. Entradas **recentes primeiro** (topo do arquivo, após cabeçalho).
4. Se o hook `stop` enviar `followup_message`, executar append imediatamente.

### Formato OKF (`okf-log`)

```markdown
## 2026-07-02
* **Update** (14:30 UTC): Refatorado `OrderAggregate` — refs: [order.ts](src/domain/order.ts) — motivo: alinhar invariantes com pagamento
```

### Formato MD (`markdown`)

```markdown
## 2026-07-02T14:30:00Z

- **O quê:** Refatorado `OrderAggregate`
- **Refs:** `src/domain/order.ts`, `src/domain/payment.ts`
- **Por quê:** alinhar invariantes com fluxo de pagamento
```

---

## `/historico status`

Rodar `npm run historico -- status` ou ler `.cursor/history/watches.json` e listar: id, escopo, historyFile, format, enabled.

---

## `/historico off <id>`

1. Em `watches.json`, setar `enabled: false` ou remover o watch.
2. Remover `.cursor/rules/history-watch-<id>.mdc`.
3. Se não restar watch enabled, rodar merge de hooks (remove entrada historico-stop se último watch).
4. Confirmar ao usuário.

---

## Limitações (fase 1)

- Só edições do **Agent** (não humano manual).
- Subagentes isolados podem não passar pelo `stop` do turno pai.
- Uma entrada consolidada por turno (hook `stop`, não `afterFileEdit`).

## CLI auxiliar

```bash
npm run historico -- status [projeto]
npm run historico -- validate [projeto]
npm run historico -- merge-hooks [projeto]
npm run historico -- scope-match <arquivo> [projeto]
```

## Resposta ao usuário

Após setup: escopo, `historyFile`, watch id, confirmação de rule + hook. Sem repetir templates inteiros.
