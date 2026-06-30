# Funções

## Responsabilidade

- Uma função, um nível de abstração principal
- Extrair blocos que precisam de comentário de seção
- Preferir funções que cabem na tela sem scroll

## Parâmetros

- Poucos argumentos; agrupar em objeto de opções quando crescer
- Evitar flag booleana que muda comportamento radical — duas funções nomeadas
- Dependências explícitas, não globals ocultos

## Pureza e efeitos

- Preferir funções puras para regras de negócio
- I/O, DOM e estado global isolados e nomeados

## Retorno

- Early return para entradas inválidas
- Evitar `null` ambíguo quando union ou Result for mais claro

## Testes

- Lógica pura extraída é fácil de testar unitariamente
