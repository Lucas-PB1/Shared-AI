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
3. Monta resumo heurístico (`summary` + `detail`):
   - **Pedido:** última mensagem sua no chat do Cursor (transcripts)
   - **Área:** módulo/pasta dos arquivos alterados ou abertos recentemente
   - **Branch** de feature quando não há chat
   - Projetos só com `.gitignore`/sync aparecem por último como "Setup Cursor"
4. Grava `~/.cursor/hostdime-ia/sync-inbox.json`
5. Menu no terminal ou zenity: escolhe projeto → `cursor /path/do/projeto`

Exemplo:

```
1. hostdime
   → Pedido: tem alguma melhoria que vc me sugere?
   (Section-Trust-Indicators · 4 arquivos · SectionHeroGlobalNetworkMap)
```

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
- **Linux:** autostart `.desktop` + janela de progresso (scan) + **menu em cards** GTK (~12s após login)
- Fallback sem GTK: zenity com resumo em coluna única
- Se zenity ausente: notificação + log; rode `npm run sync-inbox -- run`

Independente do `boot-sync` (git pull só no clone hostdime-ia). Pode usar os dois.

## Resposta ao usuário

Listar projetos dirty com objetivo inferido; se `/sync-inbox on`, confirmar agendamento. Se vazio: "nenhum trabalho pendente nos projetos sync".
