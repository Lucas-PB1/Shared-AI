# Blue-green e canary

## Blue-green

- Dois ambientes idênticos: **blue** (atual) e **green** (nova versão)
- Sobe e valida o green com produção "à parte"; troca o tráfego de uma vez
- Rollback = apontar o tráfego de volta ao blue (rápido)
- Custo: manter dois ambientes; cuidado com estado compartilhado (banco)

## Canary

- Liberar a nova versão para uma fração pequena do tráfego (ex.: 5%)
- Observar métricas (erro, latência) antes de aumentar gradualmente
- Promover para 100% se saudável; reverter ao primeiro sinal ruim
- Menor raio de impacto que big-bang

## Como rotear

- Balanceador/nginx/service mesh dividindo tráfego por peso
- Feature flag para ativar por porcentagem/segmento sem redeploy

## Critério de decisão

- Definir antes: quais métricas e limites promovem ou revertem
- Automatizar a decisão quando possível (análise de canary)

## Estado compartilhado

- Banco/cache compartilhado entre versões exige schema compatível
- Sessão/afinidade: cuidar para usuário não pular entre versões incompatíveis

## Evitar

- Canary sem métricas (só "parece ok")
- Blue-green ignorando migração de banco compartilhado
- Promover a 100% sem período de observação
