# Sync inbox (`/sync-inbox`)

Inbox de **projetos do sync** com alterações git não commitadas. Resumo objetivo + opção de abrir no Cursor IDE ao iniciar a sessão.

## Quando usar

| Invocação | Ação |
| --- | --- |
| `/sync-inbox` ou `/sync-inbox run` | Scan agora + menu |
| `/sync-inbox on` | Liga ao iniciar o computador |
| `/sync-inbox off` | Desliga |
| `/sync-inbox status` | Estado + inbox |

## O que faz

1. Lê `~/.cursor/hostdime-ia/projects.json` (projetos do sync/bootstrap)
2. Em cada repo: `git status --porcelain` — só entra se **dirty**
3. Monta resumo heurístico:
   - branch, qtd de arquivos, último commit
   - última mensagem do usuário em `~/.cursor/projects/*/agent-transcripts/*.jsonl` (se existir)
4. Grava `~/.cursor/hostdime-ia/sync-inbox.json`
5. Menu no terminal: escolhe número → `cursor /path/do/projeto`

## CLI

```bash
npm run sync-inbox -- on
npm run sync-inbox -- run
npm run sync-inbox -- status
npm run sync-inbox -- off
npm run sync-inbox -- scan
```

## Boot

- Estado: `~/.cursor/hostdime-ia/sync-inbox.env`
- Log: `~/.cursor/hostdime-ia/sync-inbox.log`
- Requer terminal gráfico (`DISPLAY`) para menu — `.desktop` com `Terminal=true`

Independente do `boot-sync` (git pull). Pode usar os dois.

## Fase 2 (futuro)

- Resumo enriquecido com `agent -p` só nos dirty
- Notificação desktop (`notify-send`) + zenity
- Continuar sessão CLI (`agent resume`) além de abrir IDE

## Resposta ao usuário

Listar projetos dirty com objetivo inferido; se `/sync-inbox on`, confirmar agendamento. Se vazio: "nenhum trabalho pendente nos projetos sync".
