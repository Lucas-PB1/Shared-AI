---
name: linux-server
description: >-
  Orienta administração de servidor Linux: serviços systemd, cron/timers, permissões, usuários e logs. Use ao configurar processos de longa duração, agendar tarefas, ajustar permissões ou investigar logs em um servidor.
---

# Linux server

## Quando usar

- Rodar uma app como serviço gerenciado (start no boot, restart em falha)
- Agendar tarefas recorrentes (backup, limpeza, sync)
- Ajustar permissões/usuários ou investigar logs de sistema

## Princípios

- Processo de longa duração é serviço (systemd), não `nohup &` solto
- Menor privilégio: usuário dedicado por serviço, sem root desnecessário
- Config e estado em lugares previsíveis; logs centralizados (journald)
- Automação idempotente e observável (falha visível, não silenciosa)

## Referências

| Tópico | Arquivo |
| --- | --- |
| systemd e serviços | [references/systemd-and-services.md](references/systemd-and-services.md) |
| cron e agendamento | [references/cron-and-scheduling.md](references/cron-and-scheduling.md) |
| Permissões e logs | [references/permissions-and-logs.md](references/permissions-and-logs.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com `systemctl status`, `journalctl` e um teste de restart/boot
4. Documentar exceções apenas quando o trade-off não for óbvio

## Anti-padrões comuns

- App rodando em `screen`/`nohup` sem supervisão nem restart
- Tudo como root; permissões `777` "para funcionar"
- Cron sem log nem tratamento de erro (falha invisível)
- Logs crescendo sem rotação até encher o disco

## Relacionado

- `shell-scripting` para os scripts executados por serviço/cron
- `nginx` para reverse proxy na frente da app
- `observability` para logs estruturados e métricas
- `deployment-strategies` para restart sem downtime
