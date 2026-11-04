# Vitest

## Setup

- `jsdom` ou happy-dom para componentes
- `setupFiles` para matchers (@testing-library/jest-dom)

## Estrutura

- `describe`/`it` por comportamento
- `vi.mock` para módulos pesados; preferir injeção quando possível

## Async

- `await waitFor`, `findBy*` para updates async
