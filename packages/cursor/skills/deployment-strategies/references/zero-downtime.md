# Zero-downtime

## Rolling deploy

- Substituir instâncias aos poucos, mantendo capacidade
- Nova instância só recebe tráfego quando readiness passa
- Só derrubar a antiga depois que a nova está saudável

## Drain de conexões

- Tirar instância do balanceador e esperar requisições em voo terminarem
- `graceful shutdown`: app trata SIGTERM, para de aceitar novas, finaliza as atuais
- Timeout de drain para não esperar indefinidamente

## Migração de banco compatível

- Mudança expand/contract: adicionar coluna → deploy que usa → remover depois
- Durante o rollout, versão antiga e nova coexistem: schema serve as duas
- Evitar rename/drop no mesmo deploy que introduz o uso novo

## Balanceador e reload

- nginx `reload` recarrega config sem derrubar conexões existentes
- Health check integrado decide quem recebe tráfego

## Idempotência e retry

- Cliente/serviço deve tolerar retry (operações idempotentes)
- Fila/worker deve reprocessar sem duplicar efeito

## Evitar

- Parar tudo, subir tudo (janela de downtime)
- Migração destrutiva junto com o deploy que a usa
- Matar instância sem drain (erros para quem estava conectado)
