# cron e agendamento

## crontab básico

- `crontab -e` (usuário) ou arquivos em `/etc/cron.d/` (sistema, com campo de usuário)
- Formato: `min hora dia mês diadasemana comando`
- Comentar a intenção de cada job

## Ambiente do cron

- Cron roda com `PATH` mínimo e sem seu ambiente interativo
- Usar caminhos absolutos para binários e scripts
- Definir env necessárias no topo do crontab ou dentro do script

## Log e erro

- Redirecionar saída: `>> /var/log/job.log 2>&1`
- Sem redirecionamento, cron manda e-mail local (facilmente perdido)
- Script deve sair com código != 0 em falha para ser detectável

## Robustez

- Idempotência: job pode rodar de novo sem estragar
- Lock para não sobrepor execuções longas: `flock -n /tmp/job.lock -c '...'`
- Timeout para não travar indefinidamente: `timeout 300 comando`

## systemd timer como alternativa

- Melhor observabilidade (journald), dependências e catch-up (`Persistent=true`)
- Preferir timer quando o servidor já é systemd e o job é importante

## Evitar

- Comando com caminho relativo (falha por PATH)
- Job sem log nem código de saída (falha invisível)
- Duas execuções sobrepostas em job longo (sem lock)
