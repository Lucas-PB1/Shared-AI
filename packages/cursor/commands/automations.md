# Cursor Automations (`/automations`)

Monta ou adapta uma **Cursor Automation** a partir dos templates do Shared AI.

Escopo atual: **só sync/lembrete do shared-ai**. Não há templates de review de PR nem de triage de CI.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/automations` ou `/automations sync` | Abrir o draft de sync |
| “criar automation…” (sync shared-ai) | Usar skill Automate do Cursor + template |

## Templates (pacote)

Em `$SHARED_AI_ROOT/packages/cursor/templates/automations/`:

| Alias | Arquivo |
| --- | --- |
| `sync` | `nightly-sync.md` |

Índice: `templates/automations/README.md`.

## Protocolo

1. Ler o template.
2. Ajustar nome/agenda/canais com o usuário (não inventar IDs).
3. Mostrar tabela resumo (nome, gatilho, ferramentas, instruções, “terminar no editor”).
4. Se estiver no **Agents Window** com skill Automate disponível: seguir o fluxo oficial (aprovação → abrir editor).
5. Se não: entregar o brief em Markdown para colar no editor de Automations.

## Regras

- Só Automations do produto Cursor — **não** adiciona GitHub Actions / CI a este repo.
- Não reintroduzir fluxos de code-review / avaliar-PR.
- Não commitar secrets no prompt da Automation.
- Paths de arquivo no prompt só se a Automation rodar no mesmo repo e o arquivo estiver versionado.
