# Padrões de extração

## Aplicação

- Lógica repetida → função pura ou hook
- Validação → schema compartilhado
- Mapeamento → transformer único

## UI

- Markup repetido → componente
- Estilos → utilitário ou variante
- Labels → constants ou i18n

## Config

- Limites, URLs, enums → módulo de configuração
- Feature flags centralizadas

## Testes

- Factories compartilhadas; assertions permanecem explícitas

## Processo

- Rule of three antes de abstrair
- Nome reflete propósito de negócio
