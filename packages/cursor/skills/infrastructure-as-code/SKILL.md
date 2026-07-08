---
name: infrastructure-as-code
description: >-
  Orienta Infraestrutura como Código com Terraform: recursos declarativos, state, módulos e workflow plan/apply. Use ao provisionar infra versionada, revisar arquivos .tf ou quando o usuário mencionar Terraform, IaC ou state.
---

# Infrastructure as Code

## Quando usar

- Provisionar infra de forma versionada e reproduzível
- Revisar ou escrever configuração `.tf` (Terraform/OpenTofu)
- Padronizar ambientes (dev/staging/prod) a partir do mesmo código

## Princípios

- Infra declarativa: descrever o estado desejado, a ferramenta reconcilia
- Versionado no git; mudança passa por review como código
- `plan` antes de `apply`: revisar o diff antes de mudar o mundo real
- State é fonte da verdade — remoto, com lock e tratado como sensível

## Referências

| Tópico | Arquivo |
| --- | --- |
| Fundamentos do Terraform | [references/terraform-basics.md](references/terraform-basics.md) |
| State e módulos | [references/state-and-modules.md](references/state-and-modules.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com `fmt`, `validate` e `plan` revisado antes de `apply`
4. Documentar exceções apenas quando o trade-off não for óbvio

## Anti-padrões comuns

- `apply` sem revisar o `plan`
- State local commitado no git (ou com segredo em texto plano)
- Mudança manual no console divergindo do código (drift)
- Módulo gigante sem reuso; ou versões de provider sem pin

## Relacionado

- `ci-cd` para rodar plan/apply no pipeline com aprovação
- `env-secrets` para credenciais e variáveis sensíveis do provider
- `deployment-strategies` para mudanças de infra sem downtime
