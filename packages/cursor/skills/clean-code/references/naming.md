# Nomes

## Intenção

- Nomes descrevem o que representam, não detalhes de implementação
- Evitar abreviações obscuras; usar vocabulário do domínio
- Booleanos: prefixos `is`, `has`, `can`, `should`

## Escopo

- Variáveis curtas só em loops triviais
- Funções: verbo + objeto (`validateEmail`, `loadConfig`)
- Tipos e classes: substantivos (`Invoice`, `SessionStore`)

## Consistência

- Um conceito, um termo em todo o projeto
- Evitar sinônimos alternados sem motivo de domínio

## Constantes

- `SCREAMING_SNAKE` para valores imutáveis globais
- Unions ou enums para conjuntos fechados

## Anti-padrões

- `data`, `info`, `temp`, `handle`
- Comentários que repetem o nome da função
- Números ou strings sem nome semântico
