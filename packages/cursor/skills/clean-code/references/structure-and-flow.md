# Estrutura e fluxo

## Top-down

- Fluxo principal primeiro; detalhes em helpers abaixo ou em módulos vizinhos
- Ordem sugerida: constantes, tipos, API pública, helpers privados

## Aninhamento

- Limitar indentação lógica (~2–3 níveis)
- Guard clauses no início
- Extrair `if/else` longos para funções nomeadas

## Módulos

- Um arquivo, um tema coeso
- Evitar utilitários genéricos que acumulam funções não relacionadas

## Comentários

- Documentar invariantes e trade-offs de negócio
- TODO com referência; remover código morto comentado

## Formatação

- Seguir formatter do repositório
- Quebras que facilitam diff legível em review
