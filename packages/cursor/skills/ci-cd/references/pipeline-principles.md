# Princípios de pipeline

## Estágios

- Ordem típica: `lint → test → build → deploy`
- Falhar cedo: o mais barato e rápido primeiro (lint antes de build pesado)
- Cada estágio com responsabilidade única e critério de sucesso claro

## CI vs CD

- **CI** (integração): valida cada mudança — lint, test, build
- **CD** (entrega/deploy): publica artefato e/ou implanta em ambiente
- Continuous Delivery = pronto para deploy manual; Continuous Deployment = deploy automático

## Velocidade e determinismo

- Cache de dependências entre execuções (chave pelo lockfile)
- Jobs independentes em paralelo; matrix para múltiplas versões
- Build reproduzível: pin de versões (runner, actions, imagens, deploys)

## Gates de qualidade

- Merge só com pipeline verde (branch protection / merge request rules)
- Cobertura mínima, lint sem erro, testes obrigatórios
- Ambientes progressivos: `dev → staging → prod`, com aprovação onde faz sentido

## Gatilhos

- Push, pull/merge request, tag/release, agendado (cron), manual
- PR roda verificação; merge no principal dispara build/deploy

## Evitar

- Pipeline monolítico de um job só fazendo tudo em série
- Reinstalar toda a toolchain sem cache
- Deploy direto em produção sem estágio de teste/aprovação
