# Rollback

## Princípio

- Todo deploy precisa de um caminho de volta rápido e testado
- Reverter deve ser tão fácil quanto avançar
- Decidir cedo: reverter primeiro, investigar depois (reduz impacto)

## Artefato imutável

- Versão anterior disponível como imagem/artefato com tag/sha
- Rollback = reimplantar o artefato anterior, não rebuildar
- Nunca sobrescrever `latest`; versionar para poder voltar

## Banco de dados

- Migração compatível (expand/contract) permite reverter o código sem reverter schema
- Migração destrutiva torna rollback difícil — evitar acoplar drop ao deploy
- Ter plano para dados escritos pela versão nova

## Gatilho

- Automático: canary/health/métrica estourou limite → reverte sozinho
- Manual: botão/comando claro e documentado no runbook

## Feature flag

- Desligar feature via flag é rollback instantâneo sem redeploy
- Separar "deploy do código" de "ativação da feature"

## Testar o rollback

- Ensaiar reversão em staging; runbook validado
- Rollback não testado costuma falhar no pior momento

## Evitar

- Depender de rebuild para voltar (lento e não determinístico)
- Migração irreversível junto do deploy
- Runbook inexistente ou desatualizado
