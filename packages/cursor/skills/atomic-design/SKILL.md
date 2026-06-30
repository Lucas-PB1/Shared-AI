---
name: atomic-design
description: >-
  Aplica Atomic Design: átomos, moléculas, organismos, templates e páginas como hierarquia de composição de interface. Use ao estruturar bibliotecas de UI, design systems ou consistência visual modular.
---

# Atomic Design

## Quando usar

- Design system ou biblioteca de componentes compartilhada
- Interfaces com repetição de padrões visuais e de interação
- Necessidade de documentar hierarquia de composição (Storybook, catálogo)

## Princípios

- Componentes menores combinam-se em estruturas maiores sem duplicar markup
- Separação entre estrutura (template) e conteúdo real (page)
- Átomos sem opinião de layout de página; páginas orquestram dados e estado de tela

## Referências

| Tópico | Arquivo |
| --- | --- |
| Níveis | [references/levels.md](references/levels.md) |
| Regras de composição | [references/composition-rules.md](references/composition-rules.md) |

## Como aplicar

1. Inventariar elementos indivisíveis (tipografia, botão, input) como átomos
2. Agrupar combinações recorrentes (campo + label + erro) em moléculas
3. Montar blocos de UI (header, card de produto) como organismos
4. Templates definem grid e slots; pages injetam conteúdo e dados

## Anti-padrões comuns

- Átomo que já inclui fetch de API ou regra de negócio
- Organismo duplicado porque moléculas não foram extraídas
- Página com markup bruto que deveria ser organismo reutilizável
- Níveis usados como pastas rígidas sem critério de reuso

## Relacionado

- `vertical-slice` — organismos/features dentro de fatia de produto
- `ux` — estados, feedback e hierarquia visual
- `accessibility` — contratos de átomo (foco, labels, contraste)
- `css` — tokens e utilitários alimentam átomos
- `dry` — extrair molécula quando padrão se repete
