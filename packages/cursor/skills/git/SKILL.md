---
name: git
description: >-
  Orienta Git: commits, mensagens, PRs e review. Use ao preparar commits, abrir pull requests ou conduzir code review, ou quando o usuário pedir histórico limpo ou fluxo de colaboração.
---

# Git

## Quando usar

- Commits atômicos
- Pull requests descritivos
- Code review construtivo

## Princípios

- Mensagem explica porquê
- Um assunto por commit quando possível
- PR pequeno revisa mais rápido

## Referências

| Tópico | Arquivo |
| --- | --- |
| Commits e mensagens | [references/commits-and-messages.md](references/commits-and-messages.md) |
| Pull requests | [references/pull-requests.md](references/pull-requests.md) |
| Review | [references/review-workflow.md](references/review-workflow.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `git` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

