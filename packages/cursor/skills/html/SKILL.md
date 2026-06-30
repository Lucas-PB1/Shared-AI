---
name: html
description: >-
  Orienta HTML semântico, formulários acessíveis e outline de documento. Use ao marcar up conteúdo, criar forms ou revisar estrutura de página, ou quando o usuário pedir semântica ou SEO técnico básico.
---

# HTML

## Quando usar

- Marcar conteúdo novo ou refatorar templates
- Formulários e validação nativa
- Revisar hierarquia de headings e landmarks

## Princípios

- Elementos pelo significado, não pela aparência
- Um `h1` principal por documento lógico
- Labels associados a controles

## Referências

| Tópico | Arquivo |
| --- | --- |
| Semântica | [references/semantics.md](references/semantics.md) |
| Formulários | [references/forms.md](references/forms.md) |
| Outline | [references/document-outline.md](references/document-outline.md) |

## Como aplicar

1. Ler o contexto do pedido e identificar qual referência cobre o caso
2. Aplicar o padrão mínimo que resolve o problema sem over-engineering
3. Validar com testes, lint ou revisão visual conforme o tipo de mudança
4. Documentar exceções apenas quando o trade-off não for óbvio no código

## Anti-padrões comuns

- Copiar snippet sem adaptar nomes e contratos ao módulo atual
- Misturar vários tópicos da skill `html` em uma única refatoração grande
- Ignorar acessibilidade, performance ou segurança quando o tópico exige

## Relacionado

- Combinar com outras skills da mesma categoria (metodologia, web, stack ou tooling)
- Em dúvida, preferir solução mais simples e iterar depois

