---
name: history-watch
description: >-
  Histórico versionado por escopo via /historico: watches.json, rule glob e hook
  stop. Use ao configurar watch, append em log.md OKF ou history.md, ou quando o
  hook stop pedir follow-up após edições no escopo.
---

# History watch

## Quando usar

- Setup ou manutenção do command `/historico`
- Append no arquivo de histórico após editar arquivos no escopo observado
- Formato de entradas OKF `log.md` vs Markdown comum
- Desabilitar watch (`/historico off`)

## Arquitetura

| Camada | Função |
| --- | --- |
| Command `historico.md` | Setup, status, off |
| `.cursor/history/watches.json` | Config central (schema v1) |
| Rule `history-watch-<id>.mdc` | Glob = escopo; protocolo ao editar |
| Hook `stop` | Follow-up se escopo alterado no turno |

Rule sozinha **não garante** append — o hook `stop` fecha o gap.

## Campos obrigatórios por entrada

1. **Timestamp** — ISO 8601 (data ou datetime)
2. **O quê** — resumo objetivo da mudança
3. **Refs** — paths ou links dos arquivos tocados
4. **Por quê** — motivo ou decisão

## Formato OKF (`okf-log`)

- Arquivo reservado `log.md` — **não** usar como concept OKF
- Seções `## YYYY-MM-DD` — **recentes primeiro**
- Linha: `* **Update** (HH:MM UTC): <o quê> — refs: [...] — motivo: <por quê>`
- Também: `Creation`, `Fix`, `Refactor` conforme natureza
- Compor com skill `okf` para bundles adjacentes

## Formato Markdown (`markdown`)

```markdown
## 2026-07-02T14:30:00Z

- **O quê:** ...
- **Refs:** `path/a`, `path/b`
- **Por quê:** ...
```

Recentes primeiro (nova seção no topo, após título/cabeçalho fixo).

## Protocolo do Agent

1. Editar escopo → preparar entrada mentalmente durante o turno
2. Antes de encerrar → append no `historyFile` do watch
3. Hook `stop` com `followup_message` → append **agora**, mensagem curta
4. Uma entrada por turno pode resumir várias edições + motivo único

## Anti-padrões

- Encerrar turno após `Write`/`StrReplace` no escopo sem histórico
- Entrada vaga (“ajustes”) sem refs ou por quê
- Sobrescrever histórico inteiro — sempre **append** no topo da seção do dia
- Colocar `history.md` no `.gitignore` (default: versionado)

## Relacionado

- Command `/historico`
- Skill `okf` — quando `format=okf-log`
- Analogia: memória v2 do code-review (`decisions.jsonl` + `context.yaml`)
