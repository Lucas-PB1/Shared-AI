# Async e Promises

## async/await

- Preferir await sequencial claro; `Promise.all` para paralelo independente
- try/catch em fronteiras async; finally para cleanup

## Erros

- Rejeições sempre tratadas
- Evitar mix callback + Promise no mesmo fluxo

## Padrões

- AbortController para cancelar fetch
- Debounce/throttle em handlers frequentes
