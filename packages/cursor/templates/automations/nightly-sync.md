# Draft — Sync Shared AI (agendado)

| Campo | Valor |
| --- | --- |
| **Nome** | Shared AI sync reminder |
| **Descrição** | Lembra de atualizar o clone shared-ai e rodar sync |
| **Gatilho** | Agenda (ex.: semanal) ou manual |
| **Ferramentas** | Shell / git no ambiente da Automation (se disponível) |
| **Instruções** | Ver abaixo |
| **Terminar no editor** | Cron/timezone; se shell remoto não existir, só notificar no Slack/e-mail |

## Instruções

1. Se houver acesso ao clone: `git pull` no `SHARED_AI_ROOT` e `npm run sync` (ou instruir o usuário).
2. Reportar versão (`VERSION` / `SHARED_AI_VERSION`) e se o sync concluiu.
3. Se não houver shell no ambiente da Automation: postar lembrete com os comandos:

```bash
cd /caminho/shared-ai && git pull && npm run sync && npm run status
```

4. Não fazer `supabase:reset` nem alterar `.env`.
